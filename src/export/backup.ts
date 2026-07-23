import { db } from '../db';
import { uid } from '../lib/uid';
import { assetIdsOf } from '../store';
import type { ImageAsset, Issue } from '../types';
import { saveOrShareBlob } from './exportPng';

/**
 * 号データのJSONエクスポート/インポート(要件2.1-8、バックアップ・端末移行用)。
 * 画像はBase64(data URL)化して単一ファイルに含める(要件6章)。
 */

interface BackupFile {
  app: 'mag-studio';
  version: 1;
  exportedAt: string;
  issue: Issue;
  assets: { id: string; fileName: string; width: number; height: number; dataUrl: string }[];
}

export async function exportIssueJson(issue: Issue): Promise<void> {
  const assets: BackupFile['assets'] = [];
  for (const asset of await db.assets.bulkGet(assetIdsOf(issue))) {
    if (!asset) continue;
    assets.push({
      id: asset.id,
      fileName: asset.fileName,
      width: asset.width,
      height: asset.height,
      dataUrl: await blobToDataUrl(asset.blob),
    });
  }

  const backup: BackupFile = {
    app: 'mag-studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    issue,
    assets,
  };

  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  await saveOrShareBlob(blob, `vol${String(issue.vol).padStart(2, '0')}_backup.json`);
}

/**
 * バックアップJSONを読み込み、IDをすべて振り直した新しい号として保存できる形に展開する。
 * (同一端末への再インポートでもID衝突しない)
 */
export async function parseBackupJson(file: File): Promise<Issue> {
  const text = await file.text();
  let backup: BackupFile;
  try {
    backup = JSON.parse(text) as BackupFile;
  } catch {
    throw new Error('JSONとして読み込めませんでした');
  }
  if (backup.app !== 'mag-studio' || backup.version !== 1 || !backup.issue) {
    throw new Error('MAG STUDIOのバックアップファイルではありません');
  }

  // asset IDの振り直し
  const idMap = new Map<string, string>();
  const newAssets: ImageAsset[] = [];
  for (const a of backup.assets ?? []) {
    const newId = uid();
    idMap.set(a.id, newId);
    newAssets.push({
      id: newId,
      blob: dataUrlToBlob(a.dataUrl),
      fileName: a.fileName,
      width: a.width,
      height: a.height,
    });
  }
  await db.assets.bulkPut(newAssets);

  const now = new Date().toISOString();
  const issue: Issue = {
    ...backup.issue,
    id: uid(),
    updatedAt: now,
    pages: backup.issue.pages.map((p) => ({
      ...p,
      id: uid(),
      slots: Object.fromEntries(
        Object.entries(p.slots).map(([slotId, slot]) => [
          slotId,
          slot.type === 'image' ? { ...slot, assetId: idMap.get(slot.assetId) ?? slot.assetId } : slot,
        ]),
      ),
    })),
  };
  return issue;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

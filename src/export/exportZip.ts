import JSZip from 'jszip';
import { canvasToPngBlob, pageFileName, renderPageToCanvas, saveOrShareBlob } from './exportPng';
import type { Issue } from '../types';

/** テーマを英数スラッグ化。英数字が1文字もなければnull(例: vol03_wireless-earphones) */
export function slugifyTheme(theme: string): string | null {
  const slug = theme
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return slug || null;
}

export function zipFileName(issue: Issue): string {
  const vol = `vol${String(issue.vol).padStart(2, '0')}`;
  const slug = slugifyTheme(issue.theme);
  return slug ? `${vol}_${slug}.zip` : `${vol}.zip`;
}

/**
 * 号の全ページをPNG化してzipにまとめ、保存/共有する(要件4.4)。
 * resolveNodeはExportStage内の実寸レンダリング済みノードを返すこと。
 */
export async function exportIssueZip(
  issue: Issue,
  resolveNode: (pageId: string) => HTMLElement | null,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();
  const total = issue.pages.length;

  for (let i = 0; i < total; i++) {
    const page = issue.pages[i];
    const node = resolveNode(page.id);
    if (!node) throw new Error(`ページ${i + 1}のレンダリングが見つかりません`);
    const canvas = await renderPageToCanvas(node);
    zip.file(pageFileName(issue.vol, i + 1), await canvasToPngBlob(canvas));
    onProgress?.(i + 1, total);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  await saveOrShareBlob(blob, zipFileName(issue));
}

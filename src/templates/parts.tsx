import type { CSSProperties } from 'react';
import { APP_CONFIG } from '../config';
import { coverLayout } from '../lib/crop';
import type { AssetInfo, Page } from '../types';

/**
 * 画像スロットの共通描画。
 * data-image-slot属性を持つ枠は、プレビュー側(PreviewPane)がポインタ操作を委譲で拾い、
 * ドラッグ/ピンチでcropを更新する。テンプレート自体は純粋な表示コンポーネント。
 */
export function ImageSlot({
  slotId,
  page,
  assets,
  frame,
  interactive,
}: {
  slotId: string;
  page: Page;
  assets: Record<string, AssetInfo>;
  frame: { left: number; top: number; width: number; height: number };
  interactive: boolean;
}) {
  const slot = page.slots[slotId];
  const asset = slot?.type === 'image' ? assets[slot.assetId] : undefined;

  const frameStyle: CSSProperties = {
    position: 'absolute',
    left: frame.left,
    top: frame.top,
    width: frame.width,
    height: frame.height,
    overflow: 'hidden',
    background: APP_CONFIG.colors.photoPlaceholder,
    touchAction: 'none',
  };

  if (!asset || slot?.type !== 'image') {
    return (
      <div style={frameStyle}>
        {interactive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A8A296',
              fontSize: 30,
              letterSpacing: '0.1em',
            }}
          >
            写真未設定(フォームから取り込み)
          </div>
        )}
      </div>
    );
  }

  const layout = coverLayout(frame.width, frame.height, asset.width, asset.height, slot.crop);
  return (
    <div data-image-slot={slotId} style={{ ...frameStyle, cursor: interactive ? 'grab' : undefined }}>
      <img
        src={asset.url}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height,
          maxWidth: 'none',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/** テキストスロットの値を取り出す */
export function textOf(page: Page, slotId: string): string {
  const slot = page.slots[slotId];
  return slot?.type === 'text' ? slot.value : '';
}

/** listスロットの値(空行は除外) */
export function listOf(page: Page, slotId: string): string[] {
  const slot = page.slots[slotId];
  return slot?.type === 'list' ? slot.items.filter((s) => s.trim() !== '') : [];
}

/** kvスロットの値(キー・値とも空の組は除外) */
export function kvOf(page: Page, slotId: string): { key: string; value: string }[] {
  const slot = page.slots[slotId];
  return slot?.type === 'kv'
    ? slot.items.filter((i) => i.key.trim() !== '' || i.value.trim() !== '')
    : [];
}

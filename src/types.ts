// 要件定義書 6章のデータ構造

export type TemplateId = 'cover' | 'essay' | 'spec';

export interface Issue {
  id: string; // uuid
  vol: number;
  theme: string; // 特集テーマ
  publishedAt?: string; // 発行日(任意)
  createdAt: string;
  updatedAt: string;
  pages: Page[]; // 最大4
}

export interface Page {
  id: string;
  templateId: TemplateId;
  order: number; // 1〜4
  prBadge: boolean;
  slots: Record<string, SlotValue>;
}

export interface Crop {
  x: number; // スロット枠中心からの平行移動(1080pxキャンバス座標)
  y: number;
  scale: number; // cover基準の拡大率(1以上)
}

export type SlotValue =
  | { type: 'text'; value: string }
  | { type: 'image'; assetId: string; crop: Crop }
  | { type: 'list'; items: string[] }
  | { type: 'kv'; items: { key: string; value: string }[] };

export interface ImageAsset {
  id: string;
  blob: Blob; // 取り込み時に長辺2400pxへ縮小して保存
  fileName: string;
  width: number;
  height: number;
}

// メモリ上でテンプレート描画に渡す画像情報(objectURL + 寸法)
export interface AssetInfo {
  url: string;
  width: number;
  height: number;
}

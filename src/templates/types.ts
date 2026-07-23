import type { ComponentType } from 'react';
import type { AssetInfo, Issue, Page, TemplateId } from '../types';

export interface TextSlotDef {
  id: string;
  type: 'text';
  label: string;
  maxLen: number;
  multiline?: boolean;
  optional?: boolean;
  placeholder?: string;
}

export interface ImageSlotDef {
  id: string;
  type: 'image';
  label: string;
  /** 誌面上のスロット枠寸法(キャンバス座標)。crop操作のクランプ計算に使う */
  frame: { width: number; height: number };
}

export interface ListSlotDef {
  id: string;
  type: 'list';
  label: string;
  maxItems: number;
  maxLen: number;
  optional?: boolean;
}

export interface KvSlotDef {
  id: string;
  type: 'kv';
  label: string;
  maxItems: number;
  maxKeyLen: number;
  maxValueLen: number;
}

export type SlotDef = TextSlotDef | ImageSlotDef | ListSlotDef | KvSlotDef;

export interface TemplateRenderProps {
  issue: Issue;
  page: Page;
  assets: Record<string, AssetInfo>;
  /** 編集プレビューではtrue。書き出し用レンダリングではfalse(操作ヒント等を描画しない) */
  interactive: boolean;
}

export interface TemplateDef {
  id: TemplateId;
  name: string;
  description: string;
  /** スロット定義・文字数上限の一元管理(要件5.1) */
  slots: SlotDef[];
  /**
   * 固定要素(ロゴ・号数・ノンブル)の描画バリアント。
   * 'page'(既定): フッターに小ロゴ+号数+ページ番号 / 'cover': 上部に大ロゴ+号数、ノンブルなし
   */
  chrome?: 'page' | 'cover';
  Render: ComponentType<TemplateRenderProps>;
}

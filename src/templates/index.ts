import type { SlotValue, TemplateId } from '../types';
import type { SlotDef, TemplateDef } from './types';
import { coverTemplate } from './cover';
import { essayTemplate } from './essay';
import { specTemplate } from './spec';

// テンプレートレジストリ。4型目以降はここに追加する。
export const TEMPLATES: Partial<Record<TemplateId, TemplateDef>> = {
  cover: coverTemplate,
  essay: essayTemplate,
  spec: specTemplate,
};

/** ページ追加UIの表示順 */
export const TEMPLATE_ORDER: TemplateId[] = ['cover', 'essay', 'spec'];

export function getTemplate(id: TemplateId): TemplateDef {
  const tpl = TEMPLATES[id];
  if (!tpl) throw new Error(`template not implemented: ${id}`);
  return tpl;
}

/** スロット定義から初期値を生成(imageは未設定なのでエントリを作らない) */
export function createEmptySlots(slots: SlotDef[]): Record<string, SlotValue> {
  const result: Record<string, SlotValue> = {};
  for (const def of slots) {
    if (def.type === 'text') result[def.id] = { type: 'text', value: '' };
    if (def.type === 'list') result[def.id] = { type: 'list', items: [] };
    if (def.type === 'kv') result[def.id] = { type: 'kv', items: [] };
  }
  return result;
}

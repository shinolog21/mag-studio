import { useRef, useState } from 'react';
import { MAX_CROP_SCALE, MIN_CROP_SCALE } from '../lib/crop';
import { useEditor } from '../store';
import { getTemplate } from '../templates';
import type { ImageSlotDef, KvSlotDef, ListSlotDef, TextSlotDef } from '../templates/types';
import type { Page } from '../types';

/** スロット定義から自動生成される入力フォーム(要件4.3) */
export function SlotForm({ page }: { page: Page }) {
  const tpl = getTemplate(page.templateId);
  const setPrBadge = useEditor((s) => s.setPrBadge);

  return (
    <div className="slot-form">
      <div className="form-section-title">{tpl.name}</div>

      <label className="pr-toggle">
        <input
          type="checkbox"
          checked={page.prBadge}
          onChange={(e) => setPrBadge(page.id, e.target.checked)}
        />
        <span>PR表記(誌面右上にPRバッジ)</span>
      </label>

      {tpl.slots.map((def) => {
        if (def.type === 'text') return <TextSlotField key={def.id} def={def} page={page} />;
        if (def.type === 'image') return <ImageSlotField key={def.id} def={def} page={page} />;
        if (def.type === 'list') return <ListSlotField key={def.id} def={def} page={page} />;
        if (def.type === 'kv') return <KvSlotField key={def.id} def={def} page={page} />;
        return null;
      })}
    </div>
  );
}

function TextSlotField({ def, page }: { def: TextSlotDef; page: Page }) {
  const setTextSlot = useEditor((s) => s.setTextSlot);
  const slot = page.slots[def.id];
  const value = slot?.type === 'text' ? slot.value : '';

  const props = {
    value,
    maxLength: def.maxLen, // 上限超過分は入力できない(要件4.3)
    placeholder: def.placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setTextSlot(page.id, def.id, e.target.value.slice(0, def.maxLen)),
  };

  return (
    <div className="field">
      <div className="field-head">
        <label>
          {def.label}
          {def.optional && <span className="optional">省略可</span>}
        </label>
        <span className={`counter${value.length >= def.maxLen ? ' at-limit' : ''}`}>
          {value.length}/{def.maxLen}
        </span>
      </div>
      {def.multiline ? (
        <textarea rows={Math.min(6, Math.max(2, Math.ceil(def.maxLen / 40)))} {...props} />
      ) : (
        <input type="text" {...props} />
      )}
    </div>
  );
}

function ListSlotField({ def, page }: { def: ListSlotDef; page: Page }) {
  const setListSlot = useEditor((s) => s.setListSlot);
  const slot = page.slots[def.id];
  const items = slot?.type === 'list' ? slot.items : [];
  const rows = Array.from({ length: def.maxItems }, (_, i) => items[i] ?? '');

  const update = (index: number, value: string) => {
    const next = [...rows];
    next[index] = value.slice(0, def.maxLen);
    setListSlot(page.id, def.id, next);
  };

  return (
    <div className="field">
      <div className="field-head">
        <label>
          {def.label}
          {def.optional && <span className="optional">省略可</span>}
        </label>
        <span className="counter">各{def.maxLen}字・最大{def.maxItems}件</span>
      </div>
      <div className="stack">
        {rows.map((value, i) => (
          <input
            key={i}
            type="text"
            value={value}
            maxLength={def.maxLen}
            placeholder={`小見出し ${i + 1}`}
            onChange={(e) => update(i, e.target.value)}
          />
        ))}
      </div>
    </div>
  );
}

function KvSlotField({ def, page }: { def: KvSlotDef; page: Page }) {
  const setKvSlot = useEditor((s) => s.setKvSlot);
  const slot = page.slots[def.id];
  const items = slot?.type === 'kv' ? slot.items : [];
  const rows = Array.from({ length: def.maxItems }, (_, i) => items[i] ?? { key: '', value: '' });

  const update = (index: number, patch: Partial<{ key: string; value: string }>) => {
    const next = rows.map((row, i) =>
      i === index
        ? {
            key: (patch.key ?? row.key).slice(0, def.maxKeyLen),
            value: (patch.value ?? row.value).slice(0, def.maxValueLen),
          }
        : row,
    );
    setKvSlot(page.id, def.id, next);
  };

  return (
    <div className="field">
      <div className="field-head">
        <label>{def.label}</label>
        <span className="counter">
          項目{def.maxKeyLen}字/内容{def.maxValueLen}字・最大{def.maxItems}組
        </span>
      </div>
      <div className="stack">
        {rows.map((row, i) => (
          <div key={i} className="kv-row">
            <input
              type="text"
              value={row.key}
              maxLength={def.maxKeyLen}
              placeholder="項目"
              onChange={(e) => update(i, { key: e.target.value })}
            />
            <input
              type="text"
              value={row.value}
              maxLength={def.maxValueLen}
              placeholder="内容"
              onChange={(e) => update(i, { value: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageSlotField({ def, page }: { def: ImageSlotDef; page: Page }) {
  const assets = useEditor((s) => s.assets);
  const setImageSlot = useEditor((s) => s.setImageSlot);
  const updateCrop = useEditor((s) => s.updateCrop);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);

  const slot = page.slots[def.id];
  const image = slot?.type === 'image' ? slot : undefined;
  const asset = image ? assets[image.assetId] : undefined;

  const importFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImporting(true);
    try {
      await setImageSlot(page.id, def.id, file);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="field">
      <div className="field-head">
        <label>{def.label}</label>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void importFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {!asset ? (
        <button
          type="button"
          className={`dropzone${dragOver ? ' drag-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void importFile(e.dataTransfer.files?.[0]);
          }}
        >
          {importing ? '取り込み中…' : 'タップして写真を選択(ドラッグ&ドロップ可)'}
        </button>
      ) : (
        <div className="image-tools">
          <img className="image-thumb" src={asset.url} alt="" />
          <div className="image-controls">
            <label className="zoom-label">
              拡大 {(image?.crop.scale ?? 1).toFixed(2)}×
              <input
                type="range"
                min={MIN_CROP_SCALE}
                max={MAX_CROP_SCALE}
                step={0.01}
                value={image?.crop.scale ?? 1}
                onChange={(e) => updateCrop(page.id, def.id, { scale: Number(e.target.value) })}
              />
            </label>
            <p className="hint">位置はプレビュー上をドラッグ(ピンチで拡大縮小)</p>
            <div className="image-buttons">
              <button type="button" onClick={() => inputRef.current?.click()}>
                {importing ? '取り込み中…' : '写真を差し替え'}
              </button>
              <button type="button" onClick={() => updateCrop(page.id, def.id, { x: 0, y: 0, scale: 1 })}>
                位置をリセット
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

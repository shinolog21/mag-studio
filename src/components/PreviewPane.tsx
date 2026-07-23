import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { APP_CONFIG } from '../config';
import { useEditor } from '../store';
import type { Issue, Page } from '../types';
import { PageCanvas } from './PageCanvas';

const { width: W, height: H } = APP_CONFIG.canvas;

/**
 * ライブプレビュー。実寸キャンバスをコンテナに収まるようCSS transformで縮小表示する。
 * 画像スロット([data-image-slot])上のポインタ操作を委譲で拾い、
 * ドラッグで位置、ピンチ/ホイールで拡大率を調整する(座標はキャンバス座標系へ換算)。
 */
const GUIDE_LABELS = { off: 'ガイド: なし', square: 'ガイド: 1:1', wide: 'ガイド: 16:9' } as const;

export function PreviewPane({ issue, page }: { issue: Issue; page: Page }) {
  const assets = useEditor((s) => s.assets);
  const nudgeCrop = useEditor((s) => s.nudgeCrop);
  const scaleCropBy = useEditor((s) => s.scaleCropBy);
  const guide = useEditor((s) => s.guide);
  const setGuide = useEditor((s) => s.setGuide);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const mobileTab = useEditor((s) => s.mobileTab);

  const recalcScale = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    const fit = Math.min((el.clientWidth - 24) / W, (el.clientHeight - 24) / H);
    setScale(Math.max(0.05, Math.min(fit, 1)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(recalcScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [recalcScale]);

  // モバイルのタブ切替はdisplay切替のため、ResizeObserverを待たず同期で再計算する
  useLayoutEffect(() => {
    recalcScale();
  }, [mobileTab, recalcScale]);

  // ---- crop操作(ポインタ委譲) ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const activeSlot = useRef<string | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const slotIdFrom = (e: { target: EventTarget | null }) =>
    (e.target as HTMLElement | null)?.closest?.('[data-image-slot]')?.getAttribute('data-image-slot') ??
    null;

  const onPointerDown = (e: React.PointerEvent) => {
    const slotId = slotIdFrom(e);
    if (!slotId) return;
    e.preventDefault();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    activeSlot.current = slotId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const slotId = activeSlot.current;
    const prev = pointers.current.get(e.pointerId);
    if (!slotId || !prev) return;
    e.preventDefault();
    const cur = { x: e.clientX, y: e.clientY };

    if (pointers.current.size === 2) {
      // ピンチ: 2点間距離の変化率で拡大率を更新
      const [a, b] = [...pointers.current.entries()];
      const other = a[0] === e.pointerId ? b[1] : a[1];
      const distBefore = Math.hypot(prev.x - other.x, prev.y - other.y);
      const distAfter = Math.hypot(cur.x - other.x, cur.y - other.y);
      if (distBefore > 0) scaleCropBy(page.id, slotId, distAfter / distBefore);
    } else if (pointers.current.size === 1) {
      // ドラッグ: 画面px → キャンバス座標px
      nudgeCrop(page.id, slotId, (cur.x - prev.x) / scaleRef.current, (cur.y - prev.y) / scaleRef.current);
    }
    pointers.current.set(e.pointerId, cur);
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) activeSlot.current = null;
  };

  // ホイール/トラックパッドでの拡大率調整(PC)。passive:falseで登録が必要なためnativeで付ける
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const slotId = slotIdFrom(e);
      if (!slotId) return;
      e.preventDefault();
      scaleCropBy(page.id, slotId, 1 - e.deltaY * 0.0015);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [page.id, scaleCropBy]);

  return (
    <div
      ref={containerRef}
      className="preview-container"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div className="preview-sheet" style={{ width: W * scale, height: H * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <PageCanvas issue={issue} page={page} assets={assets} interactive />
        </div>
        {guide !== 'off' && <GuideOverlay mode={guide} scale={scale} />}
      </div>

      <button
        className="guide-switch"
        onClick={() => setGuide(guide === 'off' ? 'square' : guide === 'square' ? 'wide' : 'off')}
      >
        {GUIDE_LABELS[guide]}
      </button>
    </div>
  );
}

/**
 * Xタイムラインでのクロップ範囲を示すセーフエリアガイド(要件4.3)。
 * 1:1(1080×1080)/ 16:9(1080×607.5)の中央領域外を半透明で覆う。
 */
function GuideOverlay({ mode, scale }: { mode: 'square' | 'wide'; scale: number }) {
  const cropH = mode === 'square' ? W : (W * 9) / 16;
  const shade = ((H - cropH) / 2) * scale;
  return (
    <div className="guide-overlay">
      <div className="guide-shade" style={{ top: 0, height: shade }} />
      <div className="guide-shade" style={{ bottom: 0, height: shade }} />
      <div className="guide-line" style={{ top: shade }} />
      <div className="guide-line" style={{ bottom: shade }} />
      <span className="guide-label">Xクロップ範囲 {mode === 'square' ? '1:1' : '16:9'}</span>
    </div>
  );
}

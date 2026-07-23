import { toSvg } from 'html-to-image';
import { APP_CONFIG } from '../config';

/**
 * PNG書き出し(要件7章)。
 * - 呼び出し元は非表示の実寸(1080×1350)DOM = ExportStage のノードを渡す
 * - pixelRatio 2 で 2160×2700 を出力
 * - フォントは「ロード済みのスライスのみ」をdata URL化して埋め込む。
 *   同梱フォントはunicode-range分割で485ファイルあるため、全埋め込み(html-to-imageの既定動作)は
 *   SVGが十数MBに膨らみiOSで失敗しうる。誌面に表示中の文字のスライスは必ずロード済みなので、
 *   ロード済み分の埋め込みで表示と書き出しが一致する。
 * - html-to-imageはDOM→SVG化(toSvg)のみに使い、SVG→canvasのラスタライズは自前で行う。
 *   同ライブラリのtoPngはimg.decode()失敗を捕捉せず、さらにrequestAnimationFrame待ちを挟むため
 *   バックグラウンドタブ(レンダリング停止中)で永久にハングする(検証環境で実測)。
 * - document.fonts.readyもレンダリング停止中は解決しないことがあるため、タイムアウト付きで待つ。
 *   ExportStageは常設レンダリングで誌面と同じ文字を表示済みなので、必要スライスはロード済み。
 */
export async function exportPagePng(node: HTMLElement, fileName: string): Promise<void> {
  const canvas = await renderPageToCanvas(node);
  const blob = await canvasToPngBlob(canvas);
  await saveOrShareBlob(blob, fileName);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNGエンコードに失敗しました'))),
      'image/png',
    );
  });
}

/** 実寸DOM → 2160×2700のcanvas。書き出しとX用プレビュー(Phase 2)で共用する */
export async function renderPageToCanvas(node: HTMLElement): Promise<HTMLCanvasElement> {
  const { width, height } = APP_CONFIG.canvas;
  const ratio = APP_CONFIG.exportPixelRatio;

  await Promise.race([document.fonts.ready, sleep(1500)]);
  await Promise.all(
    Array.from(node.querySelectorAll('img')).map((img) => img.decode().catch(() => {})),
  );

  const fontEmbedCSS = await buildLoadedFontEmbedCss();
  const svgDataUrl = await toSvg(node, { width, height, fontEmbedCSS });

  const img = new Image();
  img.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('誌面画像の生成に失敗しました(SVG読み込みエラー)'));
    img.src = svgDataUrl;
  });
  // decodeはベストエフォート(失敗してもdrawImageは可能なことが多い)
  await img.decode().catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // WebKit(Safari)はSVG foreignObject内の<img>を遅延デコードするため、
  // 1回目のdrawImageでは写真が欠けることがある(実測)。ページ内に写真がある場合は
  // 1回目の描画でロードをトリガーし、待ってから必ず描き直す(ピクセル判定による
  // スキップはテンプレートのオーバーレイを写真と誤認しうるため行わない)。
  const draw = () => {
    ctx.fillStyle = APP_CONFIG.colors.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  draw();
  if (node.querySelector('img')) {
    await sleep(400);
    draw();
  }
  return canvas;
}

export function pageFileName(vol: number, pageNo: number): string {
  return `vol${String(vol).padStart(2, '0')}_p${pageNo}.png`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** document.fontsでロード済みのFontFaceに対応する@font-faceルールだけをdata URL化したCSSを作る */
async function buildLoadedFontEmbedCss(): Promise<string> {
  const normFamily = (s: string) => s.replaceAll(/["']/g, '').trim().toLowerCase();
  const normRange = (s: string) => s.replaceAll(/\s/g, '').toLowerCase();

  const loadedKeys = new Set<string>();
  document.fonts.forEach((face) => {
    if (face.status === 'loaded') {
      loadedKeys.add(`${normFamily(face.family)}|${face.weight}|${normRange(face.unicodeRange)}`);
    }
  });

  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // クロスオリジンのシートは対象外(本アプリには存在しない想定)
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue('font-family');
      const weight = rule.style.getPropertyValue('font-weight') || 'normal';
      const range = rule.style.getPropertyValue('unicode-range') || 'U+0-10FFFF';
      const key = `${normFamily(family)}|${weight}|${normRange(range)}`;
      if (!loadedKeys.has(key)) continue;

      const cssText = rule.cssText;
      const urlMatch = cssText.match(/url\(["']?([^"')]+)["']?\)/);
      if (!urlMatch) continue;
      const absUrl = new URL(urlMatch[1], sheet.href ?? location.href).href;
      try {
        const res = await fetch(absUrl);
        if (!res.ok) continue;
        const dataUrl = await blobToDataUrl(await res.blob());
        parts.push(cssText.replace(urlMatch[0], `url("${dataUrl}")`));
      } catch {
        // 個別スライスの失敗は無視(該当文字のみフォールバック描画になる)
      }
    }
  }
  return parts.join('\n');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const isIOS = () =>
  /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1); // デスクトップUAのiPadOS

/**
 * iOSでは共有シート経由の保存(Web Share API)、非対応時は通常ダウンロード(要件4.4)。
 * 共有シートのキャンセルはエラー扱いにしない。
 */
export async function saveOrShareBlob(blob: Blob, fileName: string): Promise<void> {
  if (isIOS()) {
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return; // ユーザーキャンセル
        // それ以外はダウンロードにフォールバック
      }
    }
  }
  downloadBlob(blob, fileName);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // クリック処理がURLを掴んでいる間は解放しない(Safari対策で少し遅らせる)
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

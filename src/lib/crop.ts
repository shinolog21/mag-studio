import type { Crop } from '../types';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const MIN_CROP_SCALE = 1;
export const MAX_CROP_SCALE = 3;

/**
 * スロット枠に対する画像の配置を計算する。
 * scale=1で枠を「cover」でちょうど満たし、x/yは枠中心からの平行移動(キャンバス座標px)。
 * 枠の外に隙間ができないよう移動量は常にクランプされる。
 * プレビューと書き出しが同じ計算を通るため、見た目が必ず一致する。
 */
export function coverLayout(
  frameW: number,
  frameH: number,
  imgW: number,
  imgH: number,
  crop: Crop,
) {
  const cover = Math.max(frameW / imgW, frameH / imgH);
  const scale = clamp(crop.scale, MIN_CROP_SCALE, MAX_CROP_SCALE);
  const width = imgW * cover * scale;
  const height = imgH * cover * scale;
  const maxX = (width - frameW) / 2;
  const maxY = (height - frameH) / 2;
  const x = clamp(crop.x, -maxX, maxX);
  const y = clamp(crop.y, -maxY, maxY);
  return {
    width,
    height,
    left: (frameW - width) / 2 + x,
    top: (frameH - height) / 2 + y,
  };
}

/** crop値そのものを枠に収まる範囲へ正規化する(保存用) */
export function clampCrop(frameW: number, frameH: number, imgW: number, imgH: number, crop: Crop): Crop {
  const cover = Math.max(frameW / imgW, frameH / imgH);
  const scale = clamp(crop.scale, MIN_CROP_SCALE, MAX_CROP_SCALE);
  const maxX = (imgW * cover * scale - frameW) / 2;
  const maxY = (imgH * cover * scale - frameH) / 2;
  return {
    x: clamp(crop.x, -maxX, maxX),
    y: clamp(crop.y, -maxY, maxY),
    scale,
  };
}

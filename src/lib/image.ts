import { APP_CONFIG } from '../config';

/**
 * 取り込んだ画像ファイルを長辺2400pxへ縮小してJPEG Blob化する(容量対策)。
 * EXIFの回転はcreateImageBitmapのimageOrientationで適用する。
 */
export async function processImageFile(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  // EXIF回転を適用して取り込む。オプション未対応の環境(古いWebKit)ではオプションなしで再試行
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() =>
    createImageBitmap(file),
  );
  try {
    const maxEdge = APP_CONFIG.assetMaxEdge;
    const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        0.9,
      );
    });
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

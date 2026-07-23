/**
 * UUID v4を生成する。
 * crypto.randomUUID()はsecure context(HTTPS/localhost)専用のため、
 * LAN IPへのHTTPアクセス(実機検証など)ではgetRandomValuesベースにフォールバックする。
 */
export function uid(): string {
  // 型定義上randomUUIDは必須だが、非secure contextの実行環境には存在しない
  const c = crypto as Crypto & { randomUUID?: () => string };
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

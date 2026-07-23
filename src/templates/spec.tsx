import { APP_CONFIG } from '../config';
import type { TemplateDef, TemplateRenderProps } from './types';
import { ImageSlot, kvOf, textOf } from './parts';

const { width: W, margin: M } = APP_CONFIG.canvas;
const { colors, fonts } = APP_CONFIG;

// レイアウト定数(仮値。Phase 3の実物調整はここを触る)
const L = {
  photoHeight: 540, // 上部40%
  brandSize: 24,
  productSize: 42,
  priceSize: 32,
  headlineSize: 36,
  commentSize: APP_CONFIG.minBodyFontPx, // 28
  specKeySize: 24,
  specValueSize: APP_CONFIG.minBodyFontPx,
  specColumnWidth: 372,
} as const;

function SpecRender({ page, assets, interactive }: TemplateRenderProps) {
  const brand = textOf(page, 'brand_name');
  const product = textOf(page, 'product_name');
  const price = textOf(page, 'price');
  const headline = textOf(page, 'headline');
  const comment = textOf(page, 'comment');
  const specs = kvOf(page, 'specs');

  return (
    <>
      <ImageSlot
        slotId="product_photo"
        page={page}
        assets={assets}
        frame={{ left: 0, top: 0, width: W, height: L.photoHeight }}
        interactive={interactive}
      />

      {/* 商品情報帯 */}
      <div style={{ position: 'absolute', left: M, right: M, top: L.photoHeight + 30 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: fonts.sans,
              fontWeight: 700,
              fontSize: L.brandSize,
              letterSpacing: '0.14em',
              color: colors.inkSoft,
            }}
          >
            {brand || (interactive ? <span style={{ opacity: 0.4 }}>BRAND</span> : null)}
          </span>
          {price && (
            <span
              style={{
                fontFamily: fonts.sans,
                fontWeight: 700,
                fontSize: L.priceSize,
                letterSpacing: '0.02em',
                color: colors.ink,
              }}
            >
              {price}
            </span>
          )}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: fonts.serif,
            fontWeight: 700,
            fontSize: L.productSize,
            lineHeight: 1.3,
            letterSpacing: '0.02em',
            color: colors.ink,
          }}
        >
          {product || (interactive ? <span style={{ opacity: 0.25 }}>商品名</span> : null)}
        </div>
      </div>

      {/* 本文2カラム: 左=見出し+コメント、右=スペック表 */}
      <div
        style={{
          position: 'absolute',
          left: M,
          right: M,
          top: L.photoHeight + 160,
          bottom: M + 44,
          display: 'flex',
          gap: 36,
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {headline && (
            <h2
              style={{
                margin: '0 0 16px',
                fontFamily: fonts.serif,
                fontWeight: 700,
                fontSize: L.headlineSize,
                lineHeight: 1.4,
                letterSpacing: '0.04em',
                color: colors.ink,
              }}
            >
              {headline}
            </h2>
          )}
          {comment && (
            <p
              style={{
                margin: 0,
                fontFamily: fonts.sans,
                fontWeight: 400,
                fontSize: L.commentSize,
                lineHeight: 1.85,
                letterSpacing: '0.02em',
                color: colors.ink,
              }}
            >
              {comment}
            </p>
          )}
        </div>

        {specs.length > 0 && (
          <div style={{ width: L.specColumnWidth, flexShrink: 0, borderTop: `3px solid ${colors.ink}` }}>
            {specs.map((item, i) => (
              <div key={i} style={{ padding: '14px 2px', borderBottom: '1px solid #D8D3C6' }}>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontWeight: 500,
                    fontSize: L.specKeySize,
                    letterSpacing: '0.1em',
                    color: colors.inkSoft,
                  }}
                >
                  {item.key}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: fonts.sans,
                    fontWeight: 500,
                    fontSize: L.specValueSize,
                    letterSpacing: '0.02em',
                    color: colors.ink,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** T3: 商品スペック型 */
export const specTemplate: TemplateDef = {
  id: 'spec',
  name: '商品スペック型',
  description: '商品紹介・PR案件向け。写真+スペック表+コメント',
  slots: [
    { id: 'product_photo', type: 'image', label: '商品写真', frame: { width: W, height: L.photoHeight } },
    { id: 'brand_name', type: 'text', label: 'ブランド名', maxLen: 15, placeholder: '例: SONY' },
    { id: 'product_name', type: 'text', label: '商品名', maxLen: 25, placeholder: '例: WH-1000XM6' },
    { id: 'price', type: 'text', label: '価格', maxLen: 15, optional: true, placeholder: '例: ¥59,400(税込)' },
    { id: 'headline', type: 'text', label: '見出し', maxLen: 14, placeholder: '例: 沈黙の帝王、再び' },
    {
      id: 'comment',
      type: 'text',
      label: 'コメント',
      maxLen: 140, // 仮: 200字では2カラム構成に収まらないため140字に調整
      multiline: true,
      placeholder: 'エッセイ風コメント(約140字)',
    },
    {
      id: 'specs',
      type: 'kv',
      label: 'スペック',
      maxItems: 5,
      maxKeyLen: 8,
      maxValueLen: 15,
    },
  ],
  Render: SpecRender,
};

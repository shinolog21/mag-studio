import { APP_CONFIG } from '../config';
import type { TemplateDef, TemplateRenderProps } from './types';
import { ImageSlot, textOf } from './parts';

const { width: W, height: H, margin: M } = APP_CONFIG.canvas;
const { colors, fonts } = APP_CONFIG;

// レイアウト定数(仮値。Phase 3の実物調整はここを触る)
const L = {
  /** 写真は上部50%のフルブリード(要件は「約55%」— 本文300字設定では収まらないため50%+本文200字に仮調整) */
  photoHeight: Math.round(H * 0.5), // 675
  headlineSize: 50,
  leadSize: 30,
  bodySize: APP_CONFIG.minBodyFontPx, // 28 (下限)
  captionSize: APP_CONFIG.minBodyFontPx,
  footnoteSize: 24, // 誌面装飾(ロゴ・ノンブル等)は本文系ではないため下限対象外
} as const;

function EssayRender({ page, assets, interactive }: TemplateRenderProps) {
  const headline = textOf(page, 'headline');
  const lead = textOf(page, 'lead');
  const body = textOf(page, 'body');
  const caption = textOf(page, 'caption');
  const credit = textOf(page, 'credit');

  return (
    <>
      <ImageSlot
        slotId="main_photo"
        page={page}
        assets={assets}
        frame={{ left: 0, top: 0, width: W, height: L.photoHeight }}
        interactive={interactive}
      />

      {/* 写真脇の縦書きキャプション(写真右下に重ねる) */}
      {caption && (
        <div
          style={{
            position: 'absolute',
            right: 22,
            bottom: H - L.photoHeight + 26,
            maxHeight: L.photoHeight - M * 2,
            overflow: 'hidden',
            writingMode: 'vertical-rl',
            fontFamily: fonts.sans,
            fontWeight: 500,
            fontSize: L.captionSize,
            letterSpacing: '0.16em',
            lineHeight: 1.4,
            color: '#FFFFFF',
            textShadow: '0 1px 10px rgba(0,0,0,0.5), 0 0 2px rgba(0,0,0,0.35)',
          }}
        >
          {caption}
        </div>
      )}

      {/* 撮影・出典(写真左下に小さく) */}
      {credit && (
        <div
          style={{
            position: 'absolute',
            left: 22,
            bottom: H - L.photoHeight + 20,
            fontFamily: fonts.sans,
            fontWeight: 400,
            fontSize: L.footnoteSize,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          }}
        >
          {credit}
        </div>
      )}

      {/* 本文エリア */}
      <div
        style={{
          position: 'absolute',
          left: M,
          right: M,
          top: L.photoHeight + 34,
          bottom: M + 44, // フッターゾーンを避ける
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.serif,
            fontWeight: 700,
            fontSize: L.headlineSize,
            lineHeight: 1.35,
            letterSpacing: '0.04em',
            color: colors.ink,
          }}
        >
          {headline || (interactive ? <span style={{ opacity: 0.25 }}>見出しを入力</span> : null)}
        </h1>

        {lead && (
          <p
            style={{
              margin: '18px 0 0',
              fontFamily: fonts.sans,
              fontWeight: 500,
              fontSize: L.leadSize,
              lineHeight: 1.65,
              letterSpacing: '0.03em',
              color: colors.inkSoft,
            }}
          >
            {lead}
          </p>
        )}

        {body && (
          <p
            style={{
              margin: '20px 0 0',
              fontFamily: fonts.sans,
              fontWeight: 400,
              fontSize: L.bodySize,
              lineHeight: 1.9, // エッセイ本文: 行間広め(要件目安1.9)
              letterSpacing: '0.02em',
              color: colors.ink,
              overflow: 'hidden',
            }}
          >
            {body}
          </p>
        )}
      </div>
    </>
  );
}

/** T2: 特集エッセイ型(主力テンプレート) */
export const essayTemplate: TemplateDef = {
  id: 'essay',
  name: '特集エッセイ型',
  description: '写真+エッセイ本文で構成する中核フォーマット',
  slots: [
    { id: 'main_photo', type: 'image', label: 'メイン写真', frame: { width: W, height: L.photoHeight } },
    { id: 'headline', type: 'text', label: '見出し', maxLen: 14, placeholder: '例: 静寂という機能' },
    {
      id: 'lead',
      type: 'text',
      label: '導入文',
      maxLen: 60, // 仮: 80字ではレイアウトに収まらないため60字に調整
      multiline: true,
      optional: true,
      placeholder: '本文へ誘う短い導入',
    },
    {
      id: 'body',
      type: 'text',
      label: 'エッセイ本文',
      maxLen: 200, // 仮: 300字では写真50%とテキスト下限28pxが両立しないため200字に調整
      multiline: true,
      placeholder: 'エッセイ本文(約200字)',
    },
    {
      id: 'caption',
      type: 'text',
      label: 'キャプション(縦書き)',
      maxLen: 20,
      optional: true,
      placeholder: '写真に重なる縦書きの一言',
    },
    { id: 'credit', type: 'text', label: 'クレジット', maxLen: 20, optional: true, placeholder: 'photo: shino' },
  ],
  Render: EssayRender,
};

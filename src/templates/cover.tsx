import { APP_CONFIG } from '../config';
import type { TemplateDef, TemplateRenderProps } from './types';
import { ImageSlot, listOf, textOf } from './parts';

const { width: W, height: H, margin: M } = APP_CONFIG.canvas;
const { fonts } = APP_CONFIG;

// レイアウト定数(仮値。Phase 3の実物調整はここを触る)
const L = {
  titleSize: 76,
  subtitleSize: 30,
  topicSize: 28,
  gradientHeight: 640,
} as const;

const shadow = '0 2px 18px rgba(0,0,0,0.55), 0 0 3px rgba(0,0,0,0.4)';

function CoverRender({ page, assets, interactive }: TemplateRenderProps) {
  const title = textOf(page, 'issue_title');
  const subtitle = textOf(page, 'subtitle');
  const topics = listOf(page, 'topics');

  return (
    <>
      <ImageSlot
        slotId="cover_photo"
        page={page}
        assets={assets}
        frame={{ left: 0, top: 0, width: W, height: H }}
        interactive={interactive}
      />

      {/* タイトルの可読性を確保する下部グラデーション */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: L.gradientHeight,
          background:
            'linear-gradient(to top, rgba(14,13,11,0.68) 0%, rgba(14,13,11,0.42) 45%, rgba(14,13,11,0) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: M,
          right: M,
          bottom: M - 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          color: '#FFFFFF',
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.serif,
            fontWeight: 700,
            fontSize: L.titleSize,
            lineHeight: 1.28,
            letterSpacing: '0.05em',
            textShadow: shadow,
          }}
        >
          {title || (interactive ? <span style={{ opacity: 0.45 }}>特集タイトル</span> : null)}
        </h1>

        {subtitle && (
          <p
            style={{
              margin: 0,
              fontFamily: fonts.sans,
              fontWeight: 500,
              fontSize: L.subtitleSize,
              lineHeight: 1.6,
              letterSpacing: '0.06em',
              textShadow: shadow,
            }}
          >
            {subtitle}
          </p>
        )}

        {topics.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {topics.map((topic, i) => (
              <div
                key={i}
                style={{
                  fontFamily: fonts.sans,
                  fontWeight: 500,
                  fontSize: L.topicSize,
                  letterSpacing: '0.08em',
                  textShadow: shadow,
                }}
              >
                <span style={{ opacity: 0.75, marginRight: 14 }}>/</span>
                {topic}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** T1: 表紙型 */
export const coverTemplate: TemplateDef = {
  id: 'cover',
  name: '表紙型',
  description: '号の顔となる1ページ目用。写真全面+特集タイトル',
  chrome: 'cover',
  slots: [
    { id: 'cover_photo', type: 'image', label: '表紙写真', frame: { width: W, height: H } },
    { id: 'issue_title', type: 'text', label: '特集タイトル', maxLen: 16, placeholder: '例: 良い音は、静かだ。' },
    {
      id: 'subtitle',
      type: 'text',
      label: 'サブコピー',
      maxLen: 30,
      optional: true,
      placeholder: '特集の補足コピー',
    },
    {
      id: 'topics',
      type: 'list',
      label: 'トピック(小見出し)',
      maxItems: 3,
      maxLen: 15,
      optional: true,
    },
  ],
  Render: CoverRender,
};

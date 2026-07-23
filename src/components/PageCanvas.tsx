import type { Ref } from 'react';
import { APP_CONFIG } from '../config';
import { getTemplate } from '../templates';
import type { AssetInfo, Issue, Page } from '../types';

const { width: W, height: H, margin: M } = APP_CONFIG.canvas;
const { colors, fonts } = APP_CONFIG;

/** 号数表記(自動生成)。例: GADGET REVIEW — VOL.3 */
function issueLabel(issue: Issue): string {
  return `${APP_CONFIG.issueLabel} — VOL.${issue.vol}`;
}

/** 発行日 YYYY-MM-DD → 2026.07.22 */
function formatDate(publishedAt?: string): string | null {
  if (!publishedAt) return null;
  const m = publishedAt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : publishedAt;
}

/**
 * 1080×1350の誌面実寸レンダリング。
 * プレビューはこれをCSS transformで縮小表示し、書き出しは非表示の実寸マウント(ExportStage)を
 * そのままラスタライズする。固定要素(ロゴ・号数・ノンブル・PRバッジ)はここで自動描画する(要件5.1)。
 */
export function PageCanvas({
  issue,
  page,
  assets,
  interactive,
  ref,
}: {
  issue: Issue;
  page: Page;
  assets: Record<string, AssetInfo>;
  interactive: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const tpl = getTemplate(page.templateId);
  const pageNo = issue.pages.findIndex((p) => p.id === page.id) + 1;
  const date = formatDate(issue.publishedAt);

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: W,
        height: H,
        overflow: 'hidden',
        background: colors.paper,
        color: colors.ink,
        fontFamily: fonts.sans,
        // 書き出し再現性のため誌面はすべてinline styleで完結させる(外部CSS非依存)
        lineHeight: 1.5,
      }}
    >
      <tpl.Render issue={issue} page={page} assets={assets} interactive={interactive} />

      {tpl.chrome === 'cover' ? (
        // 表紙: 上部中央に大ロゴ+号数表記(写真上に白+影)
        <div
          style={{
            position: 'absolute',
            left: M,
            right: M,
            top: M + 6,
            textAlign: 'center',
            color: '#FFFFFF',
            textShadow: '0 2px 16px rgba(0,0,0,0.5), 0 0 3px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: fonts.sans,
              fontWeight: 700,
              fontSize: 44,
              letterSpacing: '0.3em',
              textIndent: '0.3em',
            }}
          >
            {APP_CONFIG.mediaName}
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: fonts.sans,
              fontWeight: 500,
              fontSize: 22,
              letterSpacing: '0.24em',
              textIndent: '0.24em',
            }}
          >
            {issueLabel(issue)}
            {date && <span style={{ marginLeft: 16 }}>| {date}</span>}
          </div>
        </div>
      ) : (
        // 通常ページ: フッターに小ロゴ+号数+ノンブル
        <div
          style={{
            position: 'absolute',
            left: M,
            right: M,
            bottom: M - 4,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            fontSize: 24,
            letterSpacing: '0.14em',
            color: colors.ink,
          }}
        >
          <span style={{ fontFamily: fonts.sans, fontWeight: 700 }}>{APP_CONFIG.mediaName}</span>
          <span style={{ fontFamily: fonts.sans, fontWeight: 500, color: colors.inkSoft }}>
            {issueLabel(issue)}
            <span style={{ marginLeft: 18 }}>P.{pageNo}</span>
          </span>
        </div>
      )}

      {/* PRバッジ(トグルオン時のみ。右上定位置) */}
      {page.prBadge && (
        <div
          style={{
            position: 'absolute',
            top: M,
            right: M,
            padding: '6px 16px',
            border: `3px solid ${colors.ink}`,
            background: colors.paper,
            fontFamily: fonts.sans,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '0.22em',
            textIndent: '0.22em',
            color: colors.ink,
          }}
        >
          PR
        </div>
      )}
    </div>
  );
}

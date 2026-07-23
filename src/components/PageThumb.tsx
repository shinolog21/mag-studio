import { APP_CONFIG } from '../config';
import { useEditor } from '../store';
import type { Issue, Page } from '../types';
import { PageCanvas } from './PageCanvas';

const { width: W, height: H } = APP_CONFIG.canvas;

/** 誌面のミニサムネイル(実寸レンダリングのCSS縮小) */
export function PageThumb({ issue, page, width }: { issue: Issue; page: Page; width: number }) {
  const assets = useEditor((s) => s.assets);
  const scale = width / W;
  return (
    <div className="page-thumb" style={{ width, height: Math.round(H * scale) }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <PageCanvas issue={issue} page={page} assets={assets} interactive={false} />
      </div>
    </div>
  );
}

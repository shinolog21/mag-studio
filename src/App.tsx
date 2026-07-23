import { useEffect, useRef, useState } from 'react';
import { PageCanvas } from './components/PageCanvas';
import { selectCurrentIssue, useEditor } from './store';
import { LibraryView } from './views/LibraryView';
import { IssueView } from './views/IssueView';
import { PageEditorView } from './views/PageEditorView';

// 検証用URLパラメータ: ?seed=1 デモデータ投入 / ?debugExport=1&auto=1 書き出しを自動実行して画面表示
const PARAMS = new URLSearchParams(location.search);
const SEED = PARAMS.has('seed');
const AUTO_EXPORT = PARAMS.has('debugExport') && PARAMS.has('auto');

export default function App() {
  const issues = useEditor((s) => s.issues);
  const view = useEditor((s) => s.view);
  const init = useEditor((s) => s.init);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    init().catch((err: unknown) => {
      console.error(err);
      setBootError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    });
  }, [init]);

  const devRan = useRef(false);
  useEffect(() => {
    if ((!SEED && !AUTO_EXPORT) || devRan.current || !issues) return;
    devRan.current = true;
    void (async () => {
      if (SEED) {
        const { seedDemoData } = await import('./dev/seed');
        await seedDemoData();
      }
      if (AUTO_EXPORT) {
        await new Promise((r) => setTimeout(r, 1200));
        document.querySelector<HTMLButtonElement>('.export-btn')?.click();
      }
    })();
  }, [issues]);

  if (bootError) {
    return (
      <div className="boot boot-error">
        <p>起動に失敗しました</p>
        <code>{bootError}</code>
        <button onClick={() => location.reload()}>再読み込み</button>
      </div>
    );
  }
  if (!issues) return <div className="boot">MAG STUDIO を起動中…</div>;

  return (
    <>
      {view === 'library' ? <LibraryView /> : view === 'issue' ? <IssueView /> : <PageEditorView />}
      <ExportStage />
      <GlobalOverlays />
    </>
  );
}

/**
 * 書き出し用の非表示実寸レンダリング(要件7章: 縮小プレビューからは書き出さない)。
 * 現在の号の全ページを常設マウントしておくことで、書き出し時のレンダー待ちと
 * フォント未ロードを避ける(表示中の文字のフォントスライスは必ずロード済みになる)。
 */
function ExportStage() {
  const issue = useEditor(selectCurrentIssue);
  const assets = useEditor((s) => s.assets);
  const view = useEditor((s) => s.view);
  if (!issue || view === 'library') return null;
  return (
    <div className="export-stage" aria-hidden="true">
      {issue.pages.map((page) => (
        <div key={page.id} data-export-page={page.id}>
          <PageCanvas issue={issue} page={page} assets={assets} interactive={false} />
        </div>
      ))}
    </div>
  );
}

function GlobalOverlays() {
  const toast = useEditor((s) => s.toast);
  const debugImage = useEditor((s) => s.debugImage);
  const setDebugImage = useEditor((s) => s.setDebugImage);
  const updateReady = useEditor((s) => s.updateReady);
  const applyUpdate = useEditor((s) => s.applyUpdate);

  return (
    <>
      {toast && <div className="toast">{toast}</div>}

      {updateReady && (
        <div className="update-toast">
          <span>新しいバージョンがあります</span>
          <button onClick={() => applyUpdate?.()}>更新する</button>
        </div>
      )}

      {debugImage && (
        <div className="debug-export-overlay" onClick={() => setDebugImage(null)}>
          <img src={debugImage} alt="書き出し結果(検証表示)" />
          <span>書き出し結果の検証表示 — タップで閉じる</span>
        </div>
      )}
    </>
  );
}

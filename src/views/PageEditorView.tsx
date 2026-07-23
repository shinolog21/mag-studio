import { PreviewPane } from '../components/PreviewPane';
import { SlotForm } from '../components/SlotForm';
import { exportPagePng, pageFileName, renderPageToCanvas } from '../export/exportPng';
import { selectCurrentIssue, useEditor } from '../store';
import { resolveExportNode } from './IssueView';

// ?debugExport=1 で書き出し結果をダウンロードせず画面表示する(実機での品質検証用)
const DEBUG_EXPORT = new URLSearchParams(location.search).has('debugExport');

/** ページ編集(本ツールの中核画面、要件4.3) */
export function PageEditorView() {
  const issue = useEditor(selectCurrentIssue);
  const activePageId = useEditor((s) => s.activePageId);
  const setActivePage = useEditor((s) => s.setActivePage);
  const openIssueView = useEditor((s) => s.openIssue);
  const openLibrary = useEditor((s) => s.openLibrary);
  const mobileTab = useEditor((s) => s.mobileTab);
  const setMobileTab = useEditor((s) => s.setMobileTab);
  const exporting = useEditor((s) => s.exporting);
  const setExporting = useEditor((s) => s.setExporting);
  const showToast = useEditor((s) => s.showToast);
  const setDebugImage = useEditor((s) => s.setDebugImage);

  if (!issue) {
    openLibrary();
    return null;
  }
  const page = issue.pages.find((p) => p.id === activePageId) ?? issue.pages[0];
  const pageNo = issue.pages.findIndex((p) => p.id === page.id) + 1;

  const onExport = async () => {
    const node = resolveExportNode(page.id);
    if (!node || exporting) return;
    setExporting(true);
    try {
      const started = performance.now();
      if (DEBUG_EXPORT) {
        const canvas = await renderPageToCanvas(node);
        setDebugImage(canvas.toDataURL('image/png'));
      } else {
        await exportPagePng(node, pageFileName(issue.vol, pageNo));
      }
      showToast(`書き出しました(${((performance.now() - started) / 1000).toFixed(1)}秒)`);
    } catch (err) {
      console.error(err);
      showToast(`書き出しに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <button className="ghost-btn" onClick={() => void openIssueView(issue.id)}>
          ← VOL.{issue.vol}
        </button>

        <nav className="page-tabs">
          {issue.pages.map((p, i) => (
            <button
              key={p.id}
              className={p.id === page.id ? 'active' : ''}
              onClick={() => setActivePage(p.id)}
            >
              P{i + 1}
            </button>
          ))}
        </nav>

        <div className="spacer" />

        <button className="export-btn" onClick={() => void onExport()} disabled={exporting}>
          {exporting ? '書き出し中…' : 'PNG書き出し'}
        </button>
      </header>

      <main className="workspace">
        <section className={`form-pane${mobileTab === 'edit' ? ' active' : ''}`}>
          <SlotForm page={page} />
        </section>
        <section className={`preview-pane${mobileTab === 'preview' ? ' active' : ''}`}>
          <PreviewPane issue={issue} page={page} />
        </section>
      </main>

      <nav className="mobile-tabbar">
        <button className={mobileTab === 'edit' ? 'active' : ''} onClick={() => setMobileTab('edit')}>
          編集
        </button>
        <button
          className={mobileTab === 'preview' ? 'active' : ''}
          onClick={() => setMobileTab('preview')}
        >
          プレビュー
        </button>
      </nav>
    </div>
  );
}

import { useState } from 'react';
import { PageThumb } from '../components/PageThumb';
import { exportIssueJson } from '../export/backup';
import { saveOrShareBlob } from '../export/exportPng';
import { exportIssueZip } from '../export/exportZip';
import { buildNoteMarkdown } from '../export/noteMarkdown';
import { selectCurrentIssue, useEditor } from '../store';
import { TEMPLATE_ORDER, getTemplate } from '../templates';
import { APP_CONFIG } from '../config';

/** ExportStage内の実寸レンダリング済みノードを取得 */
export const resolveExportNode = (pageId: string) =>
  document.querySelector(`[data-export-page="${pageId}"]`)?.firstElementChild as HTMLElement | null;

/** 号編集(メタ情報+ページ一覧、要件4.2) */
export function IssueView() {
  const issue = useEditor(selectCurrentIssue);
  const openLibrary = useEditor((s) => s.openLibrary);
  const openPage = useEditor((s) => s.openPage);
  const updateIssueMeta = useEditor((s) => s.updateIssueMeta);
  const addPage = useEditor((s) => s.addPage);
  const duplicatePage = useEditor((s) => s.duplicatePage);
  const deletePage = useEditor((s) => s.deletePage);
  const movePage = useEditor((s) => s.movePage);
  const exporting = useEditor((s) => s.exporting);
  const setExporting = useEditor((s) => s.setExporting);
  const showToast = useEditor((s) => s.showToast);
  const [progress, setProgress] = useState<string | null>(null);

  if (!issue) {
    openLibrary();
    return null;
  }

  const onExportZip = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportIssueZip(issue, resolveExportNode, (done, total) =>
        setProgress(`${done}/${total}`),
      );
      showToast('号を一括書き出ししました(zip)');
    } catch (err) {
      console.error(err);
      showToast(`書き出しに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  const onCopyNote = async () => {
    try {
      await navigator.clipboard.writeText(buildNoteMarkdown(issue));
      showToast('note用テキストをコピーしました');
    } catch {
      showToast('コピーできませんでした(.md保存をお使いください)');
    }
  };

  const onSaveNote = async () => {
    const md = buildNoteMarkdown(issue);
    const blob = new Blob([md], { type: 'text/markdown' });
    await saveOrShareBlob(blob, `vol${String(issue.vol).padStart(2, '0')}_note.md`);
  };

  const onExportJson = async () => {
    try {
      await exportIssueJson(issue);
      showToast('JSONバックアップを書き出しました');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'JSON書き出しに失敗しました');
    }
  };

  const onDeletePage = (pageId: string, pageNo: number) => {
    // 削除は必ず確認ダイアログを挟む(要件9章)
    if (!window.confirm(`ページ${pageNo}を削除しますか?\nこの操作は取り消せません。`)) return;
    deletePage(pageId);
  };

  return (
    <div className="app">
      <header className="topbar">
        <button className="ghost-btn" onClick={openLibrary}>
          ← 一覧
        </button>
        <div className="issue-meta">
          <label className="vol-field">
            VOL.
            <input
              type="number"
              min={1}
              value={issue.vol}
              onChange={(e) => updateIssueMeta({ vol: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <input
            className="theme-field"
            type="text"
            value={issue.theme}
            placeholder="特集テーマ"
            onChange={(e) => updateIssueMeta({ theme: e.target.value })}
          />
          <input
            className="date-field"
            type="date"
            value={issue.publishedAt ?? ''}
            onChange={(e) => updateIssueMeta({ publishedAt: e.target.value || undefined })}
          />
        </div>
        <div className="spacer" />
        <button className="export-btn" onClick={() => void onExportZip()} disabled={exporting}>
          {exporting ? `書き出し中… ${progress ?? ''}` : '号を一括書き出し(zip)'}
        </button>
      </header>

      <main className="issue-editor">
        <div className="issue-toolbar">
          <button className="ghost-btn" onClick={() => void onCopyNote()}>
            note用テキストをコピー
          </button>
          <button className="ghost-btn" onClick={() => void onSaveNote()}>
            note用テキスト(.md)保存
          </button>
          <button className="ghost-btn" onClick={() => void onExportJson()}>
            JSONバックアップ
          </button>
        </div>

        <div className="pages-grid">
          {issue.pages.map((page, i) => (
            <div key={page.id} className="page-card">
              <button className="page-card-main" onClick={() => openPage(page.id)}>
                <PageThumb issue={issue} page={page} width={168} />
                <div className="page-card-meta">
                  <span className="page-no">P.{i + 1}</span>
                  <span className="page-tpl">{getTemplate(page.templateId).name}</span>
                </div>
              </button>
              <div className="page-card-actions">
                <button title="前へ" disabled={i === 0} onClick={() => movePage(page.id, -1)}>
                  ←
                </button>
                <button
                  title="後へ"
                  disabled={i === issue.pages.length - 1}
                  onClick={() => movePage(page.id, 1)}
                >
                  →
                </button>
                <button
                  disabled={issue.pages.length >= APP_CONFIG.maxPages}
                  onClick={() => duplicatePage(page.id)}
                >
                  複製
                </button>
                <button
                  className="danger"
                  disabled={issue.pages.length <= 1}
                  onClick={() => onDeletePage(page.id, i + 1)}
                >
                  削除
                </button>
              </div>
            </div>
          ))}

          {issue.pages.length < APP_CONFIG.maxPages && (
            <div className="add-page-card">
              <span>ページを追加</span>
              {TEMPLATE_ORDER.map((id) => (
                <button key={id} onClick={() => addPage(id)}>
                  {getTemplate(id).name}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

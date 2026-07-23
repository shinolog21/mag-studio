import { useRef, useState } from 'react';
import { PageThumb } from '../components/PageThumb';
import { parseBackupJson } from '../export/backup';
import { exportIssueJson } from '../export/backup';
import { useEditor } from '../store';
import type { Issue } from '../types';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
};

/** 号一覧(バックナンバー管理、要件4.1) */
export function LibraryView() {
  const issues = useEditor((s) => s.issues) ?? [];
  const createIssue = useEditor((s) => s.createIssue);
  const importIssue = useEditor((s) => s.importIssue);
  const showToast = useEditor((s) => s.showToast);
  const importRef = useRef<HTMLInputElement>(null);

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const issue = await parseBackupJson(file);
      await importIssue(issue);
      showToast(`VOL.${issue.vol}「${issue.theme || '無題'}」を読み込みました`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '読み込みに失敗しました');
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">MAG STUDIO</div>
        <span className="topbar-note">バックナンバー {issues.length}冊</span>
        <div className="spacer" />
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void onImportFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button className="ghost-btn" onClick={() => importRef.current?.click()}>
          JSONから読み込み
        </button>
      </header>

      <main className="library">
        <div className="issue-grid">
          <button className="new-issue-card" onClick={() => void createIssue()}>
            <span className="plus">+</span>
            新しい号を作る
          </button>
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      </main>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const openIssue = useEditor((s) => s.openIssue);
  const duplicateIssue = useEditor((s) => s.duplicateIssue);
  const deleteIssue = useEditor((s) => s.deleteIssue);
  const showToast = useEditor((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const firstPage = issue.pages[0];

  const onDelete = async () => {
    // 削除は必ず確認ダイアログを挟む(要件9章)
    const label = `VOL.${issue.vol}${issue.theme ? `「${issue.theme}」` : ''}`;
    if (!window.confirm(`${label} を削除しますか?\nこの操作は取り消せません。`)) return;
    await deleteIssue(issue.id);
    showToast(`${label} を削除しました`);
  };

  const onExportJson = async () => {
    setBusy(true);
    try {
      await exportIssueJson(issue);
      showToast('JSONを書き出しました');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'JSON書き出しに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="issue-card">
      <button className="issue-card-main" onClick={() => void openIssue(issue.id)}>
        {firstPage ? (
          <PageThumb issue={issue} page={firstPage} width={168} />
        ) : (
          <div className="thumb-empty">ページなし</div>
        )}
        <div className="issue-card-meta">
          <span className="issue-vol">VOL.{issue.vol}</span>
          <span className="issue-theme">{issue.theme || '(特集テーマ未設定)'}</span>
          <span className="issue-date">
            {issue.pages.length}ページ・{formatDate(issue.updatedAt)}更新
          </span>
        </div>
      </button>
      <div className="issue-card-actions">
        <button onClick={() => void duplicateIssue(issue.id)}>複製</button>
        <button onClick={() => void onExportJson()} disabled={busy}>
          {busy ? '書き出し中…' : 'JSON'}
        </button>
        <button className="danger" onClick={() => void onDelete()}>
          削除
        </button>
      </div>
    </div>
  );
}

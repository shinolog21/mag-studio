import { create } from 'zustand';
import { APP_CONFIG } from './config';
import { db } from './db';
import { clampCrop } from './lib/crop';
import { uid } from './lib/uid';
import { processImageFile } from './lib/image';
import { createEmptySlots, getTemplate } from './templates';
import type { ImageSlotDef } from './templates/types';
import type { AssetInfo, Crop, Issue, Page, SlotValue, TemplateId } from './types';

export type View = 'library' | 'issue' | 'page';
export type GuideMode = 'off' | 'square' | 'wide';

interface EditorStore {
  issues: Issue[] | null; // null = ロード前
  currentIssueId: string | null;
  view: View;
  activePageId: string | null;
  assets: Record<string, AssetInfo>;
  mobileTab: 'edit' | 'preview';
  exporting: boolean;
  guide: GuideMode;
  updateReady: boolean;
  applyUpdate: (() => void) | null;
  toast: string | null;
  /** ?debugExport=1 検証表示用の書き出し結果 */
  debugImage: string | null;

  init: () => Promise<void>;
  /** initの実体(直接呼ばない)。失敗時の再試行制御のため分離 */
  initInner: () => Promise<void>;
  showToast: (message: string) => void;
  setDebugImage: (url: string | null) => void;

  // ナビゲーション
  openLibrary: () => void;
  openIssue: (issueId: string) => Promise<void>;
  openPage: (pageId: string) => void;
  setActivePage: (pageId: string) => void;
  setMobileTab: (tab: 'edit' | 'preview') => void;
  setExporting: (on: boolean) => void;
  setGuide: (mode: GuideMode) => void;
  notifyUpdateReady: (apply: () => void) => void;

  // 号操作
  createIssue: () => Promise<void>;
  duplicateIssue: (issueId: string) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  importIssue: (issue: Issue) => Promise<void>;
  updateIssueMeta: (patch: Partial<Pick<Issue, 'vol' | 'theme' | 'publishedAt'>>) => void;

  // ページ操作
  addPage: (templateId: TemplateId) => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  movePage: (pageId: string, dir: -1 | 1) => void;
  setPrBadge: (pageId: string, on: boolean) => void;

  // スロット操作
  setTextSlot: (pageId: string, slotId: string, value: string) => void;
  setListSlot: (pageId: string, slotId: string, items: string[]) => void;
  setKvSlot: (pageId: string, slotId: string, items: { key: string; value: string }[]) => void;
  setImageSlot: (pageId: string, slotId: string, file: File) => Promise<void>;
  updateCrop: (pageId: string, slotId: string, patch: Partial<Crop>) => void;
  nudgeCrop: (pageId: string, slotId: string, dx: number, dy: number) => void;
  scaleCropBy: (pageId: string, slotId: string, factor: number) => void;
}

/** 号が参照する全assetId */
export function assetIdsOf(issue: Issue): string[] {
  return issue.pages.flatMap((p) =>
    Object.values(p.slots).flatMap((s) => (s.type === 'image' ? [s.assetId] : [])),
  );
}

// ---- 自動保存(1秒デバウンス、要件6章) ----
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingIssue: Issue | null = null;

function scheduleSave(issue: Issue) {
  pendingIssue = issue;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flushSave(), APP_CONFIG.autosaveDebounceMs);
}

async function flushSave() {
  clearTimeout(saveTimer);
  const issue = pendingIssue;
  pendingIssue = null;
  if (issue) await db.issues.put(issue);
}

function newPage(templateId: TemplateId, order: number): Page {
  const tpl = getTemplate(templateId);
  return {
    id: uid(),
    templateId,
    order,
    prBadge: false,
    slots: createEmptySlots(tpl.slots),
  };
}

const reorder = (pages: Page[]): Page[] => pages.map((p, i) => ({ ...p, order: i + 1 }));

let toastTimer: ReturnType<typeof setTimeout> | undefined;

let initOnce: Promise<void> | null = null;

export const useEditor = create<EditorStore>()((set, get) => {
  const currentIssue = (): Issue | null =>
    get().issues?.find((i) => i.id === get().currentIssueId) ?? null;

  /** 未ロードのassetをDBから読んでobjectURL化する */
  const ensureAssets = async (assetIds: string[]) => {
    const missing = [...new Set(assetIds)].filter((id) => !get().assets[id]);
    if (missing.length === 0) return;
    const loaded: Record<string, AssetInfo> = {};
    for (const asset of await db.assets.bulkGet(missing)) {
      if (asset) {
        loaded[asset.id] = {
          url: URL.createObjectURL(asset.blob),
          width: asset.width,
          height: asset.height,
        };
      }
    }
    set((s) => ({ assets: { ...s.assets, ...loaded } }));
  };

  /** 全号を横断して参照されないassetを削除する */
  const gcAssets = async (candidateIds: string[]) => {
    const issues = get().issues ?? [];
    const referenced = new Set(issues.flatMap(assetIdsOf));
    const orphans = [...new Set(candidateIds)].filter((id) => !referenced.has(id));
    if (orphans.length === 0) return;
    const assets = { ...get().assets };
    for (const id of orphans) {
      if (assets[id]) {
        URL.revokeObjectURL(assets[id].url);
        delete assets[id];
      }
    }
    set({ assets });
    await db.assets.bulkDelete(orphans);
  };

  /** 現在の号を更新してupdatedAtを進め、自動保存を予約する */
  const commit = (updater: (issue: Issue) => Issue) => {
    const cur = currentIssue();
    if (!cur) return;
    const next = { ...updater(cur), updatedAt: new Date().toISOString() };
    set((s) => ({ issues: (s.issues ?? []).map((i) => (i.id === next.id ? next : i)) }));
    scheduleSave(next);
  };

  const commitPage = (pageId: string, updater: (page: Page) => Page) =>
    commit((issue) => ({
      ...issue,
      pages: issue.pages.map((p) => (p.id === pageId ? updater(p) : p)),
    }));

  const setSlot = (pageId: string, slotId: string, value: SlotValue) =>
    commitPage(pageId, (p) => ({ ...p, slots: { ...p.slots, [slotId]: value } }));

  const commitCrop = (pageId: string, slotId: string, updater: (crop: Crop) => Crop) => {
    const page = currentIssue()?.pages.find((p) => p.id === pageId);
    if (!page) return;
    const slot = page.slots[slotId];
    const def = getTemplate(page.templateId).slots.find((s) => s.id === slotId) as
      | ImageSlotDef
      | undefined;
    if (slot?.type !== 'image' || def?.type !== 'image') return;
    const asset = get().assets[slot.assetId];
    if (!asset) return;
    const next = clampCrop(def.frame.width, def.frame.height, asset.width, asset.height, updater(slot.crop));
    setSlot(pageId, slotId, { ...slot, crop: next });
  };

  return {
    issues: null,
    currentIssueId: null,
    view: 'library',
    activePageId: null,
    assets: {},
    mobileTab: 'edit',
    exporting: false,
    guide: 'off',
    updateReady: false,
    applyUpdate: null,
    toast: null,
    debugImage: null,

    setDebugImage: (debugImage) => set({ debugImage }),

    showToast: (message) => {
      set({ toast: message });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => set({ toast: null }), 3200);
    },

    init: () =>
      (initOnce ??= get()
        .initInner()
        .catch((err: unknown) => {
          initOnce = null; // 失敗時は再試行できるようにする
          throw err;
        })),

    initInner: () => (async () => {
      // IndexedDBの永続化許可を要求(要件9章)。結果に依存しない
      void navigator.storage?.persist?.().catch(() => {});

      const issues = await db.issues.orderBy('updatedAt').reverse().toArray();

      if (issues.length === 0) {
        // 初回起動: Vol.1を作ってそのままページ編集へ
        const now = new Date().toISOString();
        const issue: Issue = {
          id: uid(),
          vol: 1,
          theme: '',
          createdAt: now,
          updatedAt: now,
          pages: [newPage('cover', 1)],
        };
        await db.issues.put(issue);
        set({
          issues: [issue],
          currentIssueId: issue.id,
          activePageId: issue.pages[0].id,
          view: 'page',
        });
      } else {
        // ライブラリのサムネイル用に1ページ目のassetをロード
        set({ issues, view: 'library' });
        await ensureAssets(issues.flatMap((i) => (i.pages[0] ? assetIdsOf({ ...i, pages: [i.pages[0]] }) : [])));
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void flushSave();
      });
    })(),

    openLibrary: () => {
      void flushSave();
      set({ view: 'library', guide: 'off' });
      const issues = get().issues ?? [];
      void ensureAssets(
        issues.flatMap((i) => (i.pages[0] ? assetIdsOf({ ...i, pages: [i.pages[0]] }) : [])),
      );
    },

    openIssue: async (issueId) => {
      const issue = get().issues?.find((i) => i.id === issueId);
      if (!issue) return;
      set({ currentIssueId: issueId, view: 'issue' });
      await ensureAssets(assetIdsOf(issue));
    },

    openPage: (pageId) => set({ activePageId: pageId, view: 'page', mobileTab: 'edit' }),
    setActivePage: (pageId) => set({ activePageId: pageId }),
    setMobileTab: (mobileTab) => set({ mobileTab }),
    setExporting: (exporting) => set({ exporting }),
    setGuide: (guide) => set({ guide }),
    notifyUpdateReady: (apply) => set({ updateReady: true, applyUpdate: apply }),

    createIssue: async () => {
      const issues = get().issues ?? [];
      const now = new Date().toISOString();
      const issue: Issue = {
        id: uid(),
        vol: Math.max(0, ...issues.map((i) => i.vol)) + 1,
        theme: '',
        createdAt: now,
        updatedAt: now,
        pages: [newPage('cover', 1)],
      };
      await db.issues.put(issue);
      set((s) => ({
        issues: [issue, ...(s.issues ?? [])],
        currentIssueId: issue.id,
        activePageId: issue.pages[0].id,
        view: 'page',
      }));
    },

    duplicateIssue: async (issueId) => {
      const src = get().issues?.find((i) => i.id === issueId);
      if (!src) return;
      const now = new Date().toISOString();
      const copy: Issue = {
        ...structuredClone(src),
        id: uid(),
        vol: Math.max(0, ...(get().issues ?? []).map((i) => i.vol)) + 1,
        createdAt: now,
        updatedAt: now,
        pages: src.pages.map((p) => ({ ...structuredClone(p), id: uid() })),
      };
      await db.issues.put(copy);
      set((s) => ({ issues: [copy, ...(s.issues ?? [])] }));
    },

    deleteIssue: async (issueId) => {
      const target = get().issues?.find((i) => i.id === issueId);
      if (!target) return;
      const ids = assetIdsOf(target);
      set((s) => ({
        issues: (s.issues ?? []).filter((i) => i.id !== issueId),
        currentIssueId: s.currentIssueId === issueId ? null : s.currentIssueId,
      }));
      await db.issues.delete(issueId);
      await gcAssets(ids);
    },

    importIssue: async (issue) => {
      await db.issues.put(issue);
      set((s) => ({ issues: [issue, ...(s.issues ?? [])] }));
      await ensureAssets(assetIdsOf(issue));
    },

    updateIssueMeta: (patch) => commit((issue) => ({ ...issue, ...patch })),

    addPage: (templateId) => {
      const issue = currentIssue();
      if (!issue || issue.pages.length >= APP_CONFIG.maxPages) return;
      const page = newPage(templateId, issue.pages.length + 1);
      commit((i) => ({ ...i, pages: reorder([...i.pages, page]) }));
      set({ activePageId: page.id, view: 'page', mobileTab: 'edit' });
    },

    duplicatePage: (pageId) => {
      const issue = currentIssue();
      if (!issue || issue.pages.length >= APP_CONFIG.maxPages) return;
      const idx = issue.pages.findIndex((p) => p.id === pageId);
      if (idx < 0) return;
      const copy: Page = { ...structuredClone(issue.pages[idx]), id: uid() };
      commit((i) => {
        const pages = [...i.pages];
        pages.splice(idx + 1, 0, copy);
        return { ...i, pages: reorder(pages) };
      });
    },

    deletePage: (pageId) => {
      const issue = currentIssue();
      if (!issue || issue.pages.length <= 1) return;
      const target = issue.pages.find((p) => p.id === pageId);
      if (!target) return;
      const ids = Object.values(target.slots).flatMap((s) => (s.type === 'image' ? [s.assetId] : []));
      commit((i) => ({ ...i, pages: reorder(i.pages.filter((p) => p.id !== pageId)) }));
      if (get().activePageId === pageId) {
        set({ activePageId: currentIssue()?.pages[0]?.id ?? null });
      }
      void flushSave().then(() => gcAssets(ids));
    },

    movePage: (pageId, dir) => {
      const issue = currentIssue();
      if (!issue) return;
      const idx = issue.pages.findIndex((p) => p.id === pageId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= issue.pages.length) return;
      commit((i) => {
        const pages = [...i.pages];
        const [moved] = pages.splice(idx, 1);
        pages.splice(to, 0, moved);
        return { ...i, pages: reorder(pages) };
      });
    },

    setPrBadge: (pageId, on) => commitPage(pageId, (p) => ({ ...p, prBadge: on })),

    setTextSlot: (pageId, slotId, value) => setSlot(pageId, slotId, { type: 'text', value }),
    setListSlot: (pageId, slotId, items) => setSlot(pageId, slotId, { type: 'list', items }),
    setKvSlot: (pageId, slotId, items) => setSlot(pageId, slotId, { type: 'kv', items }),

    setImageSlot: async (pageId, slotId, file) => {
      const { blob, width, height } = await processImageFile(file);
      const asset = { id: uid(), blob, fileName: file.name, width, height };
      await db.assets.put(asset);

      const url = URL.createObjectURL(blob);
      set((s) => ({ assets: { ...s.assets, [asset.id]: { url, width, height } } }));

      const prev = currentIssue()?.pages.find((p) => p.id === pageId)?.slots[slotId];
      const prevAssetId = prev?.type === 'image' ? prev.assetId : null;

      setSlot(pageId, slotId, { type: 'image', assetId: asset.id, crop: { x: 0, y: 0, scale: 1 } });

      if (prevAssetId) {
        await flushSave();
        await gcAssets([prevAssetId]);
      }
    },

    updateCrop: (pageId, slotId, patch) =>
      commitCrop(pageId, slotId, (crop) => ({ ...crop, ...patch })),

    nudgeCrop: (pageId, slotId, dx, dy) =>
      commitCrop(pageId, slotId, (crop) => ({ ...crop, x: crop.x + dx, y: crop.y + dy })),

    scaleCropBy: (pageId, slotId, factor) =>
      commitCrop(pageId, slotId, (crop) => ({ ...crop, scale: crop.scale * factor })),
  };
});

/** 現在編集中の号を返すセレクタ */
export const selectCurrentIssue = (s: { issues: Issue[] | null; currentIssueId: string | null }) =>
  s.issues?.find((i) => i.id === s.currentIssueId) ?? null;

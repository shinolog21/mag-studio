// アプリ全体の設定値。要件11章「仮置きの前提」はすべてここに集約し、後から変更できるようにする。

export const APP_CONFIG = {
  /** メディア名ロゴ(仮)。設定画面からの変更は後続フェーズ */
  mediaName: 'SHINO MAGAZINE',
  /** 号数表記の接頭ラベル(仮)。例: GADGET REVIEW — VOL.3 */
  issueLabel: 'GADGET REVIEW',

  canvas: {
    width: 1080,
    height: 1350,
    /** 内側余白(仮) */
    margin: 48,
  },

  colors: {
    /** 生成紙風の背景(仮) */
    paper: '#F6F4EF',
    /** 墨色文字 */
    ink: '#1A1A18',
    /** 補助テキスト用のやわらかい墨 */
    inkSoft: '#57534C',
    /** 写真プレースホルダ */
    photoPlaceholder: '#E6E2D8',
  },

  fonts: {
    /** 見出し用明朝(同梱) */
    serif: "'Shippori Mincho B1', serif",
    /** 本文・キャプション用ゴシック(同梱) */
    sans: "'Zen Kaku Gothic New', sans-serif",
  },

  /** 本文系テキストの下限(1080px幅基準)。これ未満の設定を作らない */
  minBodyFontPx: 28,

  /** 号あたりのページ上限(決定値) */
  maxPages: 4,

  /** 書き出し: マスター1080×1350 × 2 = 2160×2700 */
  exportPixelRatio: 2,

  /** 画像取り込み時の長辺上限(容量対策) */
  assetMaxEdge: 2400,

  /** 自動保存のデバウンス(ms) */
  autosaveDebounceMs: 1000,
} as const;

import { selectCurrentIssue, useEditor } from '../store';

/**
 * 検証用デモデータの自動投入(?seed=1)。
 * 表紙+エッセイ+スペックの3ページ構成の号を作り、書き出し品質検証
 * (縦書き・フォント・トリミング・全テンプレート)を手入力なしで再現できるようにする。
 */
export async function seedDemoData(): Promise<void> {
  const store = useEditor.getState();
  if (!store.issues) return;

  // 既にデモ号(画像込みで正常に作られたもの)があればそれを開くだけ(再実行しても増殖しない)
  const existing = store.issues.find(
    (i) =>
      i.theme === 'ワイヤレスイヤホン特集' &&
      i.pages.length >= 3 &&
      Object.values(i.pages[0].slots).some((s) => s.type === 'image'),
  );
  if (existing) {
    await store.openIssue(existing.id);
    store.openPage(existing.pages[0].id);
    return;
  }

  // 新しい号(表紙1ページ)を作ってデモデータを流し込む
  await store.createIssue();
  const issue = selectCurrentIssue(useEditor.getState());
  if (!issue) return;
  const p1 = issue.pages[0];

  const s = useEditor.getState();
  s.updateIssueMeta({ theme: 'ワイヤレスイヤホン特集', publishedAt: '2026-07-22' });

  const photo = await makeDemoPhoto();

  // P1: 表紙型(初期号の1ページ目はcover)
  if (p1?.templateId === 'cover') {
    s.setTextSlot(p1.id, 'issue_title', '良い音は、静かだ。');
    s.setTextSlot(p1.id, 'subtitle', '完全ワイヤレスの静寂性能を聴き比べる');
    s.setListSlot(p1.id, 'topics', ['通勤電車で試す', '装着感の正解', '価格帯別の答え']);
    await s.setImageSlot(p1.id, 'cover_photo', photo);
  }

  // P2: 特集エッセイ型
  s.addPage('essay');
  {
    const page = selectCurrentIssue(useEditor.getState())!.pages.at(-1)!;
    s.setTextSlot(page.id, 'headline', '静寂は、機能である。');
    s.setTextSlot(page.id, 'lead', 'ノイズキャンセリングが生まれて二十年。耳元の静けさは、いま道具の性能になった。');
    s.setTextSlot(
      page.id,
      'body',
      '電源を入れた瞬間、車内のアナウンスが一歩遠のく。残るのは自分の呼吸と、再生ボタンを押す前のわずかな静寂だけだ。' +
        '高価なイヤホンを買ったのに、いちばん気に入っているのは音楽が鳴る前の時間だという矛盾。騒がしい朝ほど、この数秒がきいてくる。' +
        '道具の進化は、音を良くする方向だけでなく、音を消す方向にも進んでいた。静けさを持ち歩く。それがこの小さな機械の本当の仕事だと思う。',
    );
    s.setTextSlot(page.id, 'caption', '雨の日の、通勤電車で。');
    s.setTextSlot(page.id, 'credit', 'photo & text: shino');
    await s.setImageSlot(page.id, 'main_photo', photo);
  }

  // P3: 商品スペック型
  s.addPage('spec');
  {
    const page = selectCurrentIssue(useEditor.getState())!.pages.at(-1)!;
    s.setTextSlot(page.id, 'brand_name', 'SILENCIA');
    s.setTextSlot(page.id, 'product_name', 'Buds Pro 3');
    s.setTextSlot(page.id, 'price', '¥29,800(税込)');
    s.setTextSlot(page.id, 'headline', '沈黙を、上書きする');
    s.setTextSlot(
      page.id,
      'comment',
      '装着して三歩歩くと、街の音量がひと目盛り下がる。強すぎない消音がむしろ心地よく、長時間つけても圧迫感がない。' +
        '通勤用の一本を選ぶなら、まずこれを試してからでも遅くない。',
    );
    s.setKvSlot(page.id, 'specs', [
      { key: '連続再生', value: '最大8時間' },
      { key: 'ケース込み', value: '最大30時間' },
      { key: '防水', value: 'IPX4' },
      { key: '重さ', value: '片耳4.8g' },
      { key: '接続', value: 'Bluetooth 5.4' },
    ]);
    await s.setImageSlot(page.id, 'product_photo', photo);
  }

  // 表紙を開いた状態に戻す
  const cover = selectCurrentIssue(useEditor.getState())!.pages[0];
  useEditor.getState().openPage(cover.id);
}

async function makeDemoPhoto(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  const grad = ctx.createLinearGradient(0, 0, 1600, 1600);
  grad.addColorStop(0, '#3E5C76');
  grad.addColorStop(0.55, '#748CAB');
  grad.addColorStop(1, '#F0EBD8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1600, 1600);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(1150, 520, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(26,26,24,0.8)';
  ctx.fillRect(240, 900, 560, 300);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 14;
  ctx.strokeRect(300, 260, 380, 260);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('toBlob failed');
  return new File([blob], 'demo.png', { type: 'image/png' });
}

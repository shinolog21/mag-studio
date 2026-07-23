import { kvOf, listOf, textOf } from '../templates/parts';
import type { Issue, Page } from '../types';

/**
 * note用テキスト書き出し(要件7章)。
 * 号内の全ページのテキストスロットを順に連結してMarkdownを生成する:
 * 特集テーマ→H1、各ページの見出し→H2、lead/body/comment→本文、スペック→表。
 */
export function buildNoteMarkdown(issue: Issue): string {
  const parts: string[] = [];
  parts.push(`# ${issue.theme || `VOL.${issue.vol}`}`);

  for (const page of issue.pages) {
    const section = renderPage(page);
    if (section) parts.push(section);
  }

  return parts.join('\n\n') + '\n';
}

function renderPage(page: Page): string | null {
  const blocks: string[] = [];

  switch (page.templateId) {
    case 'cover': {
      const title = textOf(page, 'issue_title');
      const subtitle = textOf(page, 'subtitle');
      const topics = listOf(page, 'topics');
      if (title) blocks.push(`## ${title}`);
      if (subtitle) blocks.push(subtitle);
      if (topics.length > 0) blocks.push(topics.map((t) => `- ${t}`).join('\n'));
      break;
    }
    case 'essay': {
      const headline = textOf(page, 'headline');
      const lead = textOf(page, 'lead');
      const body = textOf(page, 'body');
      if (headline) blocks.push(`## ${headline}`);
      if (lead) blocks.push(lead);
      if (body) blocks.push(body);
      break;
    }
    case 'spec': {
      const brand = textOf(page, 'brand_name');
      const product = textOf(page, 'product_name');
      const price = textOf(page, 'price');
      const headline = textOf(page, 'headline');
      const comment = textOf(page, 'comment');
      const specs = kvOf(page, 'specs');
      const productLine = [brand, product].filter(Boolean).join(' ');
      if (headline) blocks.push(`## ${headline}`);
      if (productLine || price) {
        blocks.push(['**' + productLine + '**', price].filter((s) => s && s !== '****').join(' — '));
      }
      if (comment) blocks.push(comment);
      if (specs.length > 0) {
        blocks.push(
          ['| 項目 | 内容 |', '| --- | --- |', ...specs.map((s) => `| ${s.key} | ${s.value} |`)].join('\n'),
        );
      }
      break;
    }
  }

  return blocks.length > 0 ? blocks.join('\n\n') : null;
}

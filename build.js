#!/usr/bin/env node
/**
 * 静态博客索引生成器(零依赖)。
 * 扫描 posts/ 下所有 .html,抽取元信息,生成根目录 index.html。
 *
 * 每篇文章可在 <head> 里声明(均为可选,缺省自动兜底):
 *   <meta name="date" content="2026-06-19">
 *   <meta name="summary" content="一句话摘要">
 *   <title>主标题 · 副标题</title>
 *
 * 用法:node build.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const OUT = path.join(ROOT, 'index.html');

const SITE_TITLE = 'Stephen 技术博客';
const SITE_DESC = 'AI、云平台、数据平台与工程实践笔记';

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function meta(html, name) {
  const re = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? decodeEntities(m[1].trim()) : '';
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter(f => f.toLowerCase().endsWith('.html'))
    .map(file => {
      const html = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const rawTitle = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, file])[1].trim();
      const [title, ...rest] = decodeEntities(rawTitle).split(/\s*[·|｜]\s*/);
      const subtitle = rest.join(' · ');
      let summary = meta(html, 'summary') || meta(html, 'description');
      if (!summary) {
        // 兜底:取首个 .lead 或首段纯文本
        const lead = html.match(/class=["']lead["'][^>]*>([\s\S]*?)<\/div>/i)
          || html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (lead) summary = decodeEntities(lead[1].replace(/<[^>]+>/g, '').trim()).slice(0, 120);
      }
      return {
        url: `posts/${file}`,
        title: title.trim() || file,
        subtitle: subtitle.trim(),
        summary: summary || '',
        date: meta(html, 'date'),
      };
    })
    // 有日期的按日期倒序在前,无日期的按文件名排后
    .sort((a, b) => (b.date || '0').localeCompare(a.date || '0') || a.url.localeCompare(b.url));
}

function render(posts) {
  const items = posts.map(p => `
      <li class="post">
        <a class="post-link" href="${escapeHtml(p.url)}">
          <div class="post-head">
            <span class="post-title">${escapeHtml(p.title)}</span>
            ${p.date ? `<time class="post-date">${escapeHtml(p.date)}</time>` : ''}
          </div>
          ${p.subtitle ? `<div class="post-sub">${escapeHtml(p.subtitle)}</div>` : ''}
          ${p.summary ? `<p class="post-summary">${escapeHtml(p.summary)}</p>` : ''}
        </a>
      </li>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(SITE_TITLE)}</title>
<meta name="description" content="${escapeHtml(SITE_DESC)}">
<style>
  :root{--ink:#1a1f26;--muted:#5b6573;--line:#e3e8ee;--accent:#2f6feb;--bg:#fff;--soft:#f6f8fa}
  *{box-sizing:border-box}
  body{margin:0;background:var(--soft);color:var(--ink);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
  .wrap{max-width:760px;margin:0 auto;padding:64px 24px 96px}
  header{margin-bottom:36px}
  h1{font-size:30px;margin:0 0 8px}
  .tagline{color:var(--muted);margin:0;font-size:15px}
  ul.posts{list-style:none;margin:0;padding:0}
  .post{margin:0 0 14px}
  .post-link{display:block;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:20px 22px;text-decoration:none;color:inherit;transition:border-color .15s,box-shadow .15s,transform .15s}
  .post-link:hover{border-color:var(--accent);box-shadow:0 4px 18px rgba(47,111,235,.10);transform:translateY(-1px)}
  .post-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
  .post-title{font-size:19px;font-weight:650;color:var(--ink)}
  .post-date{flex:none;color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
  .post-sub{color:var(--accent);font-size:13.5px;margin-top:3px}
  .post-summary{color:var(--muted);font-size:14.5px;margin:8px 0 0}
  .empty{color:var(--muted);background:var(--bg);border:1px dashed var(--line);border-radius:12px;padding:28px;text-align:center}
  footer{margin-top:48px;color:var(--muted);font-size:13px;text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${escapeHtml(SITE_TITLE)}</h1>
    <p class="tagline">${escapeHtml(SITE_DESC)}</p>
  </header>
  ${posts.length
    ? `<ul class="posts">${items}\n  </ul>`
    : `<div class="empty">还没有文章。在 <code>posts/</code> 里放入 .html 后重新构建即可。</div>`}
  <footer>共 ${posts.length} 篇 · 由 build.js 自动生成</footer>
</div>
</body>
</html>
`;
}

const posts = readPosts();
fs.writeFileSync(OUT, render(posts), 'utf8');
console.log(`✓ 生成 index.html,收录 ${posts.length} 篇文章`);
posts.forEach(p => console.log(`  - ${p.date || '        '}  ${p.title}  (${p.url})`));

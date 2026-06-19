#!/usr/bin/env node
/**
 * 静态博客索引生成器(零依赖)。
 * 扫描 posts/ 下所有 .html,抽取元信息,生成根目录 index.html。
 *
 * 分类 = posts/ 下的子文件夹名(直接放 posts/ 根目录的归「未分类」)。
 * 每篇文章可在 <head> 里声明(均为可选,缺省自动兜底):
 *   <meta name="date" content="2026-06-19">
 *   <meta name="tags" content="AI, 工作流, superpowers">
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
const SITE_DESC = 'AI和数据平台的工程实践';
const UNCATEGORIZED = '未分类';

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
function splitList(s) {
  return s.split(/[,，、]/).map(x => x.trim()).filter(Boolean);
}

// 递归收集 posts/ 下所有 .html,返回 { abs, rel } (rel 用 / 分隔)
function walk(dir, base) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else if (name.toLowerCase().endsWith('.html')) out.push({ abs, rel });
  }
  return out;
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return walk(POSTS_DIR, '')
    .map(({ abs, rel }) => {
      const html = fs.readFileSync(abs, 'utf8');
      const rawTitle = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, rel])[1].trim();
      const [title, ...rest] = decodeEntities(rawTitle).split(/\s*[·|｜]\s*/);
      const subtitle = rest.join(' · ');
      let summary = meta(html, 'summary') || meta(html, 'description');
      if (!summary) {
        const lead = html.match(/class=["']lead["'][^>]*>([\s\S]*?)<\/div>/i)
          || html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (lead) summary = decodeEntities(lead[1].replace(/<[^>]+>/g, '').trim()).slice(0, 120);
      }
      // 分类 = posts/ 下的第一层子文件夹名;根目录直放的归「未分类」
      const segs = rel.split('/');
      const category = segs.length > 1 ? segs[0] : UNCATEGORIZED;
      return {
        rel,
        url: `posts/${rel.split('/').map(encodeURIComponent).join('/')}`,
        title: title.trim() || segs[segs.length - 1],
        subtitle: subtitle.trim(),
        summary: summary || '',
        date: meta(html, 'date'),
        category,
        tags: splitList(meta(html, 'tags')),
      };
    })
    .sort((a, b) => (b.date || '0').localeCompare(a.date || '0') || a.url.localeCompare(b.url));
}

function tally(posts, pick) {
  const map = new Map();
  posts.forEach(p => pick(p).forEach(v => map.set(v, (map.get(v) || 0) + 1)));
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function render(posts) {
  const categories = tally(posts, p => [p.category]);
  const tags = tally(posts, p => p.tags);

  const cards = posts.map(p => `
        <li class="post" data-category="${escapeHtml(p.category)}" data-tags="${escapeHtml(p.tags.join('|'))}">
          <a class="post-link" href="${escapeHtml(p.url)}">
            <div class="post-head">
              <span class="post-title">${escapeHtml(p.title)}</span>
              ${p.date ? `<time class="post-date">${escapeHtml(p.date)}</time>` : ''}
            </div>
            ${p.subtitle ? `<div class="post-sub">${escapeHtml(p.subtitle)}</div>` : ''}
            ${p.summary ? `<p class="post-summary">${escapeHtml(p.summary)}</p>` : ''}
            <div class="post-meta">
              <span class="cat-badge">${escapeHtml(p.category)}</span>
              ${p.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
            </div>
          </a>
        </li>`).join('');

  const catList = `
        <button class="filter active" data-type="all">全部 <em>${posts.length}</em></button>
        ${categories.map(([c, n]) =>
          `<button class="filter" data-type="category" data-value="${escapeHtml(c)}">${escapeHtml(c)} <em>${n}</em></button>`
        ).join('\n        ')}`;

  const tagList = tags.length
    ? tags.map(([t, n]) =>
        `<button class="filter tag-filter" data-type="tag" data-value="${escapeHtml(t)}">#${escapeHtml(t)} <em>${n}</em></button>`
      ).join('\n        ')
    : '<span class="muted">暂无标签</span>';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(SITE_TITLE)}</title>
<meta name="description" content="${escapeHtml(SITE_DESC)}">
<style>
  :root{--ink:#1a1f26;--muted:#6b7480;--line:#e6eaef;--accent:#2f6feb;--bg:#fff;--soft:#f5f7fa;--soft2:#eef1f5}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--soft);color:var(--ink);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
  a{color:inherit}
  .site-header{position:sticky;top:0;z-index:100;background:var(--bg);border-bottom:1px solid var(--line)}
  .site-header .inner{max-width:1040px;margin:0 auto;padding:22px 24px;display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}
  .brand{font-size:22px;font-weight:700;letter-spacing:.2px}
  .brand a{text-decoration:none}
  .tagline{color:var(--muted);font-size:14px;margin:0}
  .layout{max-width:1040px;margin:0 auto;padding:32px 24px 80px;display:grid;grid-template-columns:248px 1fr;gap:36px}
  .main{min-width:0}
  .list-title{display:flex;align-items:baseline;gap:10px;margin:0 0 18px}
  .list-title h2{font-size:17px;margin:0}
  #count{color:var(--muted);font-size:13px}
  ul.posts{list-style:none;margin:0;padding:0}
  .post{margin:0 0 14px}
  .post-link{display:block;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:20px 22px;text-decoration:none;color:inherit;transition:border-color .15s,box-shadow .15s,transform .15s}
  .post-link:hover{border-color:var(--accent);box-shadow:0 6px 22px rgba(47,111,235,.10);transform:translateY(-1px)}
  .post-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
  .post-title{font-size:19px;font-weight:650}
  .post-date{flex:none;color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
  .post-sub{color:var(--accent);font-size:13.5px;margin-top:3px}
  .post-summary{color:var(--muted);font-size:14.5px;margin:8px 0 12px}
  .post-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
  .cat-badge{background:#eaf1fe;color:var(--accent);font-size:12px;font-weight:600;border-radius:6px;padding:2px 9px}
  .tag{color:var(--muted);font-size:12.5px}
  .post.hidden{display:none}
  .empty{color:var(--muted);background:var(--bg);border:1px dashed var(--line);border-radius:12px;padding:28px;text-align:center}
  aside{align-self:start;position:sticky;top:88px}
  .widget{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px 16px 18px;margin-bottom:18px}
  .widget h3{font-size:13px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
  .filters{display:flex;flex-direction:column;gap:4px}
  .tags-wrap{display:flex;flex-wrap:wrap;gap:7px}
  .filter{font:inherit;font-size:14px;text-align:left;background:transparent;border:0;border-radius:8px;padding:7px 10px;color:var(--ink);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;transition:background .12s,color .12s}
  .filter em{font-style:normal;color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
  .filter:hover{background:var(--soft2)}
  .filter.active{background:var(--accent);color:#fff}
  .filter.active em{color:rgba(255,255,255,.8)}
  .tag-filter{background:var(--soft);border-radius:999px;padding:5px 11px}
  .tag-filter.active{background:var(--accent)}
  .muted{color:var(--muted);font-size:13px}
  footer{max-width:1040px;margin:0 auto;padding:0 24px 48px;color:var(--muted);font-size:13px;text-align:center}
  @media(max-width:820px){
    .layout{grid-template-columns:1fr;gap:24px}
    aside{position:static;order:2}
    .main{order:1}
  }
</style>
</head>
<body>
  <header class="site-header">
    <div class="inner">
      <div class="brand"><a href="./">${escapeHtml(SITE_TITLE)}</a></div>
      <p class="tagline">${escapeHtml(SITE_DESC)}</p>
    </div>
  </header>

  <div class="layout">
    <aside>
      <div class="widget">
        <h3>分类</h3>
        <div class="filters">${catList}
        </div>
      </div>
      <div class="widget">
        <h3>标签</h3>
        <div class="tags-wrap">${tagList}
        </div>
      </div>
    </aside>

    <main class="main">
      <div class="list-title">
        <h2 id="heading">全部文章</h2>
        <span id="count">${posts.length} 篇</span>
      </div>
      ${posts.length
        ? `<ul class="posts">${cards}\n      </ul>\n      <div class="empty" id="noresult" style="display:none">没有匹配的文章</div>`
        : `<div class="empty">还没有文章。在 <code>posts/</code> 里建子文件夹(=分类)再放入 .html,重新构建即可。</div>`}
    </main>
  </div>

  <footer>共 ${posts.length} 篇 · 由 build.js 自动生成</footer>

<script>
(function(){
  var posts = [].slice.call(document.querySelectorAll('.post'));
  var filters = [].slice.call(document.querySelectorAll('.filter'));
  var count = document.getElementById('count');
  var heading = document.getElementById('heading');
  var noresult = document.getElementById('noresult');

  function apply(type, value){
    var shown = 0;
    posts.forEach(function(p){
      var ok = type === 'all'
        || (type === 'category' && p.dataset.category === value)
        || (type === 'tag' && p.dataset.tags.split('|').indexOf(value) !== -1);
      p.classList.toggle('hidden', !ok);
      if(ok) shown++;
    });
    count.textContent = shown + ' 篇';
    heading.textContent = type === 'all' ? '全部文章'
      : (type === 'category' ? '分类:' + value : '标签:#' + value);
    if(noresult) noresult.style.display = shown ? 'none' : 'block';
  }

  filters.forEach(function(btn){
    btn.addEventListener('click', function(){
      filters.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      apply(btn.dataset.type, btn.dataset.value);
    });
  });

  // 支持从文章页通过 #cat=分类名 或 #tag=标签 进来时自动筛选
  function fromHash(){
    var m = location.hash.match(/(cat|tag)=([^&]+)/);
    if(!m) return;
    var type = m[1] === 'cat' ? 'category' : 'tag';
    var v = decodeURIComponent(m[2]);
    var btn = filters.filter(function(b){
      return b.dataset.type === type && b.dataset.value === v;
    })[0];
    if(btn) btn.click();
  }
  fromHash();
  window.addEventListener('hashchange', fromHash);
})();
</script>
</body>
</html>
`;
}

// 往每篇文章注入与首页一致的框架:顶部站点头 + 左侧 分类/标签 卡片 + 右侧内容。
// 用注释标记包裹,幂等可重复构建。下方三个正则用于清除历史注入。
const OLD_RE = /\n?<!--SITE-HEADER:START-->[\s\S]*?<!--SITE-HEADER:END-->\n?/g;
const OPEN_RE = /\n?<!--SITE-NAV:START-->[\s\S]*?<!--SITE-NAV:END-->\n?/g;
const CLOSE_RE = /\n?<!--SITE-NAV:CLOSE-->[\s\S]*?<!--SITE-NAV:CLOSE-END-->\n?/g;

function navOpen(rel, categories, tags, currentCat, total) {
  const root = '../'.repeat(rel.split('/').length);
  const cats = [`<a class="sb-filter${currentCat ? '' : ' active'}" href="${root}index.html">全部 <em>${total}</em></a>`]
    .concat(categories.map(([c, n]) =>
      `<a class="sb-filter${c === currentCat ? ' active' : ''}" href="${root}index.html#cat=${encodeURIComponent(c)}">${escapeHtml(c)} <em>${n}</em></a>`))
    .join('\n');
  const tagChips = tags.length
    ? tags.map(([t, n]) =>
        `<a class="sb-tagchip" href="${root}index.html#tag=${encodeURIComponent(t)}">#${escapeHtml(t)} <em>${n}</em></a>`).join('\n')
    : '<span class="sb-muted">暂无标签</span>';
  return `<!--SITE-NAV:START-->
<style>
.sb-header{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e6eaef}
.sb-hd{max-width:1040px;margin:0 auto;padding:22px 24px;display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}
.sb-brand{font-size:22px;font-weight:700;color:#1a1f26;text-decoration:none}
.sb-tagline{color:#6b7480;font-size:14px;margin:0}
.sb-layout{max-width:1040px;margin:0 auto;padding:32px 24px 80px;display:grid;grid-template-columns:248px 1fr;gap:36px;align-items:start}
.sb-aside{position:sticky;top:88px}
.sb-back{display:inline-flex;align-items:center;gap:6px;color:#6b7480;text-decoration:none;font-size:14px;margin:0 0 14px;transition:color .12s}
.sb-back:hover{color:#2f6feb}
.sb-widget{background:#fff;border:1px solid #e6eaef;border-radius:12px;padding:16px 16px 18px;margin-bottom:18px}
.sb-widget h3{font-size:13px;letter-spacing:.5px;text-transform:uppercase;color:#6b7480;margin:0 0 12px;border:0;padding:0}
.sb-filters{display:flex;flex-direction:column;gap:4px}
.sb-filter{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px;text-decoration:none;color:#1a1f26;border-radius:8px;padding:7px 10px;transition:background .12s,color .12s}
.sb-filter em{font-style:normal;color:#6b7480;font-size:12px}
.sb-filter:hover{background:#eef1f5}
.sb-filter.active{background:#2f6feb;color:#fff}
.sb-filter.active em{color:rgba(255,255,255,.8)}
.sb-tags{display:flex;flex-wrap:wrap;gap:7px}
.sb-tagchip{display:inline-flex;align-items:center;gap:5px;background:#f5f7fa;border-radius:999px;padding:5px 11px;font-size:13px;text-decoration:none;color:#1a1f26;transition:background .12s}
.sb-tagchip em{font-style:normal;color:#6b7480;font-size:12px}
.sb-tagchip:hover{background:#e6eaef}
.sb-muted{color:#6b7480;font-size:13px}
.sb-main{min-width:0}
.sb-main .wrap{max-width:none;margin:0;box-shadow:none;border:1px solid #e6eaef;border-radius:12px;padding:32px 36px}
@media(max-width:860px){.sb-layout{grid-template-columns:1fr;gap:24px}.sb-aside{position:static}}
</style>
<header class="sb-header"><div class="sb-hd">
<a class="sb-brand" href="${root}index.html">${escapeHtml(SITE_TITLE)}</a>
<p class="sb-tagline">${escapeHtml(SITE_DESC)}</p>
</div></header>
<div class="sb-layout">
<aside class="sb-aside">
<div class="sb-widget"><h3>分类</h3><div class="sb-filters">
${cats}
</div></div>
<div class="sb-widget"><h3>标签</h3><div class="sb-tags">
${tagChips}
</div></div>
</aside>
<main class="sb-main">
<a class="sb-back" href="${root}index.html">← 返回文章列表</a>
<!--SITE-NAV:END-->`;
}
const NAV_CLOSE = `<!--SITE-NAV:CLOSE-->
</main></div>
<!--SITE-NAV:CLOSE-END-->`;

function injectHeaders(posts, categories, tags) {
  const total = posts.length;
  for (const p of posts) {
    const abs = path.join(POSTS_DIR, p.rel);
    let html = fs.readFileSync(abs, 'utf8')
      .replace(OLD_RE, '').replace(OPEN_RE, '').replace(CLOSE_RE, '');
    const open = navOpen(p.rel, categories, tags, p.category, total);
    if (/<body[^>]*>/i.test(html)) {
      html = html.replace(/(<body[^>]*>)/i, `$1\n${open}`);
    } else {
      html = open + '\n' + html;
    }
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${NAV_CLOSE}\n</body>`);
    } else {
      html = html + '\n' + NAV_CLOSE;
    }
    fs.writeFileSync(abs, html, 'utf8');
  }
}

const posts = readPosts();
const categories = tally(posts, p => [p.category]);
const tags = tally(posts, p => p.tags);
fs.writeFileSync(OUT, render(posts), 'utf8');
injectHeaders(posts, categories, tags);
console.log(`✓ 生成 index.html,收录 ${posts.length} 篇文章;已注入站点导航`);
posts.forEach(p => console.log(`  - ${p.date || '        '}  [${p.category}]  ${p.title}`));

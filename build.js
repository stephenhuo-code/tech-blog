#!/usr/bin/env node
/**
 * 静态博客构建器。把 posts/ 下的 .html 与 .md 编译成完整站点,
 * 输出到 dist/(只含站点产物,不含 node_modules,供 Cloudflare 部署)。
 *
 * - 分类 = posts/ 下的子文件夹名(直接放根目录的归「未分类」)。
 * - .md 默认渲染成文章页;frontmatter 标 `attachment: true` 的只作可下载附件。
 * - 每篇文章会被注入与首页一致的站点框架(顶栏 + 分类/标签侧栏 + 返回链接)。
 *   注入只发生在 dist,源文件保持干净。
 * - 文章元信息(均可选,缺省自动兜底):
 *     <meta name="date" content="2026-06-19">
 *     <meta name="tags" content="AI, 工作流, superpowers">
 *     <meta name="summary" content="一句话摘要">
 *     <title>主标题 · 副标题</title>
 *
 * 用法:node build.js   →   产物在 dist/
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const DIST = path.join(ROOT, 'dist');   // 构建产物输出目录(只含站点,不含 node_modules)

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

// ---- Markdown 编译 ----------------------------------------------------------
// 解析可选的 YAML 风格 frontmatter(--- ... ---),返回 { data, body }。
function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  m[1].split(/\r?\n/).forEach(line => {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return { data, body: src.slice(m[0].length) };
}

// 把一篇 markdown 渲染成与站点一致的独立文章页(写到同名 .html)。
function mdToHtmlPage(rel, src) {
  const { data, body } = parseFrontmatter(src);
  const contentHtml = marked.parse(body);
  const title = data.title
    || (body.match(/^#\s+(.+?)\s*$/m) || [, path.basename(rel, '.md')])[1].trim();
  const metaTags = [
    data.date && `<meta name="date" content="${escapeHtml(data.date)}">`,
    data.tags && `<meta name="tags" content="${escapeHtml(data.tags)}">`,
    data.summary && `<meta name="summary" content="${escapeHtml(data.summary)}">`,
  ].filter(Boolean).join('\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- generated-from-md: ${escapeHtml(rel)} · 请勿手改,改源 .md 后重新 build -->
${metaTags}
<title>${escapeHtml(title)}</title>
<style>
  body{margin:0;background:#f5f7fa;color:#1a1f26;font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
  .md h1{font-size:28px;line-height:1.3;margin:0 0 14px}
  .md h2{font-size:21px;margin:34px 0 12px;padding-top:14px;border-top:1px solid #e3e8ee}
  .md h3{font-size:16px;margin:22px 0 8px}
  .md p{margin:12px 0}
  .md a{color:#2f6feb}
  .md code{background:#f6f8fa;border:1px solid #e3e8ee;border-radius:4px;padding:1px 5px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  .md pre{background:#0f1620;color:#d6e2f0;border-radius:8px;padding:16px 18px;overflow:auto;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  .md pre code{background:none;border:0;color:inherit;padding:0}
  .md blockquote{margin:16px 0;padding:10px 16px;border-left:4px solid #2f6feb;background:#eef3ff;border-radius:0 8px 8px 0;color:#33415a}
  .md blockquote p{margin:6px 0}
  .md table{border-collapse:collapse;width:100%;margin:14px 0;font-size:14.5px;display:block;overflow:auto}
  .md th,.md td{border:1px solid #e3e8ee;padding:8px 11px;text-align:left;vertical-align:top}
  .md th{background:#f6f8fa;font-weight:600}
  .md ul,.md ol{margin:12px 0;padding-left:24px}
  .md li{margin:5px 0}
  .md hr{border:0;border-top:1px solid #e3e8ee;margin:28px 0}
  .md img{max-width:100%}
</style>
</head>
<body>
<div class="wrap"><div class="md">
${contentHtml}
</div></div>
</body>
</html>
`;
}

// 递归收集 posts/ 下所有文件,返回 { abs, rel } (rel 用 / 分隔)
function walkAll(dir, base) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(abs).isDirectory()) out.push(...walkAll(abs, rel));
    else out.push({ abs, rel });
  }
  return out;
}

// 从一篇完整 HTML 文档抽取文章元信息,rel 为它在 posts/ 下的路径。
function fileToPost(rel, html) {
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
    html, // 完整文档(尚未注入导航)
  };
}

// 收集 posts/ 内容:
//   - .html → 文章(读源、去掉历史注入)
//   - .md(普通) → 渲染成文章页
//   - .md(attachment: true) / 图片等其它文件 → 原样拷贝到 dist 的资产
function gather() {
  const posts = [], assets = [];
  if (!fs.existsSync(POSTS_DIR)) return { posts, assets };
  for (const { abs, rel } of walkAll(POSTS_DIR, '')) {
    const name = path.basename(rel);
    if (name === '.DS_Store') continue;
    const lower = name.toLowerCase();
    if (lower.endsWith('.md')) {
      const src = fs.readFileSync(abs, 'utf8');
      const { data } = parseFrontmatter(src);
      if (String(data.attachment).toLowerCase() === 'true') {
        assets.push({ abs, rel });
      } else {
        posts.push(fileToPost(rel.replace(/\.md$/i, '.html'), mdToHtmlPage(rel, src)));
      }
    } else if (lower.endsWith('.html')) {
      posts.push(fileToPost(rel, stripNav(fs.readFileSync(abs, 'utf8'))));
    } else {
      assets.push({ abs, rel });
    }
  }
  posts.sort((a, b) => (b.date || '0').localeCompare(a.date || '0') || a.url.localeCompare(b.url));
  return { posts, assets };
}

// dist 写文件 / 拷贝(自动建目录)
function writeDist(rel, content) {
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
}
function copyDist(srcAbs, rel) {
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(srcAbs, dest);
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
// 去掉文档里任何历史注入的导航块(让源文件无论是否被旧版写过都能干净重建)
function stripNav(html) {
  return html.replace(OLD_RE, '').replace(OPEN_RE, '').replace(CLOSE_RE, '');
}

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

// 给一篇文章文档注入站点框架,返回最终 HTML(不写源文件,只用于 dist)。
function injectNav(post, categories, tags, total) {
  let html = post.html;
  const open = navOpen(post.rel, categories, tags, post.category, total);
  html = /<body[^>]*>/i.test(html)
    ? html.replace(/(<body[^>]*>)/i, `$1\n${open}`)
    : open + '\n' + html;
  html = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${NAV_CLOSE}\n</body>`)
    : html + '\n' + NAV_CLOSE;
  return html;
}

// ---- 构建 -------------------------------------------------------------------
const { posts, assets } = gather();
const categories = tally(posts, p => [p.category]);
const tags = tally(posts, p => p.tags);

fs.rmSync(DIST, { recursive: true, force: true });   // 干净重建
fs.mkdirSync(DIST, { recursive: true });

writeDist('index.html', render(posts));
for (const p of posts) writeDist(`posts/${p.rel}`, injectNav(p, categories, tags, posts.length));
for (const a of assets) copyDist(a.abs, `posts/${a.rel}`);

console.log(`✓ 构建到 dist/:${posts.length} 篇文章,${assets.length} 个附件/资产`);
posts.forEach(p => console.log(`  - ${p.date || '        '}  [${p.category}]  ${p.title}`));

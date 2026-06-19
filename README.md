# Stephen 技术博客

静态技术博客,文章可用 **HTML 或 Markdown** 编写,部署在 Cloudflare Pages。

## 目录结构

```text
tech-blog/
├── build.js          # 编译器:把 posts/ 编译成完整站点,输出到 dist/
├── package.json      # 依赖:marked(Markdown 渲染)
├── posts/            # 文章源(可放 .html 或 .md);源文件保持干净,不被改写
│   └── AI开发流程/
│       ├── ai-dev-workflow.html
│       └── constitution.template.md
├── dist/             # 构建产物(git 忽略;Cloudflare 部署的就是它)
└── README.md
```

> **构建产物在 `dist/`**:`build.js` 把首页、文章页(含注入的站点框架)、附件
> 都写进 `dist/`,源文件 `posts/` 保持原样。`dist/` 已被 git 忽略,由构建时重新生成。

## 分类 = 文件夹

分类由 `posts/` 下的**子文件夹名**决定,直接放 `posts/` 根目录的归「未分类」:

```text
posts/
├── AI开发流程/            # 这就是一个分类
│   └── ai-dev-workflow.html
└── 云平台/                # 新建文件夹 = 新分类,自动出现在侧栏
    └── k8s-network.html
```

## 写一篇新文章

在 `posts/` 下选(或建)一个文件夹作为分类,放入文章文件。两种格式二选一:

### 方式一:Markdown(推荐,省心)

新建 `.md`,顶部可写 frontmatter(都可选,缺省自动兜底):

```markdown
---
title: 工程宪法 · 模板
date: 2026-06-19
tags: AI, 工程纪律, ADR
summary: 一句话摘要,会显示在首页列表
---

# 正文从这里开始

支持标题、列表、表格、代码块、引用、链接……
```

> `.md` 会被 `build.js` 渲染成 `dist/` 下的文章页(套用站点样式)。源 `.md` 保持原样。

**只想当下载附件、不发布成文章?** 在 frontmatter 加 `attachment: true`:

```markdown
---
attachment: true
---
```

这样 build.js 不会编译它、也不进首页列表,原 `.md` 仅作可下载文件。
在任意文章里用带 `download` 的链接引用即可:
`<a href="xxx.md" download>下载</a>`。

### 方式二:HTML(完全自定义排版)

新建 `.html`,在 `<head>` 里加元信息(可选):

```html
<meta name="date" content="2026-06-19">
<meta name="tags" content="AI, 工作流, superpowers">
<meta name="summary" content="一句话摘要,会显示在首页列表">
<title>主标题 · 副标题</title>
```

> 标题按 `·`、`|`、`｜` 分隔,前半段作主标题、后半段作副标题。
> 构建时会给每篇文章(在 `dist/` 里)注入「站点头 + 左侧分类/标签栏 + 返回链接」。

### 本地预览 / 发布

```bash
npm install                  # 仅首次:安装 marked
node build.js                # 编译到 dist/
python3 -m http.server -d dist  # 打开 http://localhost:8000 预览(注意 -d dist)

git add . && git commit -m "docs: 新增文章 xxx" && git push  # 推送即自动部署
```

## 部署到 Cloudflare(Workers 静态资源)

本项目部署为 **Worker 静态资源站点**(不是 Pages),由仓库根的 `wrangler.jsonc`
把 `./dist` 作为静态资源发布。

Cloudflare 项目 → **Settings → Build → Build configuration**,设为:

- **Build command**:`npm install && node build.js`(否则 `dist/` 不会生成)
- **Deploy command**:`npx wrangler deploy`(默认即可)
- **Root directory**:`/`

`wrangler.jsonc` 关键字段:

```jsonc
{
  "name": "tech-blog",            // 必须与 Cloudflare 上的 Worker 名一致
  "compatibility_date": "2026-06-01",
  "assets": { "directory": "./dist" }   // 只发布 dist,不含 node_modules
}
```

> ⚠️ 之前失败是因为 Build command 为空(dist 没生成)+ 未限定资源目录,
> wrangler 把仓库根(含 `node_modules`)当资源上传,workerd 超 25 MiB。
> 指定 `assets.directory = ./dist` 后只上传干净产物。

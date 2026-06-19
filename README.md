# Stephen 技术博客

静态技术博客,文章可用 **HTML 或 Markdown** 编写,部署在 Cloudflare Pages。

## 目录结构

```text
tech-blog/
├── index.html        # 首页/文章列表(由 build.js 自动生成,勿手改)
├── build.js          # 编译器:把 posts/ 下的 .md/.html 编译成站点 + 索引
├── package.json      # 依赖:marked(Markdown 渲染)
├── posts/            # 所有文章,可放 .html 或 .md
│   └── AI开发流程/
│       ├── ai-dev-workflow.html
│       └── constitution.template.md   # .md 会编译成同名 .html
└── README.md
```

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

> `.md` 会被 `build.js` 渲染成同名 `.html`(套用站点样式)。
> 该 `.html` 是生成产物,**勿手改**,改源 `.md` 后重新 build。

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
> `build.js` 会自动给每篇文章注入「站点头 + 左侧分类/标签栏 + 返回链接」。

### 本地预览 / 发布

```bash
npm install            # 仅首次:安装 marked
node build.js          # 编译 md/html + 生成 index.html
python3 -m http.server # 打开 http://localhost:8000 预览

git add . && git commit -m "docs: 新增文章 xxx" && git push  # 推送即自动部署
```

## 部署到 Cloudflare Pages

一次性配置:

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → 连接 GitHub 仓库 `tech-blog`。
2. 构建设置:
   - **Framework preset**:`None`
   - **Build command**:`npm install && node build.js`
   - **Build output directory**:`/`(仓库根目录)
3. 保存部署。之后每次 `git push` 自动构建并发布到 `<项目名>.pages.dev`。

> Cloudflare 构建环境默认带 Node,检测到 `package.json` 会自动装依赖;
> 构建命令里 `npm install` 用于安装 marked(Markdown 渲染)。

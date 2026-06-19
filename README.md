# Stephen 技术博客

纯静态 HTML 技术博客,部署在 Cloudflare Pages。

## 目录结构

```text
tech-blog/
├── index.html        # 首页/文章列表(由 build.js 自动生成,勿手改)
├── build.js          # 索引生成器:扫描 posts/ 生成 index.html
├── posts/            # 所有文章,每篇一个独立 .html
│   └── ai-dev-workflow.html
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

1. 在 `posts/` 下选(或建)一个文件夹作为分类,放入 `.html` 文件。
2. 在 `<head>` 里加上元信息(可选,缺省会自动兜底):

   ```html
   <meta name="date" content="2026-06-19">
   <meta name="tags" content="AI, 工作流, superpowers">
   <meta name="summary" content="一句话摘要,会显示在首页列表">
   <title>主标题 · 副标题</title>
   ```

   > `build.js` 会自动往每篇文章顶部注入「站点标题栏 + 分类导航」
   > (带 `<!--SITE-HEADER-->` 标记,可重复构建不会重复注入)。

3. 本地重新生成首页并预览:

   ```bash
   node build.js          # 重新生成 index.html
   python3 -m http.server # 浏览器打开 http://localhost:8000 预览
   ```

4. 提交并推送,Cloudflare Pages 会自动重新部署:

   ```bash
   git add . && git commit -m "docs: 新增文章 xxx" && git push
   ```

> 标题按 `·`、`|`、`｜` 分隔,前半段作主标题、后半段作副标题;
> 摘要优先取 `<meta name="summary">`,缺省则取文章首个 `.lead` 或首段文字。

## 部署到 Cloudflare Pages

一次性配置:

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → 连接 GitHub 仓库 `tech-blog`。
2. 构建设置:
   - **Framework preset**:`None`
   - **Build command**:`node build.js`
   - **Build output directory**:`/`(仓库根目录)
3. 保存部署。之后每次 `git push` 自动构建并发布到 `<项目名>.pages.dev`。

> Cloudflare 构建环境默认带 Node,无需任何依赖安装。
> `build.js` 是纯标准库脚本,无 `package.json`、零依赖。

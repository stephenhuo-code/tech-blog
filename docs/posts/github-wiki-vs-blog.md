# GitHub Wiki 适合做技术博客吗？

## 1. 背景

我想把日常写的技术 blog 放在一个地方统一管理。

最开始考虑使用 GitHub Wiki，因为它简单、免费，而且支持 Markdown。

但进一步分析后发现，GitHub Wiki 更适合项目文档，不太适合作为长期技术博客主站。

## 2. 核心结论

我的结论是：

> GitHub Wiki 可以用来写项目说明，但不建议作为个人技术博客主站。

更推荐的方案是：

> GitHub Pages + MkDocs Material

## 3. GitHub Wiki 适合什么？

GitHub Wiki 更适合：

- 项目使用说明
- 安装文档
- FAQ
- 开发约定
- 简单的团队知识库

它的优点是简单，不需要额外部署。

但它的缺点也比较明显：

- 展示效果比较弱
- 分类和标签能力有限
- 不太适合长期文章管理
- 不适合做个人技术品牌主页
- 自定义能力有限

## 4. 技术博客需要什么？

一个长期技术博客通常需要：

- 清晰的目录结构
- 文章分类
- 搜索能力
- 好的阅读体验
- 独立访问地址
- 后续迁移能力
- 版本管理
- 本地预览

这些能力 GitHub Wiki 都不是特别强。

## 5. 为什么选择 MkDocs Material？

MkDocs Material 更适合技术博客和知识库混合场景。

它的优势是：

- 使用 Markdown 写作
- 支持 Git 管理
- 支持本地预览
- 支持全文搜索
- 支持代码高亮
- 支持目录导航
- 可以部署到 GitHub Pages

对于技术文章、架构笔记、产品分析、开源框架研究，都比较适合。

## 6. 我的内容组织方式

我计划把内容分成几类：

- AI Agent
- 大模型工程
- 企业 AI 搜索
- 数据湖与数据平台
- 云平台产品
- GitHub / DevOps
- 工程实践

示例目录：

```text
tech-blog/
├── docs/
│   ├── index.md
│   ├── about.md
│   └── posts/
│       └── github-wiki-vs-blog.md
└── mkdocs.yml
```

## 7. 总结

GitHub Wiki 不是不能用，而是不适合作为长期技术博客主站。

我的选择是：

> 用 GitHub 仓库管理 Markdown 内容，用 MkDocs Material 生成网站，用 GitHub Pages 发布。

这套方案简单、免费、可迁移，也适合长期积累。

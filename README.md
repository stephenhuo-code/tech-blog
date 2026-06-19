# Stephen 技术博客示例项目

这是一个基于 MkDocs Material 的个人技术博客 / 技术知识库示例。

## 目录结构

```text
tech-blog-example/
├── docs/
│   ├── index.md
│   ├── about.md
│   └── posts/
│       └── github-wiki-vs-blog.md
├── mkdocs.yml
└── README.md
```

## 本地运行

```bash
pip install mkdocs-material
mkdocs serve
```

浏览器访问：

```text
http://127.0.0.1:8000
```

## 发布到 GitHub Pages

```bash
mkdocs gh-deploy
```

## 使用方法

1. 解压本项目
2. 复制到你的 GitHub 仓库目录
3. 修改 `mkdocs.yml` 里的仓库地址
4. 执行 `mkdocs serve` 本地预览
5. 执行 `mkdocs gh-deploy` 发布

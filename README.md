# Jiang Qiao Yan · 油画作品集

可部署到 GitHub Pages 的 Astro 多页面静态网站。当前交付为 **结构与交互版本**，包含 50 个独立编号色块样本；没有代造艺术家的画作、经历或创作故事。

## 先看网站

Windows：安装 Node.js 24 LTS，解压后双击 `Preview_Windows.cmd`，打开终端显示的 `http://127.0.0.1:4321/`。此方式直接查看包内 `dist`，不需要先安装项目依赖。

不要双击 `dist/index.html` 或用附件预览器判断运行结果；多页面网站需要 HTTP 预览。

macOS / Linux：在项目目录执行 `node scripts/serve.mjs`。

## 上传到 GitHub

完整步骤见 **[DEPLOYMENT.md](DEPLOYMENT.md)**。最方便的是 GitHub Desktop：将项目文件放在仓库根目录，包含 `.github/workflows/deploy.yml`，提交并推送到 `main`；在仓库 Settings → Pages 选择 GitHub Actions。

仓库根目录应该直接出现 `package.json`、`src`、`content` 等，不要多套一层压缩包目录。不要只上传 ZIP，也不要把 `dist` 当成源码。

工作流会读取 GitHub Pages 的实际 URL，自动处理普通仓库子路径、用户主页仓库和已配置的自定义域名。默认部署为带提示的演示版，并禁止搜索引擎收录；这不是隐私保护。

## 本地开发与更新

```sh
npm ci
npm run dev
```

修改页面、CSS 可即时预览。修改 `content` 或新增图片后，停止并重新运行 `npm run dev`，重新生成对应图片与配置。线上更新由推送到 GitHub 后的构建完成。

```sh
npm run check
npm run build
npm run preview
```

Windows 也可双击 `Develop_Windows.cmd`、`Build_Windows.cmd`。

## 内容管理

见 **[CONTENT_GUIDE.md](CONTENT_GUIDE.md)**。每幅画只有一份 Markdown 资料，全部作品、详情、首页引用、前后导航和站点地图自动生成。

- `content/site.json`：艺术家介绍、联系信息、演示/正式模式、首页主视觉与精选。
- `content/artworks/`：正式作品资料。
- `assets/artworks/`：允许公开的网页处理源图；不放母版。
- `content/demo/`、`assets/demo/`：明确分离的演示样本。
- `templates/artwork.md`：复制填写的作品模板，不会自动发布。
- `src/pages/works/[slug].astro`：统一详情模板，不需要复制 50 个网页。

原始存档母版和未批准内容放在项目外。`_private/` 虽被 Git 忽略，仍不建议把母版混入交付包。

## 已实现

- 首页主视觉 1 幅 + 8 幅不同精选；总览与作品独立页面。
- 关于、联系、404；没有假联系表单。
- 统一 SVG 图标、保留完整构图、移动布局、键盘操作、减少动效、只看画作。
- 响应式 WebP 与 JPEG 回退，首屏关键图优先，其他按需加载；批准的高清细节手动加载。
- 内容校验、重复 ID/网址检查、缺图检查、首页引用检查、正式模式占位保护。
- 发布前清理、路径审计、图片清单、维护测试和 GitHub Pages 工作流。
- 真实年份或系列有多个值时才出现筛选；JS 关闭时仍有全部静态列表。

首页排版为可调整的结构参考。真实画作到齐后还需要做画质、色彩、视觉设计与首页节奏的最终确认。

## 检查与证据

```sh
npm test
npm run test:lifecycle
npx playwright install chromium firefox webkit
npm run test:browser
```

浏览器测试会自己启动仅限本机的生产产物服务器，默认 4321 端口；请先关闭其他占用该端口的预览。`TEST_ENGINES=chromium,firefox,webkit` 可选多个引擎（Windows 设置方式见测试报告）。生命周期测试仅在 `test-results/` 临时副本操作，不改正式资料。

执行结果和限制见 **[TEST_REPORT.md](TEST_REPORT.md)**、**[KNOWN_ISSUES.md](KNOWN_ISSUES.md)**；需求追踪见 **[REQUIREMENTS.md](REQUIREMENTS.md)**。

Node 24；依赖精确版本在 package.json，传递依赖由 package-lock.json 锁定。无需运行时后端、数据库或第三方 CDN。部署时只发布 `dist`。

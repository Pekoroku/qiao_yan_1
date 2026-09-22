# 测试报告 · 结构与交互版本

记录日期：2026-09-22。结构阶段的测试结果不替代正式内容与上线验收。

## 环境与范围

Linux、本地 HTTP、Node 24.19.0、Astro 7.3.3、Playwright 1.58.2；Chromium 153.0.8010.0（本机备用二进制）。测试对象为 `npm run build` 的生产静态产物，不是开发服务器。源码与浏览器观察均有记录。

浏览器标准下载在本环境失败，使用 npm 分发的 Chromium 二进制进行本地检查。Firefox、WebKit、真机 Safari/Android 均未验收；云浏览器无法访问本机地址，不作为测试证据。

## 已执行

- `npm run check`：Astro/TypeScript 检查，见 `reports/check.log`。
- `npm test`：10 项内容校验测试，见 `reports/content-tests.log`。
- `npm run build`：55 个 HTML 页面、50 件不同作品样本、首页 9 件不同作品；资源与路径审计无失败。精确结果见 `reports/build-audit.json`。
- `npm run test:lifecycle`：临时副本中验证新增 51、改名保留网址、撤下并清除页面/图片、扩展 60、0/1 件边界、合成正式模式与子路径。结果见 `reports/lifecycle-results.json`。合成数据只在被忽略的测试目录，不随网站发布。
- `npm run test:browser`：首页/总览/详情/返回位置、首尾导航、只看画作连续开关 10 次、键盘焦点、图片失败、真实 404、JS 关闭、减少动效。结果见 `reports/browser-results.json`。
- `node tests/subpath.mjs`：生命周期测试生成的合成正式数据，验证 /gallery 路径、长标题/长故事/细节图、年份/系列筛选和空结果、返回恢复、点击后才下载高清、404。见 `reports/subpath-results.json`。

响应式测试宽度：320、360、390、430、617、768、820、1024、1366、1440、1920；另测横屏 844×390 的看图关闭操作。这是浏览器视口模拟，不是同等数量的真机测试。

截图在 `reports/screenshots/`。已实际查看首页及详情的桌面/移动截图，检查图像比例、文字、间距和控件；色块样本的视觉通过不等于真实油画审美通过。

## 资源与网络证据

每个页面用全新浏览器上下文，桌面 1440px / DPR 1，移动 390px / DPR 3。本地未限速，观察 5 秒，记录首页、总览、详情实际请求和响应体积。

完整请求 URL、状态码、图片数、pending、响应体字节在 `reports/browser-results.json` 的 network；全站各文件体积和 gzip 估计在 `build-audit.json`；每个衍生图的格式/用途/尺寸/体积在 `image-manifest.json`。报告统计响应体，不声称是真实线上传输计费字节。

已断言：总览不选 1440/1920/2000px 展示图；未点击时无 `-detail.webp` 高清请求；产物不包含源资料和母版格式；撤下衍生图不能残留。原生 lazy 可能预取近视口图片，不以固定请求张数验收。

当前整站约 2.2 MB、客户端 JS 约 1.7 KB gzip（具体以最新 JSON 为准）。这是简单色块样本的结果，不可据此宣称真实油画性能达标；尚无真实图画质对照、LCP/CLS/INP 或线上慢网测量。

## 如何复测

```sh
npm ci
npm run check
npm test
npm run build
npm run test:lifecycle
npx playwright install chromium firefox webkit
npm run test:browser
node tests/subpath.mjs
```

默认浏览器脚本只跑 Chromium。macOS/Linux 多引擎：`TEST_ENGINES=chromium,firefox,webkit npm run test:browser`。PowerShell：`$env:TEST_ENGINES="chromium,firefox,webkit"; npm run test:browser; Remove-Item Env:TEST_ENGINES`。

如使用其他已安装二进制，可设置 `BROWSER_EXECUTABLE`。测试使用 4321 / 4322，仅本机监听，请关闭占用这些端口的服务。生命周期会创建独立测试副本及图片，耗时比单元测试长；不会编辑正式资料。测试默认基于交付的 demo 50 件；切到真实内容后应同步调整测试样例和数量，不能继续使用 demo 断言作为正式验收。

## 未完成与结论

本包可作为 GitHub 仓库源代码提交并触发附带工作流，但未实际推送部署。正式域名 HTTPS、社交分享、真机与跨引擎、200% 浏览器缩放、中国大陆网络、托管回滚、真实画作颜色/清晰度和视觉确认均待执行。详见 `KNOWN_ISSUES.md` 和 `REQUIREMENTS.md`，不宣称全量验收完成。

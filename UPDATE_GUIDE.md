# v1.1.1 排版修复 · 现有 GitHub 仓库使用

本更新适用于之前的 Jiang_Qiao_Yan_GitHub_v1.0，也可直接覆盖已安装 v1.1 动效更新的仓库。包内包含 v1.1 动效文件和本次排版修复。无需新建仓库、重建 Pages、重新录入作品或更换依赖。

## 本次调整

- 电脑端艺术家区：左侧“THE ARTIST / 关于 + Jiang Qiao Yan”，右侧“简介 + 关于艺术家”。下方联系区与两栏对齐。
- 深绿色页脚：背景铺满宽屏，内部文字仍保持内容宽度；短页面的页脚落到底部，长页面正常滚动显示。
- 手机：保持现有单栏排列、字号和间距。首页、精选图、详情页的动效继续保留。

## 你需要做的步骤

1. 解压 `Jiang_Qiao_Yan_Layout_Update_v1.1.1.zip`。打开 GitHub Desktop 中的 `qiao_yan_1` → Show in Explorer。
2. 将更新包内的文件及 `src`、`tests`、`reports`、`dist` 文件夹复制到这个仓库根目录；选择合并文件夹、替换同名文件。根目录直接有 package.json。不要删除原仓库，保留现有 `.git`、`.github`、content 和 assets。不要只上传 ZIP 本身。
3. 如需先看效果：已有 Node.js 时双击原来的 `Preview_Windows.cmd`，打开显示的本机地址。更新包附带的是新版根路径预览 dist；它被 Git 忽略，不需要上传。
4. 回到 GitHub Desktop，Summary 写 `Fix desktop artist layout and footer`，点击 Commit to main，然后 **Push origin**。
5. 到 GitHub Actions 等部署出现绿色勾号，再打开原网站 `https://pekoroku.github.io/qiao_yan_1/`。网址不变。使用 Ctrl+F5 刷新旧页面。

若你自己改过本次涉及的页面/CSS/脚本，先保留这些改动并合并；更新包不带作品资料、艺术家配置和画作源图，不会主动替换它们。

## 看动画的方式

- 确认页头显示“动效 开”。如果显示“关”，点一次开启；之前的偏好会被浏览器记住，不会强行清除。
- 如果显示“系统关闭”，网站在遵循系统减少动态效果设置。需在系统中允许动画后再体验完整动效。
- 首页刷新时看姓名逐字进入；向下滚动看精选入场和缓慢错位；桌面将鼠标放在画面上看抬升、箭头和线条反馈。
- 点击作品看大图/资料入场，滚动阅读故事，再试“只看画作”和关闭。
- 滚动入场在每次页面加载中各播放一次，避免阅读时来回闪烁。浏览器返回优先保留观看位置；不会强制重新播放姓名开场。
- 手机保留入场和较小的滚动位移；没有依赖悬停的关键功能。支持原生跨页面过渡的浏览器还会有短页面淡化，不支持时正常跳转并播放详情入场。

## 实现与维护

电脑端排版修复集中在 `src/styles/layout.css`，页脚容器在 `src/layouts/Layout.astro`。动效参数集中在 `src/scripts/motion.ts` 和 `src/styles/motion.css`；看图展开/收回在 `src/scripts/site.ts`。作品内容仍按 CONTENT_GUIDE.md 维护。没有新增第三方动画库、远程字体、外部脚本或图片预取。

相对 v1.0 的时长调整：字符入场 850ms、错开 34ms；图片入场 900–1050ms；内容 500–680ms；看图展开 560ms / 关闭 260ms。为回应“动画太少、不明显”，展览入场比原要求中的候选 250–450ms 更舒缓；不阻止导航、点击、正常滚动或阅读。

本次排版检查见 `reports/LAYOUT_TEST_REPORT.md`；v1.1 动效检查见 `reports/MOTION_TEST_REPORT.md`。真实画作设计、真机跨浏览器和线上网络验收仍按原已知事项处理。

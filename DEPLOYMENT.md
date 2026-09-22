# GitHub Pages 部署与迁移

## 最方便的方式：GitHub Desktop

1. 安装 GitHub Desktop，登录自己的 GitHub 账号，新建仓库，例如 `jiang-qiao-yan`。
2. 将本项目解压后的全部源码放进仓库根目录。根目录直接有 package.json、package-lock.json、astro.config.mjs、src、content、assets、scripts、public 和 **.github**。
3. 确认 `.github/workflows/deploy.yml` 在仓库中。Windows 文件管理器可能不显眼，但不要漏传。
4. 在 GitHub Desktop 提交改动并 Publish repository / Push origin，分支为 `main`。公开仓库中不要放母版和私人资料。
5. 打开 GitHub 网页上的仓库 → Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
6. 若首次推送发生在开启 Pages 之前，打开 Actions → Deploy portfolio to GitHub Pages → Run workflow 再运行一次。
7. 成功后，Pages 设置或 Actions 的 github-pages 环境会显示真实网站地址。打开首页、全部作品，以及任意作品地址并刷新。

不能只上传这个 ZIP 文件；GitHub 不会自动解压。也不要额外套一层 `jiang-qiao-yan/`，除非自行调整工作流工作目录。`.gitignore` 会排除 node_modules、缓存和 dist；GitHub Actions 从源码重新生成网站。包内 dist 只供本地预览及其他静态托管使用。

**此交付没有连接或修改你的 GitHub 账号，也没有实际在 GitHub 发布。** 工作流与根路径/子路径的产物检查已在本地验证，实际 GitHub 运行待你推送后确认。

## 网址与路径自动配置

工作流通过 `actions/configure-pages` 获取实际 Pages URL：将域名写入 SITE_URL，将路径写入 BASE_PATH，供 Astro 构建使用。无需在多个组件里改仓库名。

- 普通仓库：通常 `https://用户名.github.io/仓库名/`。
- 用户主页仓库：通常 `https://用户名.github.io/`。
- 自定义域名：先按 GitHub 官方文档配置 Pages 与 DNS，再重新构建。工作流读取 Pages 解析后的地址，不在页面里写死域名。

如果分支不是 main，修改 `.github/workflows/deploy.yml` 的 branches；推荐直接使用 main。

## 手动构建另一个部署目标

macOS / Linux 示例：

```sh
SITE_URL=https://example.com BASE_PATH=/ npm run build
```

Windows PowerShell：

```powershell
$env:SITE_URL="https://example.com"
$env:BASE_PATH="/"
npm run build
Remove-Item Env:SITE_URL, Env:BASE_PATH
```

仓库子路径例子把 BASE_PATH 改成 `/gallery`。**包内 dist 为根路径本地预览版本，不要把它未经重新构建直接放到任意 GitHub 项目子目录。**

要切换正式内容，在 content/site.json 把 mode 改 live，并完整填写作品及首页引用。不要只隐藏演示提示。

## 构建失败

Actions 错误会包含具体资料文件：重复 ID/slug、缺图、作品改为草稿后仍被首页引用、正式模式混入占位等。修正源码再推送。失败发生在部署前，通常不会替换上一次成功的网站。

文件名大小写必须精确一致，Linux 部署区分大小写。避免在 Windows 上引用 `Main.JPG`，实际文件却叫 `main.jpg`。

`npm ci` 按锁文件安装。不要删除 package-lock.json 解决问题；升级依赖应单独进行并回归。

## 换到其他静态托管

可以使用同一套源码重新构建后上传 dist。检查目录首页（`/works/x/` 对应 `works/x/index.html`）、真正的 404 状态、HTTPS、尾斜杠、MIME、缓存、域名和资源前缀。不能承诺同一份 dist 在所有平台无需配置就能用。

若换 OSS，另行核对目标地域、自定义域名/备案、HTTPS/CDN、请求/下行/回源计费。不要仅凭存储价格估算全部费用。当前交付不包含开通收费服务或域名变更。

## 缓存与回退

HTML 建议短缓存或协商缓存，带哈希的衍生图片可长期缓存。GitHub Pages 的实际缓存策略由平台控制。通过 GitHub Desktop/网页恢复上次源码提交，再触发构建可回退；本次未执行真实平台回退演练。

## 上线后必须人工核对

手机真实 Safari；首页、总览、详情刷新、404；正式域名 canonical / 分享图 / sitemap；真实作品色彩与清晰度；中国大陆实际访问。不因为海外本地测试通过就宣称大陆稳定。

参考：[Astro GitHub Pages 部署](https://docs.astro.build/en/guides/deploy/github/)、[GitHub Pages 文档](https://docs.github.com/en/pages)。平台限制和收费政策在上线时重新核对。

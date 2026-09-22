# 作品添加与修改指南

## 你可以直接把资料交给 AI

每幅作品一个文件夹，包含主图、可选细节图、文字说明。文字写名称、年份、媒介、尺寸、背景/故事、哪张是主图、是否希望放首页、是否允许公开。未知信息留空。交付更新时提供最新源码包或同一仓库，避免使用过期版本覆盖新内容。

## 自己添加一幅画

先安装依赖：`npm ci`。以下操作均在项目根目录终端运行。

1. `npm run artwork:new -- work-001 "作品名称"`。也可只执行 `npm run artwork:new` 按提示输入，或复制 `templates/artwork.md` 到 `content/artworks/work-001.md`。
2. `npm run artwork:image -- "C:\图片\照片.jpg" work-001`。工具自动旋转、转 sRGB、移除隐私元数据并生成最长边不超过 3600px 的网页处理源图，保存为 `assets/artworks/work-001/main.jpg`。原文件不改。人工确认色彩，不用 AI 增加假细节。
3. 用 VS Code / 文本编辑器打开对应 `.md`，填写资料和故事。
4. 确认可公开后，将 `status: draft` 改成 `status: published`。
5. `npm run check`，`npm run build`，再 `npm run preview`。确认后提交、推送到 GitHub，等待 Actions 成功。

**每幅作品的内容只维护一份。不要修改 dist 里的 HTML，下一次构建会覆盖它。**

## 字段规则

| 字段 | 怎么填 |
|---|---|
| id | 固定编号，如 work-001。仅小写英文/数字/连字符，全站唯一，不随改名更换 |
| slug | 固定网址片段，如 work-001；上线后保持稳定，标题可单独改 |
| title | 正式作品名称 |
| status | draft 或 published；撤下时改为 draft |
| order | 全部作品和前后导航顺序，小的排前；相同时按 id 稳定排序 |
| isPlaceholder | 正式作品为 false；演示样本为 true |
| image | 相对于项目根目录的网页处理源图路径 |
| alt | 描述画面可见内容，方便辅助阅读；发布必填 |
| year | 加引号，如 "2024"；未知填 ""，不填上传日期 |
| medium | 例如经艺术家确认的 "布面油画"；未知留空 |
| dimensions | 如 "80 × 60 cm（高 × 宽）"；实体尺寸，注明方向和单位 |
| series | 真实系列名称；没有则空白 |
| summary | 可选短摘要，可用于页面及分享描述 |
| allowHighResolution | 默认 false；true 允许导出最长边至 3200px 的额外细节版本，仅用户点击后下载 |
| detailImages | 可选局部图数组，见下例 |

年份等资料用引号，避免 YAML 自动转换成数字。Windows 文件路径在命令行加引号，Markdown 内图片路径使用 `/`。

```yaml
detailImages:
  - image: assets/artworks/work-001/detail-01.jpg
    alt: "局部画面可见内容"
    caption: "经确认的局部说明"
```

局部源图可用 `npm run artwork:image -- "图片路径" work-001 detail-01` 生成。该工具不覆盖已有文件，替换时用新名称 `main-v2`，再改 image 引用。构建会使用内容哈希的新图片地址，避免旧缓存。

## 正式模式切换

`content/site.json` 默认 `"mode": "demo"`。正式作品全部准备好后改为 `"live"`，并填写 `home`：

```json
"home": {
  "hero": "work-001",
  "selected": ["work-002", "work-003", "work-004", "work-005", "work-006", "work-007", "work-008", "work-009"]
}
```

首页主视觉和精选不能重复，下方最多 8 件。作品不足时允许少于 8 件，不会复制凑数；达到约定的首页展示目标需由你补齐真实作品。演示模式的独立配置是 `demoHome`，不影响正式首页。

live 模式只读取 `content/artworks`；demo 模式只读取 `content/demo`，不会把新录入的真实资料夹杂在演示样本里。正式模式至少有一件可发布作品和有效首页主视觉，禁止 isPlaceholder=true。演示页带 noindex 且 sitemap 为空；正式页自动生成索引和作品分享信息。noindex 不保密。

## 关于与联系方式

在 site.json 修改 `intro`（首页短文）、`about`（段落数组）、`exhibitions`（year/title/venue 数组）、`email`、`socials`（label/url 数组）。不需要对应内容时留空。社交网址必须使用 https。

艺术家照片可选：在 `assets/site/` 放经批准的 JPG/PNG/WebP，并在 site.json 添加 `"portrait": {"image":"assets/site/portrait.jpg","alt":"经确认的照片描述"}`。照片同样走响应式图片处理；不提供时显示姓名版式，不生成假肖像。

## 故事正文

第二个 `---` 后是作品故事。支持标题、段落、列表、粗体和斜体。没有故事可留空，整段自动隐藏。当前受控 Markdown 不允许 HTML、链接或内嵌图片；细节图有专门字段。可避免误贴外部追踪图和破坏页面的代码。

## 修改、撤下和删除

- 改名称/故事：只改该作品文件，id/slug 保持不变；引用处自动更新。
- 首页换画：只改 site.json 的 home 顺序，不影响作品地址及总览顺序。
- 撤下：status 改 draft；如果曾上首页，先从 home 移除或替换。构建会明确提示残留引用。
- 删除：确认无引用后删除资料和已不用的网页源图，再构建。优先使用 draft 保留内部编辑记录。
- 构建会清理旧发布产物与内容缓存，防止撤下页面/图片残留。已公开到 Git 历史、浏览器缓存或被别人保存的素材无法因此收回。
- 已分享的 slug 要改时应单独制定跳转/迁移方案，本版本不自动重定向旧作品地址。撤下后旧地址应显示 404。

## 所有公开范围都要看

公开仓库中的 Markdown 和 `assets` 也可被下载，即使 status=draft。未批准资料放仓库外；源图只放经批准可公开的网页处理版本。图片管线只将当前发布作品的衍生图复制到 dist，但这不等于公开仓库自动保密。

## 内容更新后的最低检查

首页是否重复/缺画；总览是否能找到；直接打开/刷新详情；手机是否显示完整；标题、年份、方向单位是否正确；故事是否对应这幅画；上一件/下一件是否合理；图片色彩和细节是否可接受。确认后再推送发布。

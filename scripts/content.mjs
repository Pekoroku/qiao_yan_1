import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';

const key = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export async function loadContent(root = process.cwd(), override = {}) {
  const site = JSON.parse(await fs.readFile(path.join(root, 'content/site.json'), 'utf8'));
  site.mode = override.mode || process.env.CONTENT_MODE || site.mode;
  const fail = (file, text) => { throw new Error(`${file}: ${text}`); };
  if (!['demo', 'live'].includes(site.mode)) fail('content/site.json', 'mode 必须为 demo 或 live');
  if (site.name !== 'Jiang Qiao Yan') fail('content/site.json', '请保留已确认的艺术家姓名');
  if (!Array.isArray(site.about) || !site.about.every(x => typeof x === 'string')) fail('content/site.json', 'about 必须为文字段落数组');
  if (!Array.isArray(site.exhibitions) || !site.exhibitions.every(x => ['title','year','venue'].every(k => typeof x[k] === 'string'))) fail('content/site.json', 'exhibitions 需要 title/year/venue 文字字段');
  if (!Array.isArray(site.socials) || !site.socials.every(x => typeof x.label === 'string' && /^https:\/\//.test(x.url))) fail('content/site.json', 'socials 需要 label 和 https 网址');
  if (site.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email)) fail('content/site.json', '邮箱格式不正确');
  if(site.portrait){
    if(typeof site.portrait.image!=='string'||!site.portrait.image.startsWith('assets/site/')||site.portrait.image.includes('..')||!site.portrait.alt?.trim())fail('content/site.json','portrait 需要 assets/site/ 下的图片和 alt');
    const m=await sharp(path.join(root,site.portrait.image)).metadata();
    if(!m.width||!m.height)fail('content/site.json','肖像图片尺寸无效');
    const swapped=[5,6,7,8].includes(m.orientation);site.portrait.width=swapped?m.height:m.width;site.portrait.height=swapped?m.width:m.height;
  }
  const folder = `content/${site.mode === 'demo' ? 'demo' : 'artworks'}`;
  const names = (await fs.readdir(path.join(root, folder))).filter(n => n.endsWith('.md')).sort();
  const ids = new Set(), slugs = new Set(), records = [];
  for (const name of names) {
    const file = `${folder}/${name}`;
    const raw = await fs.readFile(path.join(root, file), 'utf8');
    // Disable gray-matter language engines: frontmatter is always YAML.
    if (!/^---\r?\n/.test(raw)) fail(file, '必须以 YAML 资料区 --- 开始');
    const {data: d, content: body} = matter(raw, {language: 'yaml'});
    for (const [field, set] of [['id', ids], ['slug', slugs]]) {
      if (!key.test(d[field] || '')) fail(file, `${field} 只能使用小写英文、数字及连字符`);
      if (set.has(d[field])) fail(file, `${field} 重复：${d[field]}`);
      set.add(d[field]);
    }
    if (!['draft','published'].includes(d.status)) fail(file, 'status 必须是 draft 或 published');
    if (typeof d.isPlaceholder !== 'boolean') fail(file, 'isPlaceholder 必须明确为 true 或 false');
    if (!Number.isFinite(d.order)) fail(file, 'order 必须是数字');
    if (d.status === 'draft') continue;
    if (site.mode === 'live' && d.isPlaceholder) fail(file, '正式模式禁止发布占位作品');
    for (const field of ['title','alt','image']) if (typeof d[field] !== 'string' || !d[field].trim()) fail(file, `发布缺少 ${field}`);
    for (const field of ['year','medium','dimensions','series','summary']) if (d[field] != null && typeof d[field] !== 'string') fail(file, `${field} 请写成加引号的文字`);
    if (body.includes('<') || /!\[|\]\(|\]\[|^\s*\[[^\]]+\]:/m.test(body)) fail(file, '故事正文仅支持文字、标题、列表与强调；图片使用 detailImages，禁止 HTML、链接及内嵌图片');
    if (d.detailImages != null && !Array.isArray(d.detailImages)) fail(file, 'detailImages 必须为数组');
    const images = [{image:d.image, alt:d.alt}, ...(d.detailImages || [])];
    for (const im of images) {
      if (!im.image || typeof im.alt !== 'string' || !im.alt.trim()) fail(file, '每张图必须有 image 与 alt');
      if (im.caption != null && typeof im.caption !== 'string') fail(file, '图片说明 caption 必须为文字');
      const prefix = site.mode === 'demo' ? 'assets/demo/' : 'assets/artworks/';
      if (!im.image.startsWith(prefix) || im.image.includes('..') || im.image.includes('\\')) fail(file, `图片必须位于 ${prefix}`);
      if (!/\.(jpe?g|png|webp)$/i.test(im.image) && !(site.mode === 'demo' && im.image.endsWith('.svg'))) fail(file, '正式图片仅接收 JPG、PNG、WebP 网页处理源图');
      const absolute = path.join(root, im.image);
      try {
        const meta = await sharp(absolute).metadata();
        if (!meta.width || !meta.height || (meta.pages || 1) > 1) throw Error('尺寸无效或是动画');
        const swapped = [5,6,7,8].includes(meta.orientation);
        im.width = swapped ? meta.height : meta.width;
        im.height = swapped ? meta.width : meta.height;
      } catch (error) { fail(file, `图片不存在或损坏：${im.image} (${error.message})`); }
    }
    records.push({...d, file, body, images});
  }
  records.sort((a,b) => a.order - b.order || a.id.localeCompare(b.id));
  const home = site.mode === 'demo' ? site.demoHome : site.home;
  if (!home || !Array.isArray(home.selected) || typeof home.hero !== 'string') fail('content/site.json', '首页需要 hero 与 selected');
  const refs = [home.hero, ...home.selected].filter(Boolean);
  if (new Set(refs).size !== refs.length) fail('content/site.json', '首页主视觉和精选不能重复');
  if (home.selected.length > 8) fail('content/site.json', '下方精选最多 8 件');
  for (const id of refs) if (!records.some(x => x.id === id)) fail('content/site.json', `首页引用 ${id} 不存在或已撤下，请移除或替换该引用`);
  if (site.mode === 'live' && !override.allowEmpty) {
    if (!records.length) fail('content/artworks', '正式发布至少需要一件作品');
    if (!home.hero) fail('content/site.json', '正式发布请指定 home.hero');
  }
  return {site, home, records};
}

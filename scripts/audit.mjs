import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const manifest=JSON.parse(await fs.readFile('src/generated/manifest.json','utf8'));
const site=JSON.parse(await fs.readFile('src/generated/site.json','utf8'));
const base=(process.env.BASE_PATH||'/').replace(/\/$/,'');
const files=await fs.readdir('dist',{recursive:true});
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const failures=[];
const inlineScripts=new Set();
for(const file of htmlFiles){
  const html=await fs.readFile(path.join('dist',file),'utf8');
  for(const script of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g))inlineScripts.add(script[1]);
  if(/undefined|\[object Object\]/.test(html))failures.push(`${file}: 无效内容`);
  for(const match of html.matchAll(/(?:href|src|data-src)="([^"#]+)"/g)){
    const raw=match[1];if(/^(https?:|mailto:|data:|tel:)/.test(raw))continue;
    const pathname=decodeURIComponent(raw.split(/[?#]/)[0]);
    if(!pathname.startsWith(`${base}/`)){failures.push(`${file}: 缺少 base 前缀 ${pathname}`);continue;}
    let dest=pathname.slice(base.length+1);if(!dest||dest.endsWith('/'))dest+='index.html';
    try{await fs.access(path.join('dist',dest));}catch{failures.push(`${file}: 死链接 ${raw}`);}
  }
  if(site.mode==='demo'&&!html.includes('noindex,nofollow'))failures.push(`${file}: 演示页缺少 noindex`);
}
for(const art of manifest){try{await fs.access(`dist/works/${art.slug}/index.html`)}catch{failures.push(`${art.id}: 缺少独立详情`)}}
for(const file of htmlFiles.filter(f=>/^works\/.+\/index\.html$/.test(f))){const slug=file.split('/')[1];if(!manifest.some(a=>a.slug===slug))failures.push(`${file}: 已撤下页面残留`);}
const imageManifest=JSON.parse(await fs.readFile('reports/image-manifest.json','utf8'));
for(const file of files.filter(f=>f.startsWith('media/'))){if(!imageManifest.some(im=>im.path===file))failures.push(`${file}: 未引用图片残留`);}
if(files.some(f=>/\.(md|mjs|tiff?|psd|raw|cr2|nef|env)$/i.test(f)||f.startsWith('assets/')||f.startsWith('content/')||f.startsWith('.prerender/')))failures.push('发布产物含源资料、服务端构建中间产物或母版类型文件');
const home=await fs.readFile('dist/index.html','utf8');
const homeIds=[...home.matchAll(/data-work-id="([^"]+)"/g)].map(m=>m[1]);
if(new Set(homeIds).size!==homeIds.length)failures.push('首页重复作品');
if(site.activeHome.hero&&homeIds.length!==1+site.activeHome.selected.length)failures.push('首页作品数量不一致');
const sizes=[];
for(const file of files){const stat=await fs.stat(path.join('dist',file));if(!stat.isFile())continue;const buf=await fs.readFile(path.join('dist',file));sizes.push({file,bytes:stat.size,...(/\.(css|js|html)$/.test(file)?{gzipBytes:gzipSync(buf).length}:{})});}
const report={mode:site.mode,base:base||'/',pages:htmlFiles.length,works:manifest.length,homeIds,failures,bytes:sizes.reduce((n,x)=>n+x.bytes,0),jsGzipBytes:sizes.filter(s=>s.file.endsWith('.js')).reduce((n,s)=>n+s.gzipBytes,0)+[...inlineScripts].reduce((n,s)=>n+gzipSync(s).length,0),resources:sizes};
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/build-audit.json',JSON.stringify(report,null,2));
if(failures.length)throw Error(failures.join('\n'));
console.log(`Audit passed: ${manifest.length} works, ${htmlFiles.length} pages, ${homeIds.length} unique home selections, ${(report.bytes/1e6).toFixed(2)} MB output, ${report.jsGzipBytes} B gzip JS.`);

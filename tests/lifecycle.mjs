import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const source=process.cwd();
await fs.mkdir(path.join(source,'test-results'),{recursive:true});
const root=await fs.mkdtemp(path.join(source,'test-results/lifecycle-'));
for(const dir of ['src','content','assets','scripts','.cache','public'])await fs.cp(path.join(source,dir),path.join(root,dir),{recursive:true});
for(const file of ['package.json','package-lock.json','astro.config.mjs','tsconfig.json'])await fs.copyFile(path.join(source,file),path.join(root,file));
await fs.symlink(path.join(source,'node_modules'),path.join(root,'node_modules'),'dir');
const results=[];
function runBuild(name,env={}){
 const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,encoding:'utf8',env:{...process.env,...env,ASTRO_TELEMETRY_DISABLED:'1'},shell:process.platform==='win32'});
 if(r.status!==0)throw Error(`${name}: ${r.stdout}\n${r.stderr}`);results.push(name);return r.stdout;
}
let site=JSON.parse(await fs.readFile(path.join(root,'content/site.json'),'utf8'));
const putSite=()=>fs.writeFile(path.join(root,'content/site.json'),JSON.stringify(site,null,2));
const original=await fs.readFile(path.join(root,'content/demo/sample-50.md'),'utf8');
const newfile=path.join(root,'content/demo/sample-51.md');
await fs.copyFile(path.join(root,'assets/demo/sample-50.svg'),path.join(root,'assets/demo/sample-51.svg'));
await fs.writeFile(newfile,original.replaceAll('sample-50','sample-51').replace('order: 50','order: 51').replace('版式样本 50','新增作品测试 51'));
runBuild('add 51st work');assert((await fs.readFile(path.join(root,'dist/works/index.html'),'utf8')).includes('新增作品测试 51'));
assert((await fs.readFile(path.join(root,'dist/works/sample-50/index.html'),'utf8')).includes('/works/sample-51/'));
await fs.writeFile(newfile,(await fs.readFile(newfile,'utf8')).replace('新增作品测试 51','修改名称但保留原网址'));
runBuild('edit title without changing URL');assert((await fs.readFile(path.join(root,'dist/works/sample-51/index.html'),'utf8')).includes('修改名称但保留原网址'));
await fs.writeFile(newfile,(await fs.readFile(newfile,'utf8')).replace('status: published','status: draft'));
runBuild('retire work and prune its page and derivatives');await assert.rejects(()=>fs.access(path.join(root,'dist/works/sample-51/index.html')));assert(!(await fs.readdir(path.join(root,'dist/media'))).some(f=>f.startsWith('sample-51-')));
for(let i=51;i<=60;i++){const n=String(i);await fs.copyFile(path.join(root,'assets/demo/sample-50.svg'),path.join(root,`assets/demo/sample-${n}.svg`));await fs.writeFile(path.join(root,`content/demo/sample-${n}.md`),original.replaceAll('sample-50',`sample-${n}`).replace('order: 50',`order: ${n}`).replace('版式样本 50',`扩展样本 ${n}`));}
runBuild('60 unique resources');assert.equal(JSON.parse(await fs.readFile(path.join(root,'reports/build-audit.json'),'utf8')).works,60);
// Empty and one-work UI are demonstrated only in demo mode, never as an approved live publication.
await fs.rm(path.join(root,'content/demo'),{recursive:true});await fs.mkdir(path.join(root,'content/demo'));site.demoHome={hero:'',selected:[]};await putSite();runBuild('zero-work empty states');
await fs.writeFile(path.join(root,'content/demo/sample-50.md'),original);site.demoHome={hero:'sample-50',selected:[]};await putSite();runBuild('one-work navigation boundaries');const only=await fs.readFile(path.join(root,'dist/works/sample-50/index.html'),'utf8');assert(only.includes('已是第一件作品')&&only.includes('已是最后一件作品'));
// Isolated synthetic live fixtures exercise filters, long stories, images and sitemap.
for(let i=1;i<=3;i++){
 const id=`sample-0${i}`;await fs.mkdir(path.join(root,`assets/artworks/${id}`),{recursive:true});
 await sharp(path.join(source,`assets/demo/${id}.svg`)).resize(i===1?3000:1400).jpeg().toFile(path.join(root,`assets/artworks/${id}/main.jpg`));
 const detail=i===1?`detailImages:\n  - image: assets/artworks/${id}/main.jpg\n    alt: "局部样本验证"\n    caption: "仅供自动测试的细节样本"\n`:'';
 const long=i===1?'\n## 长故事阅读验证\n\n'+Array.from({length:20},()=>('这段文字仅供布局测试，不是艺术家自述。'.repeat(8))).join('\n\n'):'';
 await fs.writeFile(path.join(root,`content/artworks/${id}.md`),`---\nid: ${id}\nslug: ${id}\ntitle: "${i===1?'长标题LongUnbrokenWord'.repeat(6):'测试作品 '+i}"\nstatus: published\norder: ${i}\nisPlaceholder: false\nimage: assets/artworks/${id}/main.jpg\nalt: "合成色块测试，非真实画作"\nyear: "${i===3?'2025':'2024'}"\nseries: "${i===2?'B':'A'}"\nallowHighResolution: true\n${detail}---\n${long}`);
}
site.mode='live';site.home={hero:'sample-01',selected:['sample-02','sample-03']};await putSite();runBuild('synthetic live publication, subpath, long story and details',{SITE_URL:'https://example.test',BASE_PATH:'/gallery'});
const sitemap=await fs.readFile(path.join(root,'dist/sitemap.xml'),'utf8');assert(sitemap.includes('https://example.test/gallery/works/sample-01/'));assert(!sitemap.includes('sample-50'));
const first=await fs.readFile(path.join(root,'dist/works/sample-01/index.html'),'utf8');assert(first.includes('og:image'));assert(!first.includes('结构预览 · 非正式作品'));assert(first.includes('load-high'));
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/lifecycle-results.json',JSON.stringify({checks:results,syntheticLiveFixture:root,status:'passed'},null,2));
console.log(JSON.stringify({checks:results,status:'passed'},null,2));

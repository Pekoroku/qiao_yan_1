import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import {chromium,firefox,webkit} from 'playwright';
const base=process.env.TEST_URL||'http://127.0.0.1:4321/';
const basePath=new URL(base).pathname.replace(/\/$/,'');
const dist=path.resolve(process.env.TEST_DIST||'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
let server;
if(!process.env.TEST_EXTERNAL_SERVER){
 server=http.createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,base).pathname);if(basePath&&!p.startsWith(basePath+'/'))throw Error();p=p.slice(basePath.length);let file=path.join(dist,p);if(!file.startsWith(dist))throw Error();let stat=await fs.stat(file);if(stat.isDirectory())file=path.join(file,'index.html');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});try{res.end(await fs.readFile(path.join(dist,'404.html')))}catch{res.end('404')}}});
 await new Promise(resolve=>server.listen(Number(new URL(base).port), '127.0.0.1',resolve));
}
const expected=Number(process.env.TEST_WORKS||50);
const engines=(process.env.TEST_ENGINES||'chromium').split(',');
await fs.mkdir('reports/screenshots',{recursive:true});
const results=[];
for(const engine of engines){
 let browser;
 try{browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true,...(process.env.BROWSER_EXECUTABLE&&engine==='chromium'?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});}
 catch(error){results.push({engine,status:'blocked',message:error.message});continue;}
 const failures=[],checks=[],errors=[];
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const loadHomeImages=async()=>{for(const img of await page.locator('main img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.complete?Promise.resolve():new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}))}await page.evaluate(()=>window.scrollTo(0,0));};
 const check=async(name,fn)=>{try{await fn();checks.push(name);console.log('PASS',name)}catch(e){failures.push({name,error:e.message});console.log('FAIL',name,e.message)}};
 await check('home nine unique works',async()=>{await page.goto(base);await page.waitForLoadState('networkidle');const ids=await page.locator('[data-work-id]').evaluateAll(es=>es.map(e=>e.dataset.workId));assert.equal(ids.length,expected===50?9:ids.length);assert.equal(new Set(ids).size,ids.length);await loadHomeImages();await page.screenshot({path:`reports/screenshots/${engine}-home-desktop.png`,fullPage:true});});
 await check('all works route and count',async()=>{await page.locator('.hero-intro a').click();await page.waitForURL(`${base}works/`);assert.equal(await page.locator('[data-archive] .work-card').count(),expected);await page.screenshot({path:`reports/screenshots/${engine}-works-desktop.png`,fullPage:false});});
 await check('detail deep refresh, story and focus viewer',async()=>{
  await page.locator('[data-archive] .work-card a').first().click();const detail=page.url();await page.reload();assert.equal(page.url(),detail);assert.equal(await page.locator('h1').count(),1);assert(await page.locator('#main-art-image img').evaluate(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:`reports/screenshots/${engine}-detail-desktop.png`,fullPage:true});
  for(let i=0;i<10;i++){await page.locator('#open-viewer').click();assert(await page.locator('#art-viewer').evaluate(d=>d.open));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#art-viewer').open);assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('viewer-open')),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'open-viewer');}
  await page.locator('#open-viewer').click();await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('dialog')));await page.locator('#close-viewer').click();
 });
 await check('archive back restores scroll',async()=>{await page.goto(`${base}works/`);const card=page.locator('[data-archive] .work-card a').nth(Math.min(19,expected-1));await card.scrollIntoViewIfNeeded();await page.waitForTimeout(200);const y=await page.evaluate(()=>scrollY);await card.click();await page.goBack();await page.waitForTimeout(250);const back=await page.evaluate(()=>scrollY);assert(Math.abs(y-back)<180,`${y} => ${back}`);});
 await check('detail prev/next boundaries',async()=>{await page.goto(`${base}works/`);const links=await page.locator('[data-archive] .work-card a').evaluateAll(a=>a.map(x=>x.href));await page.goto(links[0]);assert.equal(await page.getByText('已是第一件作品').count(),1);await page.goto(links.at(-1));assert.equal(await page.getByText('已是最后一件作品').count(),1);await page.locator('.back-link').click();assert.equal(page.url(),`${base}works/`);});
 await check('all responsive widths without overflow',async()=>{
  for(const width of [320,360,390,430,617,768,820,1024,1366,1440,1920]){
   await page.setViewportSize({width,height:900});
   for(const route of ['', 'works/', 'works/sample-01/', 'about/','contact/']){
    await page.goto(base+route);await page.waitForLoadState('load');
    const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(dims.scroll<=dims.width+1,`${route} at ${width}: ${dims.scroll}`);
   }
  }
  await page.setViewportSize({width:390,height:844});await page.goto(base);await loadHomeImages();await page.screenshot({path:`reports/screenshots/${engine}-home-mobile.png`,fullPage:true});
  await page.goto(`${base}works/sample-01/`);await page.screenshot({path:`reports/screenshots/${engine}-detail-mobile.png`,fullPage:true});
  await page.setViewportSize({width:844,height:390});await page.goto(`${base}works/sample-01/`);await page.locator('#open-viewer').click();const r=await page.locator('#close-viewer').boundingBox();assert(r.y+r.height<=390);await page.keyboard.press('Escape');
 });
 await check('reduced motion persists and SVG icons',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);assert.equal(await page.locator('.hero-title').evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await page.locator('.motion-toggle').isDisabled(),true);await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.motion-toggle').click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-motion'),'off');const bad=await page.locator('a,button').allTextContents();assert(!bad.some(s=>/[↗↘↙↖←→↓↑×]/.test(s)));});
 await check('image request failure leaves page usable',async()=>{await page.route('**/media/**',r=>r.abort());await page.goto(`${base}works/sample-01/`);await page.waitForTimeout(250);assert(await page.locator('#main-art-image .image-error').isVisible());assert(await page.locator('.back-link').isVisible());await page.unroute('**/media/**');});
 await check('real 404 response',async()=>{const res=await page.goto(`${base}not-a-work/`);assert.equal(res.status(),404);});
 await context.close();
 // A fresh context has no page cache; request observations include actual URLs and payload bytes.
 const network=[];
 for(const [device,width,dpr] of [['desktop',1440,1],['mobile',390,3]]){
  for(const route of ['','works/','works/sample-01/']){
   const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:dpr});const p=await ctx.newPage();const requests=[],responses=[];
   p.on('request',req=>requests.push(req.url()));p.on('response',res=>responses.push(res));
   await p.goto(base+route);await p.waitForTimeout(5000);
   const payloads=await Promise.all(responses.map(async res=>{try{return {url:res.url(),status:res.status(),bytes:(await res.body()).length}}catch{return {url:res.url(),status:res.status(),bytes:null}}}));
   const images=payloads.filter(r=>r.url.includes('/media/'));
   assert(!images.some(r=>r.url.includes('-detail.')),'Unrequested detail image');
   if(route==='works/')assert(!images.some(r=>/-(1440|1920|2000)\.webp/.test(r.url)),'Archive downloads display image');
   network.push({device,width,dpr,route,cache:'fresh browser context',observationSeconds:5,network:'unthrottled local HTTP',pending:requests.length-responses.length,totalBodyBytes:payloads.reduce((n,r)=>n+(r.bytes||0),0),images:images.length,payloads});await ctx.close();
  }
 }
 const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();
 await check('JS disabled: core pages and navigation',async()=>{await np.goto(`${base}works/`);assert.equal(await np.locator('[data-archive] .work-card').count(),expected);await np.locator('[data-archive] a').first().click();assert(await np.locator('h1').isVisible());assert.equal(await np.locator('#open-viewer').isVisible(),false)});
 await nojs.close();
 results.push({engine,version:browser.version(),checks,failures,errors,network,status:failures.length||errors.length?'failed':'passed'});await browser.close();
}
await fs.writeFile('reports/browser-results.json',JSON.stringify({base,results},null,2));
console.log(JSON.stringify(results.map(({engine,status,checks,failures,errors})=>({engine,status,checks:checks?.length,failures,errors})),null,2));
server?.close();
if(results.some(r=>r.status==='failed')||!results.some(r=>r.status==='passed'))process.exitCode=1;

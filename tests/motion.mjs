import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve('dist'),base='http://127.0.0.1:4323/';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg'};
const server=http.createServer(async(req,res)=>{try{let file=path.join(root,new URL(req.url,base).pathname);if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain'});res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(4323,'127.0.0.1',r));
let browser;const checks=[],errors=[];
await fs.mkdir('reports/motion',{recursive:true});
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 await ctx.addInitScript(()=>{window.motionEvents=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.motionEvents.push({className:this.className,id:this.id,duration:options.duration,delay:options.delay||0});return original.call(this,frames,options)}});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.motionEvents.filter(x=>x.className==='name-letter').length===13);
 const letters=await page.evaluate(()=>window.motionEvents.filter(x=>x.className==='name-letter'));assert.equal(new Set(letters.map(x=>x.delay)).size,13);assert.equal(await page.locator('h1').getAttribute('aria-label'),'Jiang Qiao Yan');checks.push('13 visible-name characters stagger independently; accessible name preserved');
 await page.waitForTimeout(1300);await page.screenshot({path:'reports/motion/home.png'});
 const card=page.locator('.featured-card').first();await card.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.featured-card .image-wrap').dataset.motionSeen==='true');await page.waitForTimeout(1000);
 const driftBefore=await card.evaluate(e=>e.style.getPropertyValue('--drift-y'));await page.mouse.wheel(0,220);await page.waitForTimeout(200);const driftAfter=await card.evaluate(e=>e.style.getPropertyValue('--drift-y'));assert.notEqual(driftBefore,driftAfter);checks.push('selected picture reveal and scroll-linked drift occur');
 await card.locator('a').hover();await page.waitForTimeout(700);assert.notEqual(await card.locator('picture').evaluate(e=>getComputedStyle(e).transform),'none');await page.screenshot({path:'reports/motion/selected-hover.png'});checks.push('desktop artwork hover lifts full uncropped image');
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.locator('.motion-toggle').click();await page.waitForTimeout(100);assert.equal(await page.locator('.name-line').first().evaluate(e=>getComputedStyle(e).translate),'none');assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
 await page.reload();assert.equal(await page.evaluate(()=>window.motionEvents.length),0);assert.equal(await page.locator('html').getAttribute('data-motion'),'off');checks.push('manual motion off immediately cancels animation and persists');
 await page.locator('.motion-toggle').click();await page.goto(base+'works/sample-01/');await page.waitForFunction(()=>window.motionEvents.some(x=>x.id==='main-art-image'));assert((await page.evaluate(()=>window.motionEvents.length))>=4);await page.waitForTimeout(1100);await page.screenshot({path:'reports/motion/detail.png'});checks.push('detail image and metadata enter separately');
 await page.locator('.story-section').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.story-section .prose>*').dataset.motionSeen==='true');checks.push('story reveals in normal document flow');
 for(let i=0;i<10;i++){
   await page.locator('#open-viewer').click();assert(await page.locator('#art-viewer').evaluate(d=>d.open));
   if(i===0){await page.waitForTimeout(600);await page.screenshot({path:'reports/motion/viewer.png'})}
   await page.keyboard.press('Escape');if(i===4)await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>!document.querySelector('#art-viewer').open,null,{timeout:1200});assert.equal(await page.evaluate(()=>document.activeElement.id),'open-viewer');assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('viewer-open')),false);
   assert.equal(await page.locator('#viewer-canvas img').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
 }
 checks.push('10 open/close cycles including immediate Esc and reduced-motion interruption; focus and scroll restored');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);assert.equal(await page.evaluate(()=>window.motionEvents.length),0);assert(await page.locator('.motion-toggle').isDisabled());checks.push('OS reduced motion skips all scripted animation');
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const width of [320,390,760,1024,1440,1920]){
   await page.setViewportSize({width,height:900});
   for(const route of ['', 'works/','works/sample-01/']){
     await page.goto(base+route);await page.waitForTimeout(80);
     const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,bad:[...document.querySelectorAll('main *')].map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1).slice(0,8)}));
     assert(layout.scroll<=width+1,`${route} entry overflow at ${width}: ${JSON.stringify(layout)}`);
     await page.waitForTimeout(1250);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} settled overflow at ${width}`);
   }
 }
 checks.push('animated and settled layouts at 320–1920px have no horizontal overflow');
 await page.setViewportSize({width:390,height:844});await page.goto(base);await page.waitForTimeout(1400);await page.screenshot({path:'reports/motion/mobile-home.png',fullPage:true,animations:'disabled'});
 const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();await np.goto(base);assert.equal(await np.locator('h1').innerText(),'Jiang\nQiao Yan');assert.equal(await np.locator('[data-work-id]').count(),9);await np.goto(base+'works/sample-01/');assert.equal(await np.locator('#main-art-image').evaluate(e=>getComputedStyle(e).opacity),'1');checks.push('JavaScript disabled: name, nine images and detail remain visible');await nojs.close();
 const noobserver=await browser.newContext();await noobserver.addInitScript(()=>{window.IntersectionObserver=undefined});const op=await noobserver.newPage();await op.goto(base);assert.equal(await op.locator('.featured-card .image-wrap').first().evaluate(e=>getComputedStyle(e).opacity),'1');checks.push('IntersectionObserver unavailable: artwork remains visible');await noobserver.close();
 assert.deepEqual(errors,[]);
 await fs.writeFile('reports/motion-results.json',JSON.stringify({status:'passed',version:'1.1',browser:browser.version(),checks,errors,scope:'local production build; not real-device or live deployment verification'},null,2));
 console.log(JSON.stringify({status:'passed',checks},null,2));await ctx.close();
}finally{await browser?.close();server.close();}

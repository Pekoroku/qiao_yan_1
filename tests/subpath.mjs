import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const lifecycle=JSON.parse(await fs.readFile('reports/lifecycle-results.json','utf8'));
const root=path.join(lifecycle.syntheticLiveFixture,'dist');
const base='http://127.0.0.1:4322/gallery/';
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,base);assert(url.pathname.startsWith('/gallery/'));let file=path.join(root,url.pathname.slice(9));if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'});res.end(await fs.readFile(file));}catch{res.writeHead(404,{'Content-Type':'text/html'});res.end(await fs.readFile(path.join(root,'404.html')))}});
await new Promise(r=>server.listen(4322,'127.0.0.1',r));
let browser;const checks=[];
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 const page=await browser.newPage();const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(base+'works/');await page.selectOption('select[name="year"]','2025');await page.selectOption('select[name="series"]','B');assert(await page.locator('#empty-filter').isVisible());
 await page.selectOption('select[name="series"]','A');assert.equal(await page.locator('.work-card:visible').count(),1);await page.locator('.work-card:visible a').click();await page.goBack();assert.equal(await page.locator('select[name="year"]').inputValue(),'2025');assert.equal(await page.locator('.work-card:visible').count(),1);checks.push('filters, empty result and back restoration');
 await page.goto(base+'works/sample-01/');await page.reload();assert((await page.locator('.prose').innerText()).length>2000);assert.equal(await page.locator('.detail-images img').count(),1);checks.push('subpath direct refresh, long story and detail image');
 assert(!requests.some(u=>u.includes('-detail.webp')));await page.locator('#open-viewer').click();assert(!requests.some(u=>u.includes('-detail.webp')));await page.locator('#load-high').click();await page.waitForFunction(()=>document.querySelector('#viewer-status')?.textContent?.includes('已加载'));assert(requests.some(u=>u.includes('-detail.webp')));await page.keyboard.press('Escape');assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('viewer-open')),false);checks.push('high resolution requested only after explicit click');
 for(const width of [320,390,820,1440]){await page.setViewportSize({width,height:900});for(const route of ['', 'works/','works/sample-01/']){await page.goto(base+route);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflow at ${width}`)}}checks.push('long title and story responsive widths');
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'works/sample-01/');await page.screenshot({path:'reports/screenshots/subpath-long-story.png',fullPage:true});
 const res=await page.goto(base+'missing/');assert.equal(res.status(),404);assert((await page.locator('main a').first().getAttribute('href')).startsWith('/gallery/'));checks.push('subpath 404 and internal links');
 await fs.writeFile('reports/subpath-results.json',JSON.stringify({status:'passed',engine:'chromium',version:browser.version(),fixture:'synthetic test content, not approved artist content',checks},null,2));console.log(JSON.stringify({status:'passed',checks},null,2));
}finally{await browser?.close();server.close();}

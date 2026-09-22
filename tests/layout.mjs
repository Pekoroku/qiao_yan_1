import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const baseline=process.argv.includes('--baseline');
const root=path.resolve(process.env.TEST_DIST||'dist'),base='http://127.0.0.1:4324/';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg'};
const server=http.createServer(async(req,res)=>{try{let file=path.join(root,new URL(req.url,base).pathname);if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain'});res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(4324,'127.0.0.1',r));
const results=[],errors=[];let browser;
await fs.mkdir('reports/layout',{recursive:true});
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 const page=await browser.newPage({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 const cases=baseline?[[320,740],[390,844],[2560,1440]]:[[320,740],[390,844],[768,1024],[1440,900],[1920,1080],[2560,1440],[3200,1800],[3440,1440],[3840,2160]];
 for(const [width,height] of cases){
  await page.setViewportSize({width,height});
  for(const route of ['', 'works/sample-03/','works/sample-01/','about/','contact/']){
   await page.goto(base+route);
   // Compare settled layouts, not a race between a bottom jump and lazy decoding.
   await page.evaluate(async()=>{
    const imgs=[...document.images];imgs.forEach(img=>img.loading='eager');
    await Promise.all(imgs.map(img=>img.decode()));await document.fonts.ready;
    scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   });
   const m=await page.evaluate(()=>{
    const doc=document.documentElement,footer=document.querySelector('.site-footer'),r=footer.getBoundingClientRect();
    const content=[...footer.querySelectorAll('a,span,p')].map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom}});
    return {viewportWidth:doc.clientWidth,viewportHeight:innerHeight,scrollWidth:doc.scrollWidth,documentHeight:doc.scrollHeight,scrollY,footer:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height},content};
   });
   results.push({width,height,route,...m});
   if(!baseline){
    assert(m.scrollWidth<=m.viewportWidth+1,`horizontal overflow: ${route} ${width}`);
    assert(Math.abs(m.footer.left)<1&&Math.abs(m.footer.right-m.viewportWidth)<1,`footer not full width: ${route} ${width}`);
    if(width>760)assert(Math.abs(m.footer.bottom-m.viewportHeight)<=2,`footer bottom gap/crop: ${route} ${width} ${m.footer.bottom}`);
    assert(m.footer.bottom<=m.viewportHeight+2,`footer cropped: ${route} ${width}`);
    for(const c of m.content)assert(c.left>=-1&&c.right<=m.viewportWidth+1&&c.top>=m.footer.top-1&&c.bottom<=m.footer.bottom+1,`footer content clipped: ${route} ${width}`);
    if(!route){
      const order=await page.evaluate(()=>{const section=document.querySelector('.about-teaser');return [...section.querySelectorAll('.eyebrow,h2,p:not(.eyebrow),a')].map(e=>({tag:e.tagName,text:e.textContent,rect:{top:e.getBoundingClientRect().top,left:e.getBoundingClientRect().left,bottom:e.getBoundingClientRect().bottom}}))});
      assert(order[0].text.includes('The artist')&&order[1].tag==='H2'&&order[2].tag==='P'&&order[3].tag==='A');
      assert(order[0].rect.bottom<=order[1].rect.top+1);
      if(width<=760)for(let i=1;i<order.length;i++)assert(order[i].rect.top>=order[i-1].rect.bottom-1,'mobile artist order overlap');
      else assert(order[1].rect.left===order[0].rect.left&&order[2].rect.left>order[1].rect.left&&order[3].rect.left===order[2].rect.left,'desktop artist columns');
    }
   }
   if((width===2560||width===390)&&['','works/sample-03/','contact/'].includes(route))await page.screenshot({path:`reports/layout/${baseline?'before':'after'}-${width}-${route?route.split('/').filter(Boolean).at(-1):'home'}.png`});
  }
 }
 if(!baseline){
   await page.setViewportSize({width:2560,height:1440});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(base);await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(900);
   assert.equal(await page.locator('.about-teaser h2').getAttribute('data-motion-seen'),'true');assert.equal(await page.locator('.artist-summary').getAttribute('data-motion-seen'),'true');
   await page.setViewportSize({width:2560,height:1080});await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.setViewportSize({width:2560,height:1440});await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
   assert(Math.abs((await page.locator('.site-footer').boundingBox()).y+(await page.locator('.site-footer').boundingBox()).height-1440)<2,'resized viewport footer cutoff');
   await page.locator('.footer-link').click();await page.waitForURL(base+'works/');
   assert.deepEqual(errors,[]);
 }
 await fs.writeFile(`reports/layout-${baseline?'baseline':'results'}.json`,JSON.stringify({status:baseline?'observed':'passed',browser:browser.version(),cases:results,errors,note:'Local CSS viewport sizing, including fullscreen-size and zoom-equivalent widths; not a real Windows F11/zoom session.'},null,2));
 console.log(JSON.stringify({status:baseline?'observed':'passed',cases:results.length,metrics:results.filter(x=>x.width===2560).map(({route,viewportWidth,viewportHeight,footer})=>({route,viewportWidth,viewportHeight,footer})),errors},null,2));
}finally{await browser?.close();server.close();}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadContent} from '../scripts/content.mjs';
async function fixture(fn){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'jqy-content-'));
 await fs.cp('content',path.join(root,'content'),{recursive:true});await fs.cp('assets',path.join(root,'assets'),{recursive:true});
 try{await fn(root)}finally{await fs.rm(root,{recursive:true,force:true})}
}
test('50 independent published samples and nine distinct homepage references',async()=>{const r=await loadContent();assert.equal(r.records.length,50);assert.equal(new Set(r.records.map(a=>a.image)).size,50);assert.equal(new Set([r.home.hero,...r.home.selected]).size,9)});
test('duplicate URL is rejected with filename',()=>fixture(async root=>{const p=path.join(root,'content/demo/sample-02.md');await fs.writeFile(p,(await fs.readFile(p,'utf8')).replace('slug: sample-02','slug: sample-01'));await assert.rejects(()=>loadContent(root),/sample-02.md: slug 重复/)}));
test('missing main image is rejected',()=>fixture(async root=>{await fs.unlink(path.join(root,'assets/demo/sample-01.svg'));await assert.rejects(()=>loadContent(root),/图片不存在或损坏/)}));
test('retiring selected work reports broken homepage reference',()=>fixture(async root=>{const p=path.join(root,'content/demo/sample-01.md');await fs.writeFile(p,(await fs.readFile(p,'utf8')).replace('status: published','status: draft'));await assert.rejects(()=>loadContent(root),/首页引用 sample-01/)}));
test('retired non-featured work disappears',()=>fixture(async root=>{const p=path.join(root,'content/demo/sample-50.md');await fs.writeFile(p,(await fs.readFile(p,'utf8')).replace('status: published','status: draft'));assert.equal((await loadContent(root)).records.length,49)}));
test('empty optional story and metadata are accepted',async()=>{const r=await loadContent();const art=r.records.find(a=>a.id==='sample-03');assert.equal(art.body.trim(),'');assert.equal(art.year,undefined)});
test('raw HTML is rejected before Markdown rendering',()=>fixture(async root=>{await fs.appendFile(path.join(root,'content/demo/sample-01.md'),'\n<script>alert(1)</script>');await assert.rejects(()=>loadContent(root),/禁止 HTML/)}));
test('draft files can be incomplete but must have unique ID and slug',()=>fixture(async root=>{await fs.writeFile(path.join(root,'content/demo/draft.md'),'---\nid: draft\nslug: draft\nstatus: draft\norder: 100\nisPlaceholder: true\n---\n');assert.equal((await loadContent(root)).records.length,50)}));
test('live publication rejects all placeholders',()=>fixture(async root=>{await fs.copyFile(path.join(root,'content/demo/sample-01.md'),path.join(root,'content/artworks/sample-01.md'));await assert.rejects(()=>loadContent(root,{mode:'live'}),/禁止发布占位作品/)}));
test('live publication rejects empty collection',()=>fixture(async root=>{await assert.rejects(()=>loadContent(root,{mode:'live'}),/至少需要一件/)}));

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import {loadContent} from './content.mjs';

const {site, home, records} = await loadContent();
await fs.mkdir('src/generated', {recursive:true});
await fs.mkdir('.cache/images', {recursive:true});
const manifest = [], artworks = {};
const imageRecords=site.portrait?[...records,{id:'artist-portrait',images:[site.portrait]}]:records;
for (const art of imageRecords) {
  const processed = [];
  for (const [i, img] of art.images.entries()) {
    const input = await fs.readFile(img.image);
    const hash = createHash('sha256').update(input).update('srgb-v2-webp84-jpeg88').digest('hex').slice(0,14);
    const maxWidth = Math.min(img.width, Math.floor(2000 * Math.min(1,img.width/img.height)));
    const widths = [...new Set([320,640,960,1440,maxWidth].filter(w => w <= maxWidth))].sort((a,b)=>a-b);
    const variants = [];
    for (const w of widths) {
      const file = `${art.id}-${i}-${hash}-${w}.webp`;
      const cache = `.cache/images/${file}`;
      try { await fs.access(cache); } catch {
        await sharp(input).rotate().resize({width:w,withoutEnlargement:true}).toColourspace('srgb').webp({quality:84,effort:5}).toFile(cache);
      }
      const bytes = (await fs.stat(cache)).size;
      const height = Math.round(w*img.height/img.width);
      variants.push({src:`media/${file}`,width:w,height,bytes});
      manifest.push({id:art.id, image:i, role:w<=960?'thumbnail':'display',format:'webp',path:`media/${file}`,width:w,height,bytes});
    }
    const fallbackWidth = widths.find(w => w>=960) || maxWidth;
    const fallbackFile = `${art.id}-${i}-${hash}-fallback.jpg`;
    const fallbackCache = `.cache/images/${fallbackFile}`;
    try {await fs.access(fallbackCache);} catch {
      await sharp(input).rotate().resize({width:fallbackWidth,withoutEnlargement:true}).flatten({background:'#f3f2ed'}).toColourspace('srgb').jpeg({quality:88,mozjpeg:true}).toFile(fallbackCache);
    }
    manifest.push({id:art.id,image:i,role:'fallback',format:'jpeg',path:`media/${fallbackFile}`,width:fallbackWidth,height:Math.round(fallbackWidth*img.height/img.width),bytes:(await fs.stat(fallbackCache)).size});
    // An optional approved detail derivative is never referenced by an <img> until requested.
    let high = null;
    if (art.allowHighResolution && Math.max(img.width,img.height)>2000) {
      const file = `${art.id}-${i}-${hash}-detail.webp`;
      const cache = `.cache/images/${file}`;
      try { await fs.access(cache); } catch {
        await sharp(input).rotate().resize({width:3200,height:3200,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').webp({quality:90,effort:5}).toFile(cache);
      }
      const m=await sharp(cache).metadata();
      high={src:`media/${file}`,width:m.width,height:m.height,bytes:(await fs.stat(cache)).size};
      manifest.push({id:art.id,image:i,role:'detail',format:'webp',path:high.src,width:m.width,height:m.height,bytes:high.bytes});
    }
    processed.push({width:img.width,height:img.height,alt:img.alt,caption:img.caption || '',variants,fallback:`media/${fallbackFile}`,high});
  }
  artworks[art.id] = processed;
}
await fs.writeFile('src/generated/images.json', JSON.stringify(artworks));
await fs.writeFile('src/generated/site.json', JSON.stringify({...site,activeHome:home}));
await fs.mkdir('reports', {recursive:true});
await fs.writeFile('reports/image-manifest.json', JSON.stringify(manifest,null,2));
await fs.writeFile('src/generated/manifest.json', JSON.stringify(records.map(a=>({id:a.id,slug:a.slug,title:a.title})),null,2));
console.log(`Content ready: ${site.mode} / ${records.length} works / ${manifest.length} image derivatives. Source images excluded from public output.`);

import fs from 'node:fs/promises';
// Neutral numbered layout panels, never represented as paintings.
await fs.mkdir('assets/demo',{recursive:true});
await fs.mkdir('content/demo',{recursive:true});
await fs.mkdir('content/artworks',{recursive:true});
await fs.mkdir('assets/artworks',{recursive:true});
const shapes=[[1200,1500],[1500,1100],[1050,1400],[1300,1300],[1600,1000],[1200,1500],[1500,1100],[1100,1500],[1500,1200],[1800,650],[650,1800]];
const tones=['#76836c','#d1c6b5','#a9b8b1','#c6b0a2','#b1b995','#adb1ba','#c8c5b5','#93a497','#bdbaa8','#c7b3a5'];
for(let i=1;i<=50;i++){
  const n=String(i).padStart(2,'0'), id=`sample-${n}`;
  const [w,h]=shapes[(i-1)%shapes.length];
  const color=tones[(i-1)%tones.length];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${color}"/><rect x="${w*.075}" y="${h*.075}" width="${w*.85}" height="${h*.85}" fill="none" stroke="#26392c" stroke-opacity=".2" stroke-width="2"/><path d="M${w*.45} ${h*.5}h${w*.1}M${w*.5} ${h*.5-w*.05}v${w*.1}" stroke="#26392c" stroke-opacity=".2" stroke-width="2"/><text x="${w*.5}" y="${h*.52}" text-anchor="middle" font-family="serif" font-style="italic" font-size="${Math.min(w,h)*.32}" fill="#26392c" fill-opacity=".52">${n}</text><text x="${w*.1}" y="${h*.87}" font-family="sans-serif" letter-spacing="3" font-size="${Math.max(15,Math.min(w,h)*.016)}" fill="#26392c">LAYOUT STUDY / ${n}</text></svg>`;
  await fs.writeFile(`assets/demo/${id}.svg`,svg);
  const story=i===1?'\n## 关于这幅作品\n\n这里为创作故事预留阅读空间。正式作品的主题、创作背景与心境，将由艺术家提供并确认。\n\n目前展示的是编号版式样本，颜色与比例仅用于检查浏览体验，不代表艺术家的画作。\n':i===2?'\n这是一段简短说明的版式样本。没有长篇故事时，详情页仍然保持完整、自然的阅读节奏。\n':'';
  await fs.writeFile(`content/demo/${id}.md`,`---\nid: ${id}\nslug: ${id}\ntitle: "版式样本 ${n}"\nstatus: published\norder: ${i}\nisPlaceholder: true\nimage: assets/demo/${id}.svg\nalt: "编号 ${n} 的色块排版样本，非艺术家作品"\nallowHighResolution: false\n---\n${story}`);
}
console.log('50 independent demo panels generated.');

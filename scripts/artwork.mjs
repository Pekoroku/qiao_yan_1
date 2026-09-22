import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createInterface} from 'node:readline/promises';
const [action,...args]=process.argv.slice(2);
const valid=s=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
if(action==='new'){
  const input=createInterface({input:process.stdin,output:process.stdout});
  try{
    const id=args[0]||await input.question('作品固定编号（例如 work-001）：');
    if(!valid(id))throw Error('编号仅使用小写英文、数字和连字符');
    const title=args[1]||await input.question('作品名称：');
    const file=`content/artworks/${id}.md`;
    await fs.mkdir('content/artworks',{recursive:true});
    const text=`---\nid: ${id}\nslug: ${id}\ntitle: ${JSON.stringify(title)}\nstatus: draft\norder: 100\nisPlaceholder: false\nimage: assets/artworks/${id}/main.jpg\nalt: ""\nyear: ""\nmedium: ""\ndimensions: ""\nseries: ""\nsummary: ""\nallowHighResolution: false\ndetailImages: []\n---\n\n`;
    await fs.writeFile(file,text,{flag:'wx'});
    console.log(`已创建草稿：${file}\n请填入图片描述 alt、基本资料及正文。确认公开后改 status: published，并在 content/site.json 选择正式模式 live。`);
  }finally{input.close()}
}else if(action==='image'){
  const [source,id,slot='main']=args;
  if(!source||!valid(id||'')||!valid(slot))throw Error('用法：npm run artwork:image -- "图片完整路径" work-001 [main 或 detail-01]');
  const folder=`assets/artworks/${id}`,dest=path.join(folder,`${slot}.jpg`);
  await fs.mkdir(folder,{recursive:true});
  try{await fs.access(dest);throw Error(`文件已存在：${dest}。为避免误覆盖，请使用新 slot 名称，再修改作品资料的 image 引用。`);}catch(e){if(e.code!=='ENOENT')throw e;}
  await sharp(source).rotate().resize({width:3600,height:3600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).toColourspace('srgb').jpeg({quality:94,mozjpeg:true}).toFile(dest);
  console.log(`已生成移除元数据的 sRGB 网页处理源图：${dest}\n原文件未修改。请人工核对色彩与细节，再允许公开；不要把存档母版上传到仓库。`);
}else throw Error('命令应为 new 或 image');

import fs from 'node:fs/promises';
import path from 'node:path';
const manifest=JSON.parse(await fs.readFile('reports/image-manifest.json','utf8'));
const destination=process.argv.includes('--dev')?'public/media':'dist/media';
await fs.mkdir(destination,{recursive:true});
const allow=new Set(manifest.map(i=>path.basename(i.path)));
for(const file of await fs.readdir(destination))if(!allow.has(file))await fs.unlink(path.join(destination,file));
for(const item of manifest)await fs.copyFile(path.join('.cache/images',path.basename(item.path)),path.join(destination,path.basename(item.path)));
if(!process.argv.includes('--dev')){
  // Build-only server chunks are never part of the static public site.
  async function removeGeneratedTree(directory){
    let entries;try{entries=await fs.readdir(directory,{withFileTypes:true})}catch(e){if(e.code==='ENOENT')return;throw e;}
    for(const entry of entries){const target=path.join(directory,entry.name);if(entry.isDirectory())await removeGeneratedTree(target);else await fs.unlink(target);}
    await fs.rmdir(directory);
  }
  await removeGeneratedTree('dist/.prerender');
  const works=JSON.parse(await fs.readFile('src/generated/manifest.json','utf8'));
  const slugs=new Set(works.map(a=>a.slug));
  for(const entry of await fs.readdir('dist/works',{withFileTypes:true})){
    if(entry.isDirectory()&&!slugs.has(entry.name)){
      try{await fs.unlink(path.join('dist/works',entry.name,'index.html'))}catch(e){if(e.code!=='ENOENT')throw e;}
    }
  }
}

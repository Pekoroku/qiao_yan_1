import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
// Rotate generated trees atomically before rebuilding. Never merge a new
// publication into old files. Recent trees stay in ignored .cache/retired.
export async function emptyDirectory(directory){
  await fs.mkdir('.cache/retired',{recursive:true});
  try{await fs.rename(directory,path.join('.cache/retired',`${path.basename(directory)}-${randomUUID()}`));}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.mkdir(directory,{recursive:true});
}

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist'),port=Number(process.env.PORT||4321);
try{await fs.access(path.join(root,'index.html'))}catch{console.error('未找到 dist/index.html。请先运行 npm ci 和 npm run build。');process.exit(1)}
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain','.xml':'application/xml'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,`.${pathname}`);if(file!==root&&!file.startsWith(root+path.sep))throw Error();const stat=await fs.stat(file);if(stat.isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await fs.readFile(file));}catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await fs.readFile(path.join(root,'404.html')))}}).listen(port,'127.0.0.1',()=>console.log(`预览已启动：http://127.0.0.1:${port}/\n在浏览器打开此地址。按 Ctrl+C 停止。`));

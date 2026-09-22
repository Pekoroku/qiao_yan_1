import type {APIRoute} from 'astro';
import {artworks,site,url} from '../lib/content';
export const GET:APIRoute=async({site:origin})=>{
  const paths=site.mode==='live'?['','works/','about/','contact/',...(await artworks()).map(a=>`works/${a.data.slug}/`)]:[];
  const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${escape(new URL(url(p),origin).href)}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});
};

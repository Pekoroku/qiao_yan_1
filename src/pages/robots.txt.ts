import type {APIRoute} from 'astro';
import {site,url} from '../lib/content';
export const GET:APIRoute=({site:origin})=>new Response(site.mode==='demo'?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${new URL(url('sitemap.xml'),origin)}\n`,{headers:{'Content-Type':'text/plain'}});

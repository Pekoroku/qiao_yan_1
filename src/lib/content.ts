import {getCollection} from 'astro:content';
import rawImages from '../generated/images.json';
import rawSite from '../generated/site.json';
import manifest from '../generated/manifest.json';
export interface SiteConfig {name:string;mode:'demo'|'live';description:string;intro:string;about:string[];portrait?:{image:string;alt:string};exhibitions:{year:string;title:string;venue:string}[];email:string;socials:{label:string;url:string}[];activeHome:{hero:string;selected:string[]}}
export const site=rawSite as SiteConfig;
export interface ImageSet {width:number;height:number;alt:string;caption:string;variants:{src:string;width:number;height:number;bytes:number}[];fallback:string;high:{src:string;width:number;height:number;bytes:number}|null}
export const images=rawImages as Record<string,ImageSet[]>;
const publishedIds=new Set(manifest.map(art=>art.id));
export async function artworks(){return (await getCollection('artworks',({id,data})=>publishedIds.has(id)&&data.status==='published')).sort((a,b)=>a.data.order-b.data.order||a.id.localeCompare(b.id));}
export const url=(p='')=>`${import.meta.env.BASE_URL.replace(/\/$/,'')}/${p.replace(/^\//,'')}`;

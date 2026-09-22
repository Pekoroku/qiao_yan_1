import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {z} from 'astro/zod';
import site from './generated/site.json';
const artworks = defineCollection({
  loader: glob({pattern:'*.md',base:site.mode === 'demo'?'./content/demo':'./content/artworks', generateId:({data})=>String(data.id)}),
  schema:z.object({
    id:z.string(),slug:z.string(),title:z.string().default(''),status:z.enum(['draft','published']),
    order:z.number(),isPlaceholder:z.boolean(),image:z.string().default(''),alt:z.string().default(''),
    year:z.string().optional(),medium:z.string().optional(),dimensions:z.string().optional(),series:z.string().optional(),summary:z.string().optional(),
    allowHighResolution:z.boolean().default(false),detailImages:z.array(z.object({image:z.string(),alt:z.string(),caption:z.string().optional()})).default([])
  })
});
export const collections={artworks};

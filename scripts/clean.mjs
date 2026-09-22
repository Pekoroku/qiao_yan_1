import {emptyDirectory} from './fs-utils.mjs';
// Always publish a fresh output tree: retired files must not survive repeated builds.
await emptyDirectory('dist');
await emptyDirectory('.astro');
await emptyDirectory('.cache/astro');
await emptyDirectory('public/media');

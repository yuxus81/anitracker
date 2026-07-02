// GitHub Pages serves `404.html` for any unknown path. For a single-page app
// with client-side routing we simply copy the built index.html to 404.html so
// deep links (e.g. /anitracker/watchlist) boot the app and let the router take over.
import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.cwd(), 'dist');
const index = path.join(dist, 'index.html');
const fallback = path.join(dist, '404.html');

try {
  await access(index, constants.F_OK);
  await copyFile(index, fallback);
  console.log('[spa-fallback] dist/index.html -> dist/404.html');
} catch (err) {
  console.error('[spa-fallback] could not create 404.html:', err.message);
  process.exit(1);
}

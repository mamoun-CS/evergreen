import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function checkCategoryAssets(root = process.cwd()) {
  const assets = JSON.parse(readFileSync(resolve(root, 'data/catalog-category-assets.json'), 'utf8'));
  const publicDir = resolve(root, 'public');
  for (const asset of assets) {
    const file = resolve(publicDir, `.${asset.localImage}`);
    if (!file.startsWith(`${publicDir}${sep}`) || !existsSync(file)) {
      throw new Error(`Missing category image: ${asset.slug}. Upload public/categories before building.`);
    }
  }
}

function runPrisma(args) {
  const require = createRequire(import.meta.url);
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
    cwd: process.cwd(), stdio: 'inherit', env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`prisma ${args.join(' ')} failed. Build stopped. Check database connectivity and migration history; see deploy/README.md.`);
  }
}

export function prepareBuild({ check = checkCategoryAssets, run = runPrisma } = {}) {
  check();
  // migrate deploy applies each committed migration once, including catalog data.
  // Never reset or automatically baseline an existing production database.
  run(['migrate', 'deploy']);
  run(['generate']);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.includes('--check')) {
      checkCategoryAssets();
      console.log('Build assets verified. No database changes were made.');
    } else {
      prepareBuild();
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Build preparation failed.');
    process.exitCode = 1;
  }
}

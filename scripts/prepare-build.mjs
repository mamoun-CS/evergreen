import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

/** Server code must not list public/ at runtime: file tracing would copy the
 * whole product image folder (~1 GB) into the server function. */
export function writeProductWebpManifest(root = process.cwd()) {
  const directory = resolve(root, 'public/products');
  const names = existsSync(directory)
    ? readdirSync(directory).filter((name) => name.toLowerCase().endsWith('.webp')).sort()
    : [];
  writeFileSync(resolve(root, 'src/lib/product-webp-names.json'), `${JSON.stringify(names, null, 0)}\n`);
}

function runPrisma(args) {
  const require = createRequire(import.meta.url);
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
    cwd: process.cwd(), stdio: 'inherit', env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const hint = args[0] === 'generate'
      ? 'Client generation failed. On Windows, stop the local dev server if the Prisma engine file is locked (EPERM).'
      : 'Check database connectivity and migration history; see deploy/README.md.';
    throw new Error(`prisma ${args.join(' ')} failed. Build stopped. ${hint}`);
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
    writeProductWebpManifest();
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

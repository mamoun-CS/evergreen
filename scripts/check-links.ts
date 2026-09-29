import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';

loadEnvConfig(process.cwd());

const appDirectory = path.join(process.cwd(), 'src/app');
const scanDirectories = [path.join(process.cwd(), 'src/app'), path.join(process.cwd(), 'src/components')];
const prisma = new PrismaClient();

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? walk(path.join(directory, entry.name))
    : Promise.resolve([path.join(directory, entry.name)])));
  return nested.flat();
}

function routePattern(file: string): RegExp | null {
  const relative = path.relative(appDirectory, file).replaceAll(path.sep, '/');
  if (!/(^|\/)(page\.(tsx|ts)|route\.(tsx|ts))$/.test(relative)) return null;
  const route = relative.replace(/\/(page|route)\.(tsx|ts)$/, '').replace(/^(page|route)\.(tsx|ts)$/, '');
  const segments = route.split('/').filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  const expression = segments.map((segment) => {
    if (/^\[\.\.\..+\]$/.test(segment)) return '.+';
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return '.*';
    if (/^\[.+\]$/.test(segment)) return '[^/]+';
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return new RegExp(`^/${expression}/?$`);
}

function cleanPath(href: string): string | null {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('${')) return null;
  const pathname = href.split(/[?#]/, 1)[0] || '/';
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
}

async function main() {
  const files = (await Promise.all(scanDirectories.map(walk))).flat();
  const routes = files.map(routePattern).filter((route): route is RegExp => Boolean(route));
  const links: Array<{ source: string; href: string }> = [];
  const patterns = [
    /\b(?:href|url)\s*=\s*\{\s*(['"])(\/[^'"]*)\1\s*\}/g,
    /\b(?:href|url)\s*=\s*(['"])(\/[^'"]*)\1/g,
    /\b(?:href|url)\s*:\s*(['"])(\/[^'"]*)\1/g,
    /\bredirect\s*\(\s*(['"])(\/[^'"]*)\1/g,
  ];

  for (const file of files.filter((entry) => /\.(tsx?|jsx?)$/.test(entry))) {
    const source = await readFile(file, 'utf8');
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) links.push({ source: path.relative(process.cwd(), file), href: match[2] });
    }
  }

  let navItems: Array<{ url: string }>;
  try {
    navItems = await prisma.navigationItem.findMany({ where: { isActive: true }, select: { url: true } });
  } catch {
    throw new Error('Could not read CMS navigation links from PostgreSQL. Ensure DATABASE_URL points to the local store database.');
  }
  for (const item of navItems) links.push({ source: 'CMS NavigationItem', href: item.url });

  const failures = links.flatMap(({ source, href }) => {
    const pathname = cleanPath(href);
    return pathname && !routes.some((route) => route.test(pathname)) ? [`${source}: ${href}`] : [];
  });
  if (failures.length) {
    console.error(`Found ${failures.length} internal links without a matching App Router page/route:`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Checked ${links.length} static and CMS internal links against ${routes.length} App Router routes.`);
  }
}

main().finally(() => prisma.$disconnect());

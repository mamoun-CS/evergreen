import 'server-only';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AllowedImageType } from './upload-validation';

const PUBLIC_PREFIX = '/uploads/';

function uploadDirectory() {
  if (process.env.NODE_ENV !== 'production') return path.resolve(process.env.UPLOAD_DIR_DEV?.trim() || '.uploads');
  const configured = process.env.UPLOAD_DIR?.trim();
  return path.resolve(configured || '/var/www/evergreen/uploads');
}

function typeExtension(type: AllowedImageType) {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
}

function safeRelativePath(publicUrl: string) {
  if (!publicUrl.startsWith(PUBLIC_PREFIX)) return null;
  const relative = publicUrl.slice(PUBLIC_PREFIX.length);
  if (!relative || relative.includes('\\') || relative.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  return relative;
}

export async function save(bytes: Buffer, type: AllowedImageType, category = 'products') {
  if (!/^[a-z0-9-]{1,40}$/.test(category)) throw new Error('Invalid upload category');
  const root = uploadDirectory();
  const directory = path.resolve(root, category);
  if (!directory.startsWith(`${root}${path.sep}`)) throw new Error('Invalid upload directory');
  const filename = `${randomUUID()}.${typeExtension(type)}`;
  await mkdir(directory, { recursive: true, mode: 0o750 });
  await writeFile(path.join(directory, filename), bytes, { flag: 'wx', mode: 0o640 });
  return `${PUBLIC_PREFIX}${category}/${filename}`;
}

export async function remove(publicUrl: string) {
  const relative = safeRelativePath(publicUrl);
  if (!relative) return;
  const root = uploadDirectory();
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) return;
  const metadata = await stat(target).catch(() => null);
  if (metadata?.isFile() && metadata.nlink > 1) return;
  try { await unlink(target); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}

export async function removeUnusedImages(oldUrls: string[], retainedUrls: string[]) {
  const retained = new Set(retainedUrls);
  await Promise.all(oldUrls.filter((url) => !retained.has(url)).map((url) => remove(url).catch(() => undefined)));
}

export function getUploadDirectory() {
  return uploadDirectory();
}

export async function get(publicUrlPath: string) {
  const relative = safeRelativePath(publicUrlPath);
  if (!relative) return null;
  const root = uploadDirectory();
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) return null;
  try {
    const metadata = await stat(target);
    if (!metadata.isFile()) return null;
    return { bytes: await readFile(target), path: target };
  } catch { return null; }
}

export function publicUrl(publicUrlPath: string) {
  return safeRelativePath(publicUrlPath) ? publicUrlPath : null;
}

export const deleteImage = remove;
export const getPublicUrl = publicUrl;
export const storeImage = save;

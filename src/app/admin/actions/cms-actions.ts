'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema, SettingsSchema, HomepageSchema, BannerSchema, PageSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath } from 'next/cache';
import { remove, removeUnusedImages } from '@/lib/storage';

export async function updateSiteSettings(data: any) {
  await assertAdmin();
  data = await validate(SettingsSchema, data);
  await prisma.siteSettings.upsert({
    where: { id: 'global' },
    update: data,
    create: { id: 'global', ...data },
  });
  revalidatePath('/', 'layout');
}

export async function upsertHomepageSection(data: any) {
  await assertAdmin();
  data = await validate(HomepageSchema, data);
  await prisma.homepageSection.upsert({
    where: { key: data.key },
    update: data,
    create: data,
  });
  revalidatePath('/');
}

export async function createBanner(data: any) {
  await assertAdmin();
  data = await validate(BannerSchema, data);
  await prisma.banner.create({ data });
  revalidatePath('/');
}

export async function updateBanner(id: string, data: any) {
  await assertAdmin();
  data = await validate(BannerSchema, data);
  await validate(IdSchema, id);
  const previous = await prisma.banner.findUnique({ where: { id }, select: { imageUrl: true } });
  await prisma.banner.update({ where: { id }, data });
  if (previous?.imageUrl) await removeUnusedImages([previous.imageUrl], [data.imageUrl]);
  revalidatePath('/');
}

export async function deleteBanner(id: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  const banner = await prisma.banner.delete({ where: { id } });
  await remove(banner.imageUrl).catch(() => undefined);
  revalidatePath('/');
}

export async function upsertPageContent(slug: string, data: any) {
  await assertAdmin();
  data = await validate(PageSchema, data);
  const previous = await prisma.pageContent.findUnique({ where: { slug }, select: { images: true } });
  await prisma.pageContent.upsert({
    where: { slug },
    update: data,
    create: { slug, ...data },
  });
  if (previous) await removeUnusedImages(previous.images, data.images);
  revalidatePath(`/${slug}`);
}

export async function upsertStorePolicy(slug: string, data: any) {
  await assertAdmin();
  data = await validate(PageSchema.omit({images:true}), data);
  await prisma.storePolicy.upsert({
    where: { slug },
    update: data,
    create: { slug, ...data },
  });
  revalidatePath(`/policies/${slug}`);
}

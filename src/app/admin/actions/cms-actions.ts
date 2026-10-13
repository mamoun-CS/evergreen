'use server';
import { z } from 'zod';
import { validate } from '@/lib/admin-validation';

import { IdSchema, SettingsSchema, HomepageSchema, BannerSchema, PageSchema, SocialLinkSchema } from '@/lib/validation';
import { requirePermission } from '@/lib/auth-middleware';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { remove, removeUnusedImages } from '@/lib/storage';

const AnnouncementBarSchema = z.object({
  textAr: z.string().min(1).max(500),
  textEn: z.string().min(1).max(500),
  linkUrl: z.string().max(2048).optional().nullable(),
  linkTextAr: z.string().max(100).optional().nullable(),
  linkTextEn: z.string().max(100).optional().nullable(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  isActive: z.boolean().optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export async function updateSiteSettings(data: any) {
  await requirePermission('update', 'settings');
  data = await validate(SettingsSchema, data);
  await prisma.siteSettings.upsert({
    where: { id: 'global' },
    update: data,
    create: { id: 'global', ...data },
  });
  revalidatePath('/', 'layout');
  revalidateTag('settings');
}

export async function upsertHomepageSection(data: any) {
  await requirePermission('update', 'content');
  data = await validate(HomepageSchema, data);
  await prisma.homepageSection.upsert({
    where: { key: data.key },
    update: data,
    create: data,
  });
  revalidatePath('/');
  revalidateTag('homepage');
}

/** Updates order and visibility without rewriting the section copy. */
export async function saveHomepageSectionLayout(entries: { id: string; order: number; isActive: boolean }[]) {
  await requirePermission('update', 'content');
  await prisma.$transaction(entries.map((entry) => prisma.homepageSection.update({
    where: { id: entry.id },
    data: { order: entry.order, isActive: entry.isActive },
  })));
  revalidatePath('/');
  revalidateTag('homepage');
}

export async function moveHomepageSection(id: string, direction: 'up' | 'down') {
  await requirePermission('update', 'content');
  await validate(IdSchema, id);
  const sections = await prisma.homepageSection.findMany({ orderBy: [{ order: 'asc' }, { key: 'asc' }] });
  const index = sections.findIndex((section) => section.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sections.length) return;
  const reordered = sections.slice();
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved);
  await prisma.$transaction(reordered.map((section, order) => prisma.homepageSection.update({
    where: { id: section.id },
    data: { order },
  })));
  revalidatePath('/');
  revalidateTag('homepage');
}

export async function createBanner(data: any) {
  await requirePermission('create', 'content');
  data = await validate(BannerSchema, data);
  await prisma.banner.create({ data });
  revalidatePath('/');
  revalidateTag('homepage');
}

export async function updateBanner(id: string, data: any) {
  await requirePermission('update', 'content');
  data = await validate(BannerSchema, data);
  await validate(IdSchema, id);
  const previous = await prisma.banner.findUnique({ where: { id }, select: { imageUrl: true, mobileImageUrl: true } });
  await prisma.banner.update({ where: { id }, data });
  await removeUnusedImages([previous?.imageUrl, previous?.mobileImageUrl].filter(Boolean) as string[], [data.imageUrl, data.mobileImageUrl].filter(Boolean));
  revalidatePath('/');
  revalidateTag('homepage');
}

export async function deleteBanner(id: string) {
  await requirePermission('delete', 'content');
  await validate(IdSchema, id);
  const banner = await prisma.banner.delete({ where: { id } });
  await remove(banner.imageUrl).catch(() => undefined);
  if (banner.mobileImageUrl) await remove(banner.mobileImageUrl).catch(() => undefined);
  revalidatePath('/');
  revalidateTag('homepage');
}

export async function upsertPageContent(slug: string, data: any) {
  await requirePermission('update', 'content');
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
  await requirePermission('update', 'content');
  data = await validate(PageSchema.omit({images:true}), data);
  await prisma.storePolicy.upsert({
    where: { slug },
    update: data,
    create: { slug, ...data },
  });
  revalidatePath(`/policies/${slug}`);
}

export async function createSocialLink(data: any) {
  await requirePermission('create', 'content');
  data = await validate(SocialLinkSchema, data);
  await prisma.socialLink.create({ data });
  revalidatePath('/', 'layout');
}

export async function updateSocialLink(id: string, data: any) {
  await requirePermission('update', 'content');
  data = await validate(SocialLinkSchema, data);
  await validate(IdSchema, id);
  await prisma.socialLink.update({ where: { id }, data });
  revalidatePath('/', 'layout');
}

export async function deleteSocialLink(id: string) {
  await requirePermission('delete', 'content');
  await validate(IdSchema, id);
  await prisma.socialLink.delete({ where: { id } });
  revalidatePath('/', 'layout');
}

export async function createAnnouncementBar(data: any) {
  await requirePermission('create', 'content');
  data = await validate(AnnouncementBarSchema, data);
  await prisma.announcementBar.create({ data });
  revalidatePath('/', 'layout');
  revalidateTag('settings');
}

export async function updateAnnouncementBar(id: string, data: any) {
  await requirePermission('update', 'content');
  data = await validate(AnnouncementBarSchema, data);
  await validate(IdSchema, id);
  await prisma.announcementBar.update({ where: { id }, data });
  revalidatePath('/', 'layout');
  revalidateTag('settings');
}

export async function deleteAnnouncementBar(id: string) {
  await requirePermission('delete', 'content');
  await validate(IdSchema, id);
  await prisma.announcementBar.delete({ where: { id } });
  revalidatePath('/', 'layout');
  revalidateTag('settings');
}

export async function deleteHomepageSection(id: string) {
  await requirePermission('delete', 'content');
  await validate(IdSchema, id);
  const section = await prisma.homepageSection.findUnique({ where: { id } });
  if (section?.key === 'hero') {
    throw new Error('Cannot delete the hero section');
  }
  await prisma.homepageSection.delete({ where: { id } });
  revalidatePath('/');
  revalidateTag('homepage');
}

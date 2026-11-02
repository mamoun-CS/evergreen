import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if TikTok link already exists
  const existing = await prisma.socialLink.findFirst({
    where: { platform: 'tiktok' }
  });

  if (existing) {
    await prisma.socialLink.update({
      where: { id: existing.id },
      data: {
        url: 'https://www.tiktok.com/@evergreen_944',
        labelAr: 'تيك توك',
        labelEn: 'TikTok',
        isActive: true,
      }
    });
    console.log('✓ Updated TikTok link:', existing.id);
  } else {
    const created = await prisma.socialLink.create({
      data: {
        platform: 'tiktok',
        labelAr: 'تيك توك',
        labelEn: 'TikTok',
        url: 'https://www.tiktok.com/@evergreen_944',
        order: 1,
        isActive: true,
      }
    });
    console.log('✓ Created TikTok link:', created.id);
  }
}

main().finally(() => prisma.$disconnect());

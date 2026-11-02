import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const s = await prisma.siteSettings.upsert({
    where: { id: 'global' },
    update: { contactWhatsApp: '+972559401774' },
    create: {
      id: 'global',
      storeNameAr: 'Ever Green',
      storeNameEn: 'Ever Green',
      contactPhone: '0597749188',
      contactWhatsApp: '+972559401774'
    }
  });
  console.log('SiteSettings updated WhatsApp to:', s.contactWhatsApp);
}

main().finally(() => prisma.$disconnect());

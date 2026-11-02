import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCategories() {
  console.log('--- 1. Fixing Categories ---');

  // Fix 1: cmuuzelfp0001gvgyzgznbnwz - nameEn had Arabic text
  const catFountain = await prisma.category.findUnique({
    where: { id: 'cmuuzelfp0001gvgyzgznbnwz' }
  });
  if (catFountain) {
    await prisma.category.update({
      where: { id: catFountain.id },
      data: {
        nameEn: 'Decorative Fountains & Waterfalls',
      }
    });
    console.log('✓ Fixed English name for Decorative Fountains sub-category');
  }

  // Fix 2: cmumkx156000nkq9dd3264ni3 - slug was "alawany-khmr"
  const catVintage = await prisma.category.findUnique({
    where: { id: 'cmumkx156000nkq9dd3264ni3' }
  });
  if (catVintage) {
    await prisma.category.update({
      where: { id: catVintage.id },
      data: {
        slug: 'vintage-pots',
        nameAr: 'أواني وأحواض فينتج',
      }
    });
    console.log('✓ Fixed slug & Arabic name for Vintage Pots');
  }

  // Fix 3: cmumkx15a000pkq9d1ya50chh - "أواني بلاستيكية +أواني EDA" (has spacing issue +أواني)
  const catPlasticEDA = await prisma.category.findUnique({
    where: { id: 'cmumkx15a000pkq9d1ya50chh' }
  });
  if (catPlasticEDA) {
    await prisma.category.update({
      where: { id: catPlasticEDA.id },
      data: {
        nameAr: 'أواني بلاستيكية ومجموعات EDA',
      }
    });
    console.log('✓ Fixed Arabic name formatting for Plastic & EDA Pots');
  }

  // Fix 4: cmumkx14p000bkq9d2n83u8h8 - slug was alqdwr-albrazylya
  const catBrazilian = await prisma.category.findUnique({
    where: { id: 'cmumkx14p000bkq9d2n83u8h8' }
  });
  if (catBrazilian) {
    await prisma.category.update({
      where: { id: catBrazilian.id },
      data: {
        nameAr: 'أواني وأحواض برازيلية',
        slug: 'brazilian-pots'
      }
    });
    console.log('✓ Fixed Brazilian pots naming & slug');
  }

  // Fix 5: cmumkx14r000ckq9dbr4wv2vl - slug was alawany-walmzarawn-almtlya-balkhshb-altbyay
  const catWood = await prisma.category.findUnique({
    where: { id: 'cmumkx14r000ckq9dbr4wv2vl' }
  });
  if (catWood) {
    await prisma.category.update({
      where: { id: catWood.id },
      data: {
        slug: 'wood-coated-planters'
      }
    });
    console.log('✓ Cleaned up slug for wood-coated planters');
  }
}

async function fixProductTranslations() {
  console.log('\n--- 2. Fixing Product Translations ---');

  // Let's get products that have weird translations in nameAr
  const products = await prisma.product.findMany({
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      descriptionAr: true,
    }
  });

  let updatedCount = 0;

  for (const p of products) {
    let newNameAr = p.nameAr;
    let newNameEn = p.nameEn;
    let changed = false;

    // 1. If nameAr has no Arabic letters at all (e.g. English string in Arabic field)
    const hasArabicInNameAr = /[\u0600-\u06FF]/.test(newNameAr);
    if (!hasArabicInNameAr) {
      // Common standalone English names in database:
      if (/3 tier shelf/i.test(newNameAr)) {
        newNameAr = 'رف زراعي 3 أدوار';
        changed = true;
      } else if (/Stand for 3 pots \+ base/i.test(newNameAr)) {
        newNameAr = 'حامل لـ 3 أواني مع قاعدة';
        changed = true;
      } else if (/Rounded decorative stand for a tall flower pot/i.test(newNameAr)) {
        newNameAr = 'حامل ديكوري دائري لحوض زهور طويل';
        changed = true;
      }
    }

    // 2. Fix "زارع" -> "أصيص" or "حوض زرع"
    if (newNameAr.startsWith('زارع ')) {
      newNameAr = newNameAr.replace(/^زارع\s+/, 'أصيص ');
      changed = true;
    } else if (newNameAr === 'زارع') {
      newNameAr = 'أصيص زرع';
      changed = true;
    } else if (newNameAr.includes(' زارع ')) {
      newNameAr = newNameAr.replace(/\s+زارع\s+/g, ' أصيص ');
      changed = true;
    }

    // 3. Fix literal "على الساقين" -> "بأرجل"
    if (newNameAr.includes('على الساقين')) {
      newNameAr = newNameAr.replace(/على الساقين/g, 'بأرجل');
      changed = true;
    }

    // 4. Fix literal "طويل القامة" when referring to pots/planters -> "طويل" أو "عمودي"
    if (newNameAr.includes('طويل القامة')) {
      newNameAr = newNameAr.replace(/طويل القامة/g, 'طويل');
      changed = true;
    }

    // 5. Fix "بندقية الري" / "الري بالبندقية" / "الري بالمسدس" -> "مسدس ري"
    if (newNameAr.includes('بندقية الري')) {
      newNameAr = newNameAr.replace(/بندقية الري/g, 'مسدس ري');
      changed = true;
    }
    if (newNameAr.includes('الري بالبندقية')) {
      newNameAr = newNameAr.replace(/الري بالبندقية/g, 'مسدس ري');
      changed = true;
    }
    if (newNameAr.includes('الري بالمسدس')) {
      newNameAr = newNameAr.replace(/الري بالمسدس/g, 'مسدس ري');
      changed = true;
    }
    if (newNameAr.includes('رأس الري بالبندقية')) {
      newNameAr = newNameAr.replace(/رأس الري بالبندقية/g, 'فوهة مسدس ري');
      changed = true;
    }

    // 6. Fix "زارع الطين" -> "أصيص فخار (تيراكوتا)"
    if (newNameAr.includes('زارع الطين')) {
      newNameAr = newNameAr.replace(/زارع الطين/g, 'أصيص فخار');
      changed = true;
    }

    // Fix nameEn if it had "Gun Irrigation"
    if (/Gun Irrigation/i.test(newNameEn)) {
      newNameEn = newNameEn.replace(/Gun Irrigation/gi, 'Spray Nozzle / Irrigation Gun');
      changed = true;
    }

    if (changed) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          nameAr: newNameAr,
          nameEn: newNameEn
        }
      });
      updatedCount++;
    }
  }

  console.log(`✓ Successfully updated translations for ${updatedCount} products.`);
}

async function main() {
  await fixCategories();
  await fixProductTranslations();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Precise translations for Green Wall products
const GREEN_WALL_NAMES: Record<string, { ar: string; en: string }> = {
  // 1. Neve Farihah
  'cmvw4izis0030atz5eeiz2wl8': {
    ar: 'جدار نباتي أخضر صناعي موديل واحة الأزهار (100×100 سم)',
    en: 'Artificial Green Wall Neve Farihah Model 1x1m (100x100cm)'
  },
  // 2. Wild tropical forest
  'cmvw4j1t401mratz57j2yec7z': {
    ar: 'جدار نباتي أخضر صناعي موديل الغابة الاستوائية (100×100 سم)',
    en: 'Artificial Green Wall Wild Tropical Forest Model 1x1m (100x100cm)'
  },
  // 3. Forest waves
  'cmvw4j1t901muatz5kf8v9cz9': {
    ar: 'جدار نباتي أخضر صناعي موديل تموجات الغابة (100×100 سم)',
    en: 'Artificial Green Wall Forest Waves Model 1x1m (100x100cm)'
  },
  // 4. Wild sunset
  'cmvw4j1tf01mxatz57ddkmlch': {
    ar: 'جدار نباتي أخضر صناعي موديل غروب بري ملون (100×100 سم)',
    en: 'Artificial Green Wall Wild Sunset Model 1x1m (100x100cm)'
  },
  // 5. Lavender meadow
  'cmvw4j1tj01n0atz5m70qmerh': {
    ar: 'جدار نباتي أخضر صناعي موديل حقل اللافندر (100×100 سم)',
    en: 'Artificial Green Wall Lavender Meadow Model 1x1m (100x100cm)'
  },
  // 6. Eden ivy
  'cmvw4j1tp01n3atz599l0o67e': {
    ar: 'جدار نباتي أخضر صناعي موديل لبلاب عدن (100×100 سم)',
    en: 'Artificial Green Wall Eden Ivy Model 1x1m (100x100cm)'
  },
  // 7. Thick jungle
  'cmvw4j3b802iratz50k7781gl': {
    ar: 'جدار نباتي أخضر صناعي موديل أدغال كثيفة (100×100 سم)',
    en: 'Artificial Green Wall Thick Jungle Model 1x1m (100x100cm)'
  },
  // 8. Ferns
  'cmvw4j3p302sxatz5ucz7f862': {
    ar: 'جدار نباتي أخضر صناعي موديل نباتات السرخس (100×100 سم)',
    en: 'Artificial Green Wall Ferns Model 1x1m (100x100cm)'
  },
  // 9. Spring bougainvillea
  'cmvw4j3p802t0atz55a0zgp0t': {
    ar: 'جدار نباتي أخضر صناعي موديل جهنمية ربيعية (100×100 سم)',
    en: 'Artificial Green Wall Spring Bougainvillea Model 1x1m (100x100cm)'
  },
  // 10. Burgundy velvet
  'cmvw4j3pc02t3atz5v29ctnjx': {
    ar: 'جدار نباتي أخضر صناعي موديل المخمل العنابي (100×100 سم)',
    en: 'Artificial Green Wall Burgundy Velvet Model 1x1m (100x100cm)'
  },
  // 11. Forest touch
  'cmvw4j3ph02t6atz5fy4c6zni': {
    ar: 'جدار نباتي أخضر صناعي موديل لمسة الغابة الطبيعية (100×100 سم)',
    en: 'Artificial Green Wall Forest Touch Model 1x1m (100x100cm)'
  },
  // 12. Ivy mat
  'cmvw4j3pm02t9atz55o2sfwio': {
    ar: 'جدار نباتي أخضر صناعي سجادة لبلاب كلاسيك (100×100 سم)',
    en: 'Artificial Green Wall Ivy Mat Model 1x1m (100x100cm)'
  },
  // 13. Magical willow
  'cmvw4j3pr02tcatz58w2x97y4': {
    ar: 'جدار نباتي أخضر صناعي موديل الصفصاف الساحر (100×100 سم)',
    en: 'Artificial Green Wall Magical Willow Model 1x1m (100x100cm)'
  },
  // 14. Purple spring
  'cmvw4j3pw02tfatz54t32mn78': {
    ar: 'جدار نباتي أخضر صناعي موديل ربيع بنفسجي مزهر (100×100 سم)',
    en: 'Artificial Green Wall Purple Spring Model 1x1m (100x100cm)'
  },
  // 15. Pearls of the forest
  'cmvw4j3q202tiatz547xhugxe': {
    ar: 'جدار نباتي أخضر صناعي موديل لؤلؤ الغابة (100×100 سم)',
    en: 'Artificial Green Wall Forest Pearls Model 1x1m (100x100cm)'
  },
  // 16. Evergreen
  'cmvw4j4ln03c3atz50qo4euui': {
    ar: 'جدار نباتي أخضر صناعي موديل إيفرجرين الدائم (100×100 سم)',
    en: 'Artificial Green Wall Evergreen Classic Model 1x1m (100x100cm)'
  },
  // 17. Indoor 50x50
  'cmumkx7a20108kq9d6bjynqla': {
    ar: 'بلاطة جدار نباتي أخضر صناعي داخلي مقاس 50×50 سم',
    en: 'Artificial Green Wall Tile Indoor 50x50cm'
  },
  // 18. Bright 1x1
  'cmumkx50r00olkq9dznzxv3pk': {
    ar: 'جدار نباتي أخضر صناعي موديل برايت ناصع (100×100 سم)',
    en: 'Artificial Green Wall Bright Model 1x1m (100x100cm)'
  },
  // 19. Face model
  'cmumkx7950105kq9dlfg0kwcc': {
    ar: 'جدار نباتي أخضر صناعي موديل فيس بارز (100×100 سم)',
    en: 'Artificial Green Wall 3D Face Model 1x1m (100x100cm)'
  },
  // 20. Other standard 1x1 models
  'cmumkx78x0104kq9dp08whz72': {
    ar: 'جدار نباتي أخضر صناعي موديل نيتشر (100×100 سم)',
    en: 'Artificial Green Wall Nature Model 1x1m (100x100cm)'
  },
  'cmumkx50c00oikq9dllpckpl0': {
    ar: 'جدار نباتي أخضر صناعي موديل سوبر جرين (100×100 سم)',
    en: 'Artificial Green Wall Super Green Model 1x1m (100x100cm)'
  },
  'cmumkx50m00okkq9d1lel91qm': {
    ar: 'جدار نباتي أخضر صناعي موديل حديقة فيردي (100×100 سم)',
    en: 'Artificial Green Wall Verdi Garden Model 1x1m (100x100cm)'
  },
  'cmumkx52500oqkq9dhysebuht': {
    ar: 'جدار نباتي أخضر صناعي موديل نباتات برية كثيفة (100×100 سم)',
    en: 'Artificial Green Wall Lush Wild Flora Model 1x1m (100x100cm)'
  },
  'cmumkx53700oukq9dehmqwrks': {
    ar: 'جدار نباتي أخضر صناعي موديل حدائق بابل (100×100 سم)',
    en: 'Artificial Green Wall Babylon Garden Model 1x1m (100x100cm)'
  },
  'cmumkx53j00ovkq9d92rwnjyo': {
    ar: 'جدار نباتي أخضر صناعي موديل أوراق الأوكالبتوس (100×100 سم)',
    en: 'Artificial Green Wall Eucalyptus Leaves Model 1x1m (100x100cm)'
  },
  'cmumkx78p0103kq9d8rmuf4uy': {
    ar: 'جدار نباتي أخضر صناعي موديل ميكس الغابة المتنوع (100×100 سم)',
    en: 'Artificial Green Wall Forest Mix Model 1x1m (100x100cm)'
  }
};

async function main() {
  console.log('Fixing green walls products translation...');
  let count = 0;

  for (const [id, data] of Object.entries(GREEN_WALL_NAMES)) {
    const p = await prisma.product.findUnique({ where: { id } });
    if (p) {
      await prisma.product.update({
        where: { id },
        data: {
          nameAr: data.ar,
          nameEn: data.en
        }
      });
      count++;
    }
  }

  // Also fix any other product anywhere in the database that has "Artificial أخضر" or "everأخضر"
  const allProducts = await prisma.product.findMany({
    where: {
      OR: [
        { nameAr: { contains: 'أخضر' } },
        { nameAr: { contains: 'Artificial' } }
      ]
    },
    select: { id: true, nameAr: true, nameEn: true }
  });

  let extraFixed = 0;
  for (const p of allProducts) {
    let nameAr = p.nameAr;
    let changed = false;

    if (nameAr.includes('Artificial أخضر wall')) {
      nameAr = nameAr.replace(/Artificial\s+أخضر\s+wall/gi, 'جدار نباتي أخضر صناعي');
      changed = true;
    }
    if (nameAr.includes('everأخضر')) {
      nameAr = nameAr.replace(/everأخضر/gi, 'إيفرجرين');
      changed = true;
    }
    if (nameAr.includes('أخضر Model')) {
      nameAr = nameAr.replace(/أخضر\s+Model/gi, 'جدار أخضر موديل');
      changed = true;
    }

    if (changed) {
      await prisma.product.update({
        where: { id: p.id },
        data: { nameAr }
      });
      extraFixed++;
    }
  }

  console.log(`✓ Updated ${count} Green Wall products with professional Arabic & English names.`);
  console.log(`✓ Cleaned up ${extraFixed} other mixed language products.`);
}

main().finally(() => prisma.$disconnect());

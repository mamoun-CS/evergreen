import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

const EXTRA_TERM_MAP: Array<[RegExp, string]> = [
  [/Garden dwarf for planting/gi, 'تمثال قزم حديقة مخصص للزراعة'],
  [/A sheep pot designed for planting/gi, 'أصيص زراعي بتصميم خروف'],
  [/A sheep sculpture for the garden and the yard decorative rustic design/gi, 'مجسم خروف ديكوري للحديقة بتصميم ريفي'],
  [/Firefly on a stick/gi, 'حشرة مضيئة ديكورية على عصا تثبيت'],
  [/Set of (\d+) bowls/gi, 'طقم $1 أوعية ديكورية'],
  [/Set of (\d+) coasters/gi, 'طقم $1 قواعد أواني'],
  [/vintage trophy/gi, 'كأس / إناء زينة فينتج'],
  [/cup bowl/gi, 'وعاء تقديم ديكوري'],
  [/cup\b/gi, 'كأس ديكوري'],
  [/pot\b/gi, 'أصيص'],
  [/bowl\b/gi, 'وعاء زراعي'],
  [/vase\b/gi, 'مزهرية'],
  [/sculpture\b/gi, 'مجسم'],
  [/statue\b/gi, 'تمثال'],
  [/dwarf|gnome/gi, 'قزم حديقة'],
  [/sheep\b/gi, 'خروف'],
  [/bird\b/gi, 'عصفور'],
  [/duck\b/gi, 'بطة'],
  [/frog\b/gi, 'ضفدع'],
  [/snail\b/gi, 'حلزون'],
  [/turtle\b/gi, 'سلحفاة'],
  [/rabbit\b/gi, 'أرنب'],
  [/cat\b/gi, 'قطة'],
  [/dog\b/gi, 'كلب'],
  [/owl\b/gi, 'بومة'],
  [/mushroom\b/gi, 'فطر'],
  [/rustic\b/gi, 'ريفي'],
  [/decorative\b/gi, 'ديكوري'],
  [/garden\b/gi, 'حديقة'],
  [/yard\b/gi, 'فناء'],
  [/stick\b/gi, 'عصا'],
  [/vintage\b/gi, 'فينتج كلاسيكي'],
  [/tray\b/gi, 'صينية'],
  [/basket\b/gi, 'سلة'],
  [/bucket\b/gi, 'دلو'],
  [/watering can/gi, 'مرش مياه يدوي'],
  [/pitcher\b/gi, 'إبريق'],
  [/jar\b/gi, 'جرة'],
  [/plate\b/gi, 'طبق'],
  [/stand\b/gi, 'حامل'],
  [/holder\b/gi, 'حامل'],
  [/metal\b/gi, 'معدني'],
  [/plastic\b/gi, 'بلاستيكي'],
  [/wood|wooden\b/gi, 'خشبي'],
  [/stone\b/gi, 'حجري'],
  [/iron\b/gi, 'حديد']
];

async function main() {
  const products = await prisma.product.findMany({
    where: {
      NOT: {
        nameAr: {
          contains: 'ا'
        }
      }
    },
    select: {
      id: true,
      nameEn: true,
      nameAr: true
    }
  });

  console.log(`Processing remaining ${products.length} products...`);
  let fixed = 0;

  for (const p of products) {
    let ar = p.nameEn;
    for (const [pattern, replacement] of EXTRA_TERM_MAP) {
      ar = ar.replace(pattern, replacement);
    }
    // If text now has Arabic letters
    if (/[\u0600-\u06FF]/.test(ar)) {
      await prisma.product.update({
        where: { id: p.id },
        data: { nameAr: ar }
      });
      fixed++;
    }
  }

  console.log(`✓ Successfully translated ${fixed} more products!`);
}

main().finally(() => prisma.$disconnect());

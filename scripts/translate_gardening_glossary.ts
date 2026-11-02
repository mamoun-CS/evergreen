import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Common botanical, pottery and garden terminology dictionary
const TERM_MAP: Array<[RegExp, string]> = [
  // Stand & Shelves
  [/A stand for a flower pot/gi, 'حامل لحوض الزهور'],
  [/Decorated stand for a flower pot/gi, 'حامل مزخرف لحوض الزهور'],
  [/Stand for (\d+) flower pots/gi, 'حامل لـ $1 أواني زهور'],
  [/Decorated (\d+) potted stand/gi, 'حامل مزخرف لـ $1 أواني زهور'],
  [/Antique hay cart flower pot stand/gi, 'عربة قش أنتيك حاملة لأحواض الزهور'],
  [/Ladder for climbers/gi, 'سلم داعم لنباتات التسلق'],
  [/High climbing fence/gi, 'سياج مرتفع للمتسلقات'],
  [/Wheel bottom with plastic bottom/gi, 'قاعدة عجلات متحركة بقاع بلاستيكي للأحواض'],
  [/Set of (\d+) flower pots/gi, 'طقم $1 أواني زهور'],

  // Core nouns
  [/flower pot(s)?/gi, 'أصيص زهور'],
  [/planter(s)?/gi, 'حوض زراعي'],
  [/saucer(s)?/gi, 'صحن أصيص'],
  [/terracotta/gi, 'تيراكوتا (فخار)'],
  [/ceramic/gi, 'سيراميك'],
  [/glazed/gi, 'مزجج'],
  [/wicker/gi, 'خوص طبيعي'],
  [/bamboo/gi, 'خيزران'],
  [/hanging basket/gi, 'سلة معلقة'],
  [/artificial grass/gi, 'عشب صناعي'],
  [/fountain/gi, 'نافورة'],
  [/waterfall/gi, 'شلال'],
  [/nozzle/gi, 'فوهة رش'],
  [/hose/gi, 'خرطوم ري'],
  [/irrigation/gi, 'ري'],
  [/connector/gi, 'وصلة'],
  [/adapter/gi, 'محول'],
  [/valve/gi, 'محبس'],
  [/dripper/gi, 'منقط'],
  [/sprinkler/gi, 'مرش'],
  [/timer/gi, 'مؤقت'],
  [/pruner(s)?/gi, 'مقص تقليم'],
  [/shears/gi, 'مقص'],
  [/shovel/gi, 'مجرفة'],
  [/rake/gi, 'مشط حدائق'],
  [/gloves/gi, 'قفازات زراعية'],
  [/wheelbarrow/gi, 'عربة حديقة'],
  [/fertilizer/gi, 'سماد'],
  [/compost/gi, 'كمبوست'],
  [/soil/gi, 'تربة زراعية'],
  [/peat moss/gi, 'بيتموس'],
  [/perlite/gi, 'بيرلايت'],

  // Dimensions & qualifiers
  [/diameter/gi, 'قطر'],
  [/height/gi, 'ارتفاع'],
  [/round/gi, 'دائري'],
  [/square/gi, 'مربع'],
  [/rectangular/gi, 'مستطيل'],
  [/oval/gi, 'بيضاوي'],
  [/white/gi, 'أبيض'],
  [/black/gi, 'أسود'],
  [/grey|gray/gi, 'رمادي'],
  [/brown/gi, 'بني'],
  [/green/gi, 'أخضر'],
  [/terracotta color/gi, 'لون فخاري'],
  [/anthracite/gi, 'أنثراسيت (رمادي داكن)'],
  [/beige/gi, 'بيج'],
  [/cm\b/gi, 'سم'],
  [/mm\b/gi, 'ملم'],
  [/m\b/gi, 'متر'],
  [/liter|litre/gi, 'لتر'],
  [/kg\b/gi, 'كغم']
];

async function translateChunk(text: string): Promise<string> {
  let translated = text;
  for (const [pattern, replacement] of TERM_MAP) {
    translated = translated.replace(pattern, replacement);
  }
  return translated;
}

async function main() {
  const missing = await prisma.product.findMany({
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

  console.log(`Starting glossary translation pass for ${missing.length} products...`);
  let translatedCount = 0;

  for (const p of missing) {
    let arName = await translateChunk(p.nameEn);
    // If translation changed something and now has Arabic
    if (/[\u0600-\u06FF]/.test(arName)) {
      await prisma.product.update({
        where: { id: p.id },
        data: { nameAr: arName }
      });
      translatedCount++;
    }
  }

  console.log(`✓ Translated ${translatedCount} products using comprehensive gardening glossary!`);
}

main().finally(() => prisma.$disconnect());

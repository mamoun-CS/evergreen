import { PrismaClient, PurchaseMode, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { applyCatalogCategories } from './catalog-categories';

const prisma = new PrismaClient();

// Idempotent seed: it never deletes existing categories, products, or relations.
const categories = [
  { id: 'garden-fountains-water-features', slug: 'fountains-water-features', nameAr: 'نوافير وشلالات', nameEn: 'Fountains & Water Features' },
  { id: 'garden-statues-ornaments', slug: 'statues-ornaments', nameAr: 'تماثيل وتحف خارجية', nameEn: 'Statues & Outdoor Ornaments' },
  { id: 'garden-pots-planters', slug: 'pots-planters', nameAr: 'أصص وأحواض زراعية', nameEn: 'Pots & Planters' },
  { id: 'garden-lighting', slug: 'garden-lighting', nameAr: 'إضاءة الحدائق', nameEn: 'Garden Lighting' },
  { id: 'garden-outdoor-decor', slug: 'outdoor-decor', nameAr: 'ديكورات خارجية', nameEn: 'Outdoor Decor' },
  { id: 'garden-accessories', slug: 'garden-accessories', nameAr: 'إكسسوارات الحدائق', nameEn: 'Garden Accessories' },
  { id: 'stone-fountains', slug: 'stone-fountains', nameAr: 'نوافير حجرية', nameEn: 'Stone Fountains', parentSlug: 'fountains-water-features' },
  { id: 'modern-fountains', slug: 'modern-fountains', nameAr: 'نوافير عصرية', nameEn: 'Modern Fountains', parentSlug: 'fountains-water-features' },
  { id: 'animal-sculptures', slug: 'animal-sculptures', nameAr: 'مجسمات حيوانات', nameEn: 'Animal Sculptures', parentSlug: 'statues-ornaments' },
  { id: 'floor-planters', slug: 'floor-planters', nameAr: 'أصص أرضية', nameEn: 'Floor Planters', parentSlug: 'pots-planters' },
  { id: 'planters', slug: 'planters', nameAr: 'أواني الزرع', nameEn: 'Planters' },
  { id: 'decoration', slug: 'decoration', nameAr: 'الديكور', nameEn: 'Decoration' },
  { id: 'synthetic-grass', slug: 'alashb-alsnaay', nameAr: 'العشب الصناعي', nameEn: 'Synthetic Grass' },
  { id: 'professional-tools', slug: 'aladwat-almhnya', nameAr: 'أدوات احترافية', nameEn: 'Professional Tools' },
  { id: 'river-pebbles', slug: 'hsa-alnhr', nameAr: 'حصى الأنهار', nameEn: 'River Pebbles' },
  { id: 'planting-mixes', slug: 'khltat-alzra', nameAr: 'خلطات الزراعة', nameEn: 'Planting Mixes' },
  { id: 'bamboo-fences', slug: 'aswar-alkhyzran', nameAr: 'أسوار البامبو', nameEn: 'Bamboo Fences' },
  { id: 'terrace-it', slug: 'terrace-it', nameAr: 'بلاط الشرفات', nameEn: 'TERRACE-IT' },
] as const;

type SeedProduct = {
  slug: string; category: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; price: number;
  discount?: number; material?: string; color?: string; style?: string; featured: boolean;
};

const products: SeedProduct[] = [
  { slug: 'stone-fountain', category: 'stone-fountains', nameAr: 'نافورة حجرية أنيقة', nameEn: 'Elegant Stone Fountain', descriptionAr: 'نافورة خارجية أنيقة تضيف صوت الماء ولمسة مميزة إلى الحديقة.', descriptionEn: 'An elegant outdoor fountain that adds the calming sound of water to your garden.', price: 420, discount: 360, material: 'Stone', style: 'Classic', featured: true },
  { slug: 'modern-cascade-fountain', category: 'modern-fountains', nameAr: 'نافورة شلال عصرية', nameEn: 'Modern Cascade Fountain', descriptionAr: 'نافورة متعددة الطبقات بتصميم عصري للمداخل والحدائق.', descriptionEn: 'A multi-tier contemporary fountain for entrances and gardens.', price: 680, material: 'Cement', style: 'Modern', featured: true },
  { slug: 'garden-statue', category: 'statues-ornaments', nameAr: 'تمثال حديقة ديكوري', nameEn: 'Decorative Garden Statue', descriptionAr: 'قطعة ديكورية خارجية تمنح الحديقة شخصية وأناقة.', descriptionEn: 'An outdoor decorative piece that gives the garden character and elegance.', price: 185, material: 'Resin', color: 'Antique bronze', featured: true },
  { slug: 'stone-lion-sculpture', category: 'animal-sculptures', nameAr: 'مجسم أسد حجري', nameEn: 'Stone Lion Sculpture', descriptionAr: 'مجسم حجري متين يضفي حضورًا مميزًا على مدخل الفيلا.', descriptionEn: 'A durable stone sculpture that brings presence to a villa entrance.', price: 310, material: 'Stone', style: 'Heritage', featured: false },
  { slug: 'ceramic-planter', category: 'floor-planters', nameAr: 'حوض زراعة سيراميك', nameEn: 'Ceramic Garden Planter', descriptionAr: 'حوض سيراميك متين لعرض النباتات والزهور بأسلوب أنيق.', descriptionEn: 'A durable ceramic planter for displaying plants and flowers in style.', price: 95, discount: 75, material: 'Ceramic', color: 'Sand', featured: true },
  { slug: 'tall-fiber-planter', category: 'floor-planters', nameAr: 'حوض زراعة فايبر طويل', nameEn: 'Tall Fiber Planter', descriptionAr: 'حوض خفيف ومقاوم للعوامل الخارجية للنباتات الطويلة.', descriptionEn: 'A lightweight weather-resistant planter for tall plants.', price: 145, material: 'Fiber', color: 'Charcoal', featured: false },
  { slug: 'solar-lantern', category: 'garden-lighting', nameAr: 'فانوس حديقة شمسي', nameEn: 'Solar Garden Lantern', descriptionAr: 'إضاءة خارجية مريحة تعمل بالطاقة الشمسية للممرات والزوايا.', descriptionEn: 'Solar-powered outdoor lighting for pathways and garden corners.', price: 75, discount: 60, material: 'Metal', style: 'Minimal', featured: true },
  { slug: 'pathway-light-set', category: 'garden-lighting', nameAr: 'مجموعة إنارة للممرات', nameEn: 'Pathway Light Set', descriptionAr: 'مجموعة إنارة ناعمة لتحديد ممرات الحديقة.', descriptionEn: 'A soft lighting set for defining garden pathways.', price: 130, material: 'Metal', color: 'Black', featured: false },
  { slug: 'outdoor-wall-decor', category: 'outdoor-decor', nameAr: 'ديكور جداري خارجي', nameEn: 'Outdoor Wall Decor', descriptionAr: 'قطعة فنية مقاومة للعوامل الخارجية لتزيين الجدران والمساحات المفتوحة.', descriptionEn: 'Weather-ready wall art for patios, walls, and open spaces.', price: 135, material: 'Metal', style: 'Modern', featured: true },
  { slug: 'garden-accessory-set', category: 'garden-accessories', nameAr: 'مجموعة إكسسوارات للحديقة', nameEn: 'Garden Accessory Set', descriptionAr: 'مجموعة مختارة من اللمسات الديكورية الصغيرة للحديقة.', descriptionEn: 'A selected set of small decorative finishing touches for the garden.', price: 110, discount: 88, material: 'Resin', featured: false },
  { slug: 'decorative-garden-birdbath', category: 'garden-accessories', nameAr: 'حوض طيور ديكوري', nameEn: 'Decorative Garden Birdbath', descriptionAr: 'قطعة لطيفة تضيف الحياة والهدوء إلى الحديقة.', descriptionEn: 'A charming piece that brings life and calm to the garden.', price: 155, material: 'Cement', featured: true },
];

async function main() {
  console.log('Safely upserting Ever Green garden ornaments and outdoor decor defaults…');
  for (const category of categories) {
    const parent = 'parentSlug' in category ? { connect: { slug: category.parentSlug } } : undefined;
    await prisma.category.upsert({ where: { slug: category.slug }, update: { nameAr: category.nameAr, nameEn: category.nameEn, ...(parent ? { parent } : {}) }, create: { id: category.id, slug: category.slug, nameAr: category.nameAr, nameEn: category.nameEn, ...(parent ? { parent } : {}) } });
  }

  await applyCatalogCategories(prisma);

  // Demo stock is opt-in so a routine seed cannot repopulate the live catalogue.
  for (const product of process.env.SEED_DEMO_PRODUCTS === 'true' ? products : []) {
    const data = {
      nameAr: product.nameAr, nameEn: product.nameEn, descriptionAr: product.descriptionAr, descriptionEn: product.descriptionEn,
      purchaseMode: PurchaseMode.PURCHASABLE, basePrice: product.price, discountPrice: product.discount || null, currency: 'ILS', isAvailable: true, isFeatured: product.featured, stockQuantity: 20,
      material: product.material || null, color: product.color || null, style: product.style || null,
      images: ['/images/background.png'], categories: { connect: { slug: product.category } },
    };
    await prisma.product.upsert({ where: { slug: product.slug }, update: data, create: { id: `product-${product.slug}`, slug: product.slug, ...data } });
  }
  console.log(`Upserted ${categories.length} categories. Demo products: ${process.env.SEED_DEMO_PRODUCTS === 'true' ? products.length : 0}.`);

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: Role.ADMIN, passwordHash, name: adminName },
      create: { email: adminEmail, passwordHash, name: adminName, role: Role.ADMIN },
    });
    console.log(`Upserted admin user: ${adminEmail}`);
  } else {
    console.warn('Skipping admin user creation: ADMIN_EMAIL and ADMIN_PASSWORD must be provided.');
  }
}

main().catch((error) => { console.error('Seed error:', error); process.exit(1); }).finally(async () => prisma.$disconnect());

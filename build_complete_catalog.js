const fs = require('fs');

const BASE_URL = 'https://as-titanum.com/wp-json/wp/v2';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

function cleanHtml(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8230;/g, '...')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAllCategories() {
  console.log('🔹 [1/2] جاري سحب جميع التصنيفات (رئيسية وفرعية)...');
  const catMap = {};
  let page = 1;

  while (true) {
    const res = await fetch(`${BASE_URL}/product_cat?per_page=100&page=${page}`, { headers: HEADERS });
    if (!res.ok) break;
    const items = await res.json();
    if (!items || items.length === 0) break;

    for (const c of items) {
      catMap[c.id] = {
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent,
        link: c.link
      };
    }

    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
    if (page >= totalPages) break;
    page++;
  }

  console.log(`✅ تم استخراج ${Object.keys(catMap).length} تصنيف.`);
  return catMap;
}

async function fetchAllProducts(catMap) {
  console.log('🔹 [2/2] جاري سحب جميع منتجات الموقع الـ 1617 بالكامل...');
  const allProducts = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${BASE_URL}/product?per_page=${perPage}&page=${page}&_embed=1`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.log(`انتهى السحب عند الصفحة ${page}`);
      break;
    }

    const items = await res.json();
    if (!items || items.length === 0) break;

    for (const item of items) {
      // 1. الصورة الرئيسية وكامل أحجامها
      let featuredImage = '';
      let allImageSizes = {};
      try {
        const mediaObj = item._embedded?.['wp:featuredmedia']?.[0];
        if (mediaObj) {
          featuredImage = mediaObj.source_url || '';
          if (mediaObj.media_details?.sizes) {
            for (const [key, val] of Object.entries(mediaObj.media_details.sizes)) {
              allImageSizes[key] = val.source_url;
            }
          }
        }
      } catch (e) {}

      // 2. تصنيف المنتج (رئيسي وفرعي)
      const catIds = item.product_cat || [];
      const mainCategories = [];
      const subCategories = [];

      for (const cid of catIds) {
        const cat = catMap[cid];
        if (!cat) continue;
        if (cat.parent === 0) {
          mainCategories.push({ id: cat.id, name: cat.name, slug: cat.slug, url: cat.link });
        } else {
          const parentCat = catMap[cat.parent];
          if (parentCat) {
            mainCategories.push({ id: parentCat.id, name: parentCat.name, slug: parentCat.slug, url: parentCat.link });
          }
          subCategories.push({ id: cat.id, name: cat.name, slug: cat.slug, parent_id: cat.parent, url: cat.link });
        }
      }

      // إزالة التكرار من التصنيفات
      const uniqueMain = Array.from(new Map(mainCategories.map(m => [m.id, m])).values());
      const uniqueSub = Array.from(new Map(subCategories.map(s => [s.id, s])).values());

      allProducts.push({
        id: item.id,
        sku: item.slug,
        title: cleanHtml(item.title?.rendered),
        main_categories: uniqueMain,
        sub_categories: uniqueSub,
        main_category_names: uniqueMain.map(m => m.name).join(' / ') || 'غير مصنف',
        sub_category_names: uniqueSub.map(s => s.name).join(' / ') || 'بدون تفرع',
        image: featuredImage,
        image_sizes: allImageSizes,
        url: item.link,
        description_text: cleanHtml(item.content?.rendered),
        description_html: item.content?.rendered || '',
        excerpt: cleanHtml(item.excerpt?.rendered),
        date_published: item.date,
        date_modified: item.modified
      });
    }

    console.log(`  - تم سحب صفحة ${page}... (إجمالي المنتجات المسحوبة حتى الآن: ${allProducts.length})`);

    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
    if (page >= totalPages) break;
    page++;
  }

  return allProducts;
}

async function run() {
  const startTime = Date.now();
  const catMap = await fetchAllCategories();
  const products = await fetchAllProducts(catMap);

  const finalOutput = {
    metadata: {
      generated_at: new Date().toISOString(),
      website: 'https://as-titanum.com',
      total_categories: Object.keys(catMap).length,
      total_products: products.length
    },
    products: products
  };

  const outputPath = 'titanum_complete_catalog.json';
  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf-8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 تم بنجاح إنشاء وحفظ ملف JSON كامل وشامل!`);
  console.log(`📁 اسم الملف: ${outputPath}`);
  console.log(`📊 إجمالي المنتجات: ${products.length}`);
  console.log(`⏱️ استغرق السحب: ${elapsed} ثانية.`);
}

run();

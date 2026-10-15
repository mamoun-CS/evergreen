// Verified against the supplier's category cards. Keep these orders consistent
// across the home page, category index and nested category pages.
export const featuredCategorySlugs = [
  'alawany', 'decoration', 'artificial-greenery', 'outdoor-surfaces',
  'gardening-supplies', 'irrigation-systems', 'tools-equipment', 'general',
];

export const decorationCategorySlugs = [
  'fountains-water-features', 'alaamda-alrwmanya', 'statues-ornaments',
  'garden-lighting', 'outdoor-decor',
];

export function orderCategories<T extends { slug: string }>(categories: T[], order: string[]) {
  const rank = (slug: string) => { const index = order.indexOf(slug); return index < 0 ? order.length : index; };
  return [...categories].sort((a, b) => rank(a.slug) - rank(b.slug));
}

export const sourceCategoryLabels: Record<string, [string, string]> = {
  alawany: ['الأواني والأحواض', 'Pots & Planters'],
  decoration: ['الديكور وتحف الحدائق', 'Garden Decor & Ornaments'],
  'alashb-alsnaay': ['عشب صناعي', 'Artificial Grass'],
  'terrace-it': ['تيراس إت — Terrace-It', 'Terrace-It'],
  'aladwat-almhnya': ['أدوات زراعية واحترافية', 'Gardening & Professional Tools'],
  'hsa-alnhr': ['حصى الأنهار', 'River Pebbles'],
  'khltat-alzra': ['خلطات وتربة زراعية', 'Potting Mixtures & Soil'],
  'aswar-alkhyzran': ['أسوار الخيزران', 'Bamboo Fencing'],
  'fountains-water-features': ['نوافير وشلالات', 'Fountains & Water Features'],
  'alaamda-alrwmanya': ['أعمدة رومانية', 'Roman Columns'],
  'altmathyl-altmathyl-walhywanat-walftr': ['تماثيل أقزام وحيوانات وفطر', 'Gnomes, Animals & Mushrooms'],
  'tmathyl-arqam': ['تماثيل شخصيات وأقزام', 'Figure & Gnome Statues'],
  'tmathyl-hywanat-qabla-llzraaa': ['منحوتات حيوانات للزراعة', 'Animal Planters'],
  'tmathyl-hywanat-blastykya': ['منحوتات حيوانات بلاستيكية', 'Plastic Garden Animals'],
  'nbatat-astnaaya': ['نباتات اصطناعية', 'Artificial Plants'],
  'aljdar-alakhdr': ['جدران خضراء', 'Green Walls'],
  'alkwws-walawaya-waljrar-alzkhrfya': ['كؤوس وأوعية وجرار زخرفية', 'Decorative Urns, Bowls & Goblets'],
  'tyrakwta-aytalya': ['أواني تيراكوتا إيطالية', 'Italian Terracotta Pots'],
  'awany-eda': ['أواني EDA', 'EDA Pots'],
  'alawany-alzjajya': ['أواني مزجّجة', 'Glazed Pots'],
  'alqdwr-albrazylya': ['أواني برازيلية', 'Brazilian Pots'],
  'alawany-walmzarawn-almtlya-balkhshb-altbyay': ['أواني وأحواض مكسوّة بالخشب الطبيعي', 'Wood-Coated Pots & Planters'],
  'alawany-altaylandya': ['أواني تايلندية', 'Thai Pots'],
  'mntjat-alkhws-wjwz-alhnd': ['منتجات الخوص وجوز الهند', 'Wicker & Coconut Products'],
  'alawany-khmr': ['أواني فينتج', 'Vintage Pots'],
  'alawany-almadnya': ['أواني معدنية', 'Metal Planters'],
  'alawany-alblastykya': ['أواني بلاستيكية +أواني EDA', 'Plastic & EDA Pots'],
  'awany-kwrtn': ['أواني كورتن', 'Corten Planters'],
  'alsghyra-walmtwsta': ['أواني صغيرة ومتوسطة', 'Small & Medium Pots'],
};

// Provisional owner-approved hierarchy. Order also controls the category pages.
export const categoryChildren: Record<string, string[]> = {
  alawany: ['alawany-alblastykya', 'tyrakwta-aytalya', 'alawany-alzjajya', 'alqdwr-albrazylya', 'alawany-altaylandya', 'alawany-almadnya', 'alawany-walmzarawn-almtlya-balkhshb-altbyay', 'mntjat-alkhws-wjwz-alhnd', 'alawany-khmr', 'alkwws-walawaya-waljrar-alzkhrfya', 'floor-planters', 'alsghyra-walmtwsta'],
  'alawany-almadnya': ['awany-kwrtn'],
  decoration: decorationCategorySlugs,
  'fountains-water-features': ['stone-fountains', 'imported-category-7d0ba1c3ad4e041e', 'modern-fountains', 'nwafyr'],
  'statues-ornaments': ['tmathyl-arqam', 'animal-sculptures', 'mushroom-sculptures', 'tmathyl-hywanat-qabla-llzraaa', 'tmathyl-hywanat-blastykya'],
  'artificial-greenery': ['nbatat-astnaaya', 'aljdar-alakhdr', 'alashb-alsnaay', 'mlhqat-alashb-alsnaay'],
  'outdoor-surfaces': ['terrace-it', 'almdrjat', 'hsa-alnhr', 'altwf-walahjar', 'aswar-alkhyzran'],
  'gardening-supplies': ['khltat-alzra', 'shbkat-alzl', 'aamda-alzraaa-almayya-anzma-alnmw-alamwdy-llmnzl-walshrfa', 'jdawl-alfydanat'],
  'irrigation-systems': ['terraflex', 'mntjat-alry-mn-altytanywm'],
  'tools-equipment': ['aladwat-almhnya', 'arbat-alyd-walarbat'],
};
Object.assign(sourceCategoryLabels, {
  'artificial-greenery': ['النباتات والعشب الصناعي', 'Artificial Plants & Turf'],
  'outdoor-surfaces': ['الأرضيات وتنسيق الحدائق', 'Flooring & Landscaping'],
  'gardening-supplies': ['التربة ومستلزمات الزراعة', 'Soil & Growing Supplies'],
  'irrigation-systems': ['أنظمة ومستلزمات الري', 'Irrigation Systems & Supplies'],
  'tools-equipment': ['الأدوات والمعدات', 'Tools & Equipment'],
  general: ['العام', 'General'],
  'floor-planters': ['أصص أرضية', 'Floor Planters'],
  'stone-fountains': ['نوافير حجرية', 'Stone Fountains'],
  'imported-category-7d0ba1c3ad4e041e': ['نوافير جدارية', 'Wall Fountains'],
  'modern-fountains': ['نوافير عصرية', 'Modern Fountains'],
  nwafyr: ['نوافير وشلالات ديكورية', 'Decorative Fountains & Waterfalls'],
  'statues-ornaments': ['تماثيل ومجسمات', 'Statues & Sculptures'],
  'animal-sculptures': ['مجسمات حيوانات', 'Animal Sculptures'],
  'mushroom-sculptures': ['مجسمات فطر', 'Mushroom Sculptures'],
  'garden-lighting': ['إضاءة الحدائق', 'Garden Lighting'],
  'outdoor-decor': ['إكسسوارات وديكورات خارجية', 'Outdoor Accessories & Decor'],
  'mlhqat-alashb-alsnaay': ['ملحقات تركيب العشب الصناعي', 'Artificial Turf Installation Accessories'],
  almdrjat: ['تراسات وأرضيات خارجية', 'Terraces & Outdoor Flooring'],
  'altwf-walahjar': ['التوف والأحجار', 'Tuff & Stones'],
  'shbkat-alzl': ['شبكات الظل', 'Shade Nets'],
  'aamda-alzraaa-almayya-anzma-alnmw-alamwdy-llmnzl-walshrfa': ['أنظمة الزراعة العمودية والمائية', 'Vertical & Hydroponic Growing Systems'],
  'jdawl-alfydanat': ['طاولات المدّ والجزر', 'Ebb & Flow Tables'],
  terraflex: ['منتجات TERRAFLEX', 'TERRAFLEX Products'],
  'mntjat-alry-mn-altytanywm': ['منتجات التيتانيوم للري', 'Titanium Irrigation Products'],
  'arbat-alyd-walarbat': ['عربات اليد والنقل', 'Wheelbarrows & Transport Carts'],
});

export const catalogCategories = [...featuredCategorySlugs, ...Object.values(categoryChildren).flat()].map(slug => ({
  slug, nameAr: sourceCategoryLabels[slug][0], nameEn: sourceCategoryLabels[slug][1],
  parentSlug: Object.entries(categoryChildren).find(([, children]) => children.includes(slug))?.[0] ?? null,
}));

// Verified against the supplier's category cards. Keep these orders consistent
// across the home page, category index and nested category pages.
export const featuredCategorySlugs = [
  'alawany', 'decoration', 'alashb-alsnaay', 'terrace-it',
  'aladwat-almhnya', 'hsa-alnhr', 'khltat-alzra', 'aswar-alkhyzran',
];

export const decorationCategorySlugs = [
  'fountains-water-features', 'alaamda-alrwmanya',
  'altmathyl-altmathyl-walhywanat-walftr', 'tmathyl-arqam',
  'tmathyl-hywanat-qabla-llzraaa', 'tmathyl-hywanat-blastykya',
  'nbatat-astnaaya', 'aljdar-alakhdr',
];

export function orderCategories<T extends { slug: string }>(categories: T[], order: string[]) {
  const rank = (slug: string) => { const index = order.indexOf(slug); return index < 0 ? order.length : index; };
  return [...categories].sort((a, b) => rank(a.slug) - rank(b.slug));
}

export const sourceCategoryLabels: Record<string, [string, string]> = {
  alawany: ['الأواني والأحواض', 'Pots & Planters'],
  decoration: ['الديكور', 'Decoration'],
  'alashb-alsnaay': ['عشب صناعي', 'Artificial Grass'],
  'terrace-it': ['تيراس إت', 'Terrace-It'],
  'aladwat-almhnya': ['أدوات احترافية', 'Professional Tools'],
  'hsa-alnhr': ['حصى الأنهار', 'River Pebbles'],
  'khltat-alzra': ['خلطات وتربة زراعية', 'Potting Mixtures & Soil'],
  'aswar-alkhyzran': ['أسوار الخيزران', 'Bamboo Fencing'],
  'fountains-water-features': ['نوافير وشلالات', 'Fountains & Water Features'],
  'alaamda-alrwmanya': ['الأعمدة الرومانية', 'Roman Columns'],
  'altmathyl-altmathyl-walhywanat-walftr': ['تماثيل أقزام وحيوانات وفطر', 'Gnomes, Animals & Mushrooms'],
  'tmathyl-arqam': ['تماثيل شخصيات', 'Figure Statues'],
  'tmathyl-hywanat-qabla-llzraaa': ['منحوتات حيوانات للزراعة', 'Animal Planters'],
  'tmathyl-hywanat-blastykya': ['منحوتات حيوانات بلاستيكية', 'Plastic Garden Animals'],
  'nbatat-astnaaya': ['نباتات اصطناعية', 'Artificial Plants'],
  'aljdar-alakhdr': ['جدار أخضر', 'Green Walls'],
  'alkwws-walawaya-waljrar-alzkhrfya': ['كؤوس وأوعية وجرار زخرفية', 'Decorative Urns, Bowls & Goblets'],
  'tyrakwta-aytalya': ['تيراكوتا إيطالية', 'Italian Terracotta'],
  'awany-eda': ['أواني EDA', 'EDA Pots'],
  'alawany-alzjajya': ['أواني مزجّجة', 'Glazed Pots'],
  'alqdwr-albrazylya': ['أواني برازيلية', 'Brazilian Pots'],
  'alawany-walmzarawn-almtlya-balkhshb-altbyay': ['أواني وأحواض مكسوّة بالخشب الطبيعي', 'Wood-Coated Pots & Planters'],
  'alawany-altaylandya': ['أواني تايلندية', 'Thai Pots'],
  'mntjat-alkhws-wjwz-alhnd': ['منتجات الخوص وجوز الهند', 'Wicker & Coconut Products'],
  'alawany-khmr': ['أواني فينتج', 'Vintage Pots'],
  'alawany-almadnya': ['أواني معدنية', 'Metal Planters'],
  'alawany-alblastykya': ['أواني بلاستيكية', 'Plastic Pots'],
  'awany-kwrtn': ['أواني كورتن', 'Corten Planters'],
  'alsghyra-walmtwsta': ['أواني صغيرة ومتوسطة', 'Small & Medium Pots'],
};

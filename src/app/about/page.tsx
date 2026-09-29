'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/components/layout/LanguageContext';
import { ShieldCheck, Award, Wrench } from 'lucide-react';

export default function AboutPage() {
  const { lang, t } = useLanguage();
  const ar = lang === 'ar';
  const [cms, setCms] = React.useState<any>(null);
  
  React.useEffect(() => {
    fetch('/api/pages/about').then(res => res.ok ? res.json() : null).then(data => {
      if (data?.page) setCms(data.page);
    }).catch(console.error);
  }, []);

  const title = ar ? cms?.titleAr || t.nav.aboutUs : cms?.titleEn || t.nav.aboutUs;
  const content = ar ? cms?.contentAr || 'في Ever Green نختار مجموعة متنوعة من تحف وديكورات الحدائق التي تجمع بين الجمال والجودة، لنساعدك في تحويل المساحات الخارجية إلى أماكن أكثر أناقة وتميزًا.' : cms?.contentEn || 'At Ever Green, we offer a carefully selected collection of garden ornaments and outdoor decor that combines beauty and quality, helping you transform outdoor spaces into elegant and distinctive environments.';
  const image = cms?.images?.[0] || '/logo.jpg';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-12">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900">
          {title}
        </h1>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="relative w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-white p-1">
            <img src={image} alt="Logo" className="object-contain w-full h-full" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{lang === 'ar' ? 'Ever Green لتحف وديكورات الحدائق' : 'Ever Green Garden Ornaments & Outdoor Decor'}</h2>
            <p className="text-xs text-brand-muted mt-0.5">{lang === 'ar' ? 'لمسة مختلفة لكل حديقة' : 'A Unique Touch for Every Garden'}</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
            <Award className="w-6 h-6 text-brand-gold" />
            <h3 className="text-xs font-bold text-gray-900">{lang === 'ar' ? 'قطع مختارة بعناية' : 'Carefully Selected Pieces'}</h3>
            <p className="text-[11px] text-gray-500">{lang === 'ar' ? 'تحف وديكورات تجمع بين الذوق والجودة.' : 'Ornaments and decor that bring together style and quality.'}</p>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
            <Wrench className="w-6 h-6 text-brand-gold" />
            <h3 className="text-xs font-bold text-gray-900">{lang === 'ar' ? 'تنسيق يليق بحديقتك' : 'Designed for Your Garden'}</h3>
            <p className="text-[11px] text-gray-500">{lang === 'ar' ? 'تشكيلة تكمّل المساحات الخارجية بمختلف الأذواق.' : 'A collection made to complement outdoor spaces and styles.'}</p>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
            <ShieldCheck className="w-6 h-6 text-brand-gold" />
            <h3 className="text-xs font-bold text-gray-900">{lang === 'ar' ? 'دعم ومساعدة' : 'Support & Assistance'}</h3>
            <p className="text-[11px] text-gray-500">{lang === 'ar' ? 'فريقنا جاهز لمساعدتك في اختيار القطع المناسبة.' : 'Our team is ready to help you choose the right pieces.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

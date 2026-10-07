import type { Metadata } from 'next';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'من نحن | Ever Green لتحف وديكورات الحدائق',
  description: 'تعرّف على Ever Green: مجموعات مختارة لتحف وديكورات الحدائق والعشب الصناعي والأدوات الاحترافية مع توصيل لجميع مناطق فلسطين.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return <AboutClient />;
}

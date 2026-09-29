import type { Metadata } from 'next';
import ComparePage from '@/components/compare/ComparePage';

export const metadata: Metadata = { title: 'Compare products | Ever Green', robots: { index: false, follow: true } };
export default function Page() { return <ComparePage />; }

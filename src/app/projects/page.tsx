import type { Metadata } from 'next';
import ProjectsClient from './ProjectsClient';

export const metadata: Metadata = {
  title: 'أفكار ومشاريع | Ever Green',
  description: 'أفكار وإلهام لتنسيق الحدائق والشرفات والمساحات الخارجية، مع روابط مباشرة إلى منتجات Ever Green في المتجر.',
  alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const sections = await prisma.homepageSection.findMany({
    where: { isActive: true },
  });
  
  const content = sections.reduce((acc, section) => {
    acc[section.key] = section;
    return acc;
  }, {} as any);
  
  return NextResponse.json({ content });
}

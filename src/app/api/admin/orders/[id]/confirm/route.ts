import { NextRequest, NextResponse } from 'next/server';
import { reviewCodOrder } from '@/lib/cod-orders';
export async function POST(req: NextRequest, {params}: {params:{id:string}}) {
 try { const body=await req.json().catch(()=>({})); const order=await reviewCodOrder(params.id, 'confirm', typeof body.reason==='string'?body.reason:''); return NextResponse.json({success:true,status:order.status}); } catch(e) {const error=e instanceof Error?e.message:'Request failed';return NextResponse.json({error},{status:error==='Forbidden'?403:409});}
}

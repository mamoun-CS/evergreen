import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function RecoverCartPage({ params }: { params: { cartId: string } }) {
  const { cartId } = params;
  
  if (!cartId) {
    redirect('/');
  }

  const cart = await prisma.abandonedCart.findUnique({
    where: { id: cartId }
  });

  if (!cart) {
    redirect('/');
  }

  let items = [];
  try {
    items = typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items;
  } catch (e) {}

  // Pass items to client via script so it can store in localStorage
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
      <h1 className="text-3xl font-bold text-green-800">Welcome Back!</h1>
      <p className="text-xl">We've saved your cart for you.</p>
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              localStorage.setItem('evergreen_cart', JSON.stringify(${JSON.stringify(items)}));
              window.location.href = '/checkout';
            } catch(e) {
              window.location.href = '/';
            }
          `
        }}
      />
      <p>Redirecting you to checkout...</p>
    </div>
  );
}

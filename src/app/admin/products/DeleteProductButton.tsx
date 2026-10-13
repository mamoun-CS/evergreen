'use client';

import { Trash2 } from 'lucide-react';
import { deleteProduct } from '../actions/product-actions';

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-800"
      aria-label={`حذف ${name}`}
      onClick={async () => {
        if (!window.confirm(`حذف المنتج «${name}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
        const result = await deleteProduct(id);
        if (!result.ok && result.message) window.alert(result.message);
      }}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

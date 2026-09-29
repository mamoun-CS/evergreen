'use client';

import { useEffect } from 'react';

/** Admin routes use their own navigation, so the storefront chrome is hidden. */
export default function AdminChrome() {
  useEffect(() => {
    document.body.classList.add('eg-admin-page');
    return () => document.body.classList.remove('eg-admin-page');
  }, []);
  return null;
}

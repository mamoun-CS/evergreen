'use client';

import { useEffect } from 'react';

/** Hides only the store navigation while a customer is inside their account area. */
export default function AccountChrome() {
  useEffect(() => {
    document.body.classList.add('eg-account-page');
    return () => document.body.classList.remove('eg-account-page');
  }, []);
  return null;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthService from '@/services/auth';

export default function useAuth(roles = []) {
  const router = useRouter();

  useEffect(() => {
    const user = AuthService.getStoredUser();

    if (!AuthService.isLoggedIn()) {
      router.push('/');
      return;
    }

    if (roles.length && (!user || !roles.includes(user.role))) {
      router.push('/unauthorized'); // Crée cette page
    }
  }, []);
}

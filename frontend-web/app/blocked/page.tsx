'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';


export default function BlockedPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/');
          return;
        }
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          router.push('/');
          return;
        }
        
        const data = await response.json();
        setUserInfo(data.user);

        // Vérifier si l'utilisateur est actif
        const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/check-actif`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          if (statusData.est_actif === 1) {
            const roleRedirect = {
              1: '/admin/dashboard',
              2: '/crp/dashboard',
              3: '/grossiste/dashboard',
              4: '/revendeur/dashboard',
            //   5: '/controleur/dashboard'
            };
            
            if (data.user && roleRedirect[data.user.role_id] as string) {
              router.push(roleRedirect[data.user.role_id] as string);
              return;
            }
          }
        }
        
      } catch (err) {
        console.error("Erreur de vérification:", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Compte bloqué</h1>
          <p className="text-gray-600 mb-4">
            {userInfo ? `Bonjour ${userInfo.nom}, ` : ''}
            Votre compte a été désactivé temporairement. Veuillez contacter l'administrateur pour plus d'informations.
          </p>
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 mb-4">
              Si vous pensez qu'il s'agit d' une erreur ou si vous avez des questions concernant cette restriction, merci de contacter notre service client.
            </p>
            <Link href="https://wa.me/+22956549199" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Veuillez contacter le service client
            </Link>
            <button
              onClick={handleLogout}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
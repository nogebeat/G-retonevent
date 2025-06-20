'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvalidLinkPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundColor: '#000',
      }}
    >
      <div className="bg-white bg-opacity-90 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-violet-700 mb-4">Lien invalide</h1>
        <p className="text-gray-800 mb-6">
          Ce lien d'inscription est invalide ou a expiré.
        </p>
        <p className="text-gray-800 mb-6" >
            Veillez contacter votre Grossiste ou Super-Grossiste
        </p>

        <Link
          href="/"
          className="inline-block mt-4 bg-violet-700 hover:bg-violet-800 text-white py-2 px-4 rounded"
        >
          Retour à l'accueil
        </Link>
        <p></p>
        <p></p>
        <Link href="https://wa.me/+22956549199" className="font-medium text-indigo-600 hover:text-indigo-500">
          Veuillez contacter le service client
        </Link>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundColor: '#000',
      }}
    >
      <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <div className="text-violet-700 text-6xl font-bold">404</div>
        <h1 className="text-2xl font-bold text-black mt-4 mb-2">Page non trouvée</h1>
        <p className="text-gray-800 mb-6">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-block bg-violet-700 hover:bg-violet-800 text-white py-2 px-4 rounded"
        >
          Retour à l'accueil
        </Link>
        <Link href="https://wa.me/+22956549199" className="font-medium text-indigo-600 hover:text-indigo-500">
            Veuillez contacter le service client
        </Link>
      </div>
    </div>
  );
}

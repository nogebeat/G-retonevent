'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Composant séparé pour le contenu qui utilise useSearchParams
function ResetPasswordContent() {
  const [formData, setFormData] = useState({
    nouveau_mot_de_passe: '',
    conf_nouveau_mot_de_passe: '',
  });
  const [loading, setLoading] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token manquant dans l\'URL');
      setVerifyingToken(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-reset-token/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
          throw new Error(data.msg || 'Token invalide');
        }

        setTokenValid(true);
        setUserInfo(data.user);
      } catch (err: any) {
        setError(err.message || 'Token invalide ou expiré');
        setTokenValid(false);
      } finally {
        setVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.nouveau_mot_de_passe !== formData.conf_nouveau_mot_de_passe) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (formData.nouveau_mot_de_passe.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Erreur lors de la réinitialisation');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: "url('/bg.jpg')" }}>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Vérification du lien...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: "url('/bg.jpg')" }}>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Festichill
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Lien invalide
            </p>
          </div>
          
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <p className="text-center text-sm">
              {error}
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <div>
              <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                ← Retour à la connexion
              </Link>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              MFG@2025 Noge@2025
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: "url('/bg.jpg')" }}>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Festichill
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Mot de passe réinitialisé
            </p>
          </div>
          
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p className="text-center text-sm">
              Votre mot de passe a été réinitialisé avec succès !<br />
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
          </div>
          
          <div className="text-center">
            <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Se connecter
            </Link>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              MFG@2025 Noge@2025
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: "url('/bg.jpg')" }}>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Festichill
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Réinitialiser votre mot de passe
          </p>
          {userInfo && (
            <p className="mt-1 text-center text-xs text-gray-500">
              Pour {userInfo.prenoms} {userInfo.nom}
            </p>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="nouveau_mot_de_passe" className="block text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </label>
              <input
                id="nouveau_mot_de_passe"
                name="nouveau_mot_de_passe"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Entrez votre nouveau mot de passe"
                value={formData.nouveau_mot_de_passe}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="conf_nouveau_mot_de_passe" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <input
                id="conf_nouveau_mot_de_passe"
                name="conf_nouveau_mot_de_passe"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirmez votre nouveau mot de passe"
                value={formData.conf_nouveau_mot_de_passe}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="text-xs text-gray-500">
            <p>• Le mot de passe doit contenir au moins 8 caractères</p>
            <p>• Les deux mots de passe doivent être identiques</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
            ← Retour à la connexion
          </Link>
          <p className="mt-4 text-xs text-gray-500">
            MFG@2025 Noge@2025
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant de fallback pour le loading
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: "url('/bg.jpg')" }}>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Chargement...</p>
        </div>
      </div>
    </div>
  );
}

// Composant principal qui enveloppe tout dans Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

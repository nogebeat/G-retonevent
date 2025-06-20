'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Erreur lors de l\'envoi de la demande');
      }

      setMessage(data.msg);
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: "url('/bg.jpg')" }}>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Festichill
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {emailSent ? 'Email envoyé' : 'Mot de passe oublié'}
          </p>
        </div>
        
        {!emailSent ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Entrez votre adresse email pour recevoir un lien de réinitialisation de mot de passe.
              </p>
            </div>
            
            <div>
              <label htmlFor="email" className="sr-only">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <p className="text-center text-sm">
                {message}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Vérifiez votre boîte email et cliquez sur le lien pour réinitialiser votre mot de passe.
              </p>
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                  setMessage('');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Renvoyer l'email
              </button>
            </div>
          </div>
        )}
        
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
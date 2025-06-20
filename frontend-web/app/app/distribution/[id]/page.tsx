'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ConfirmDistributionPage() {
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: '',
  });
  const [distributionInfo, setDistributionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();
  const params = useParams();
  const distributionId = params?.id;

  // Charger les informations de la distribution au chargement de la page
  useEffect(() => {
    const fetchDistributionInfo = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/distro/info/${distributionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok) {
          setDistributionInfo(data.distribution);
        } else {
          setError(data.msg || 'Distribution introuvable');
        }
      } catch (err) {
        setError('Erreur lors du chargement des informations');
        console.error('Erreur:', err);
      } finally {
        setPageLoading(false);
      }
    };

    if (distributionId) {
      fetchDistributionInfo();
    }
  }, [distributionId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // D'abord, vérifier les identifiants
      const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.msg || 'Identifiants incorrects');
      }

      // Si les identifiants sont corrects, confirmer la distribution
      const confirmResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/distro/conf/${distributionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmData.msg || 'Erreur lors de la confirmation');
      }

      setSuccess(`Confirmation réussie ! ${confirmData.nombre_tickets} ticket(s) ont été ajoutés à votre compte.`);
      
      // Rediriger vers le dashboard après 3 secondes
      setTimeout(() => {
        localStorage.setItem('token', loginData.token);
        const roleId = loginData.user.role_id;
        
        switch(roleId) {
          case 1:
            router.push('/admin/dashboard');
            break;
          case 2:
            router.push('/crp/dashboard');
            break;
          case 3:
            router.push('/grossiste/dashboard');
            break;
          case 4:
            router.push('/revendeur/dashboard');
            break;
          default:
            router.push('/');
        }
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la confirmation');
      console.error('Erreur de confirmation:', err);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: "url('/bg.jpg')" }}>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
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
            Confirmation de réception des tickets
          </p>
        </div>

        {distributionInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Détails de la distribution</h3>
            <div className="text-sm text-blue-800">
              <p><span className="font-medium">Nombre de tickets :</span> {distributionInfo.nombre_tickets}</p>
              <p><span className="font-medium">De :</span> {distributionInfo.donneur_nom} {distributionInfo.donneur_prenoms}</p>
              <p><span className="font-medium">Date :</span> {new Date(distributionInfo.date_distribution).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <p className="text-sm text-gray-700 mb-4 text-center">
              Pour confirmer la réception de ces tickets, veuillez vous connecter avec vos identifiants :
            </p>
          </div>

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="identifier" className="sr-only">
                Email ou Pseudo
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email ou Pseudo"
                value={credentials.identifier}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={credentials.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              {success}
              <p className="text-sm mt-2">Redirection en cours vers votre dashboard...</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !!success}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Confirmation en cours...' : success ? 'Confirmé ✓' : 'Confirmer la réception'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Problème avec la confirmation ?
            <Link href="https://wa.me/+229956549199" className="font-medium text-indigo-600 hover:text-indigo-500">
              {' '}Contactez un Administrateur
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-2">MFG@2025 Noge@2025</p>
        </div>
      </div>
    </div>
  );
}

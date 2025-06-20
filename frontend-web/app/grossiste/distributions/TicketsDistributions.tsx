'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter} from 'next/navigation';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import ScrollingInfoCards from '../../../components/Scroll';
import { toast } from 'react-hot-toast';

export default function TicketDistribution() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'vip' ? 'vip' : 'standard'
  );
// };

// export default function TicketDistribution({ searchParams }: Props) {


  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  // const [activeTab, setActiveTab] = useState('standard');
//   const searchParams = useSearchParams();
  // const [activeTab, setActiveTab] = useState(searchParams.tab === 'vip' ? 'vip' : 'standard');

  // États pour Standard
  const [revendeurs, setRevendeurs] = useState<any[]>([]);
  const [selectedRevendeur, setSelectedRevendeur] = useState<string>('');
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);
  const [availableTickets, setAvailableTickets] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');


  // États pour VIP
  const [revendeursVip, setRevendeursVip] = useState<any[]>([]);
  const [selectedRevendeurVip, setSelectedRevendeurVip] = useState<string>('');
  const [ticketQuantityVip, setTicketQuantityVip] = useState<number>(1);
  const [availableTicketsVip, setAvailableTicketsVip] = useState<number>(0);
  const [submittingVip, setSubmittingVip] = useState<boolean>(false);
  const [distributionsVip, setDistributionsVip] = useState<any[]>([]);
  const [errorVip, setErrorVip] = useState<string>('');
  const [successMessageVip, setSuccessMessageVip] = useState<string>('');
  
  const distribution_val = [
    { id: 1, name: 'Distribution A' },
    { id: 2, name: 'Distribution B' },
    { id: 3, name: 'Distribution C' },
  ];

  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  // Gestion du mode sombre
  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    if (savedTheme !== null) {
      setDarkMode(JSON.parse(savedTheme));
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    }
  };

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const backgroundClass = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const background3Class = darkMode ? 'bg-gray-500' : 'bg-gray-200';
  const textClass = darkMode ? 'text-white' : 'text-gray-800';
  const cardBackgroundClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';
  const errorBgClass = darkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getToken();
        
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
        
        if (data.user && data.user.role_id !== 3) { // Role ID 3 corresponds to grossiste
          router.push('/');
          return;
        }

        if (!data.user.photo_profil || data.user.photo_profil === 'NULL')
          data.user.photo_profil = "/bg.jpg";
        
        setUserInfo(data.user);
        loadData(data.user.id);
        loadDataVip(data.user.id);
      } catch (err) {
        router.push('/');
      }
    };
    
    checkAuth();

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Définir l'état initial en fonction de la taille de l'écran
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, [router]);

  // useEffect(() => {
  //     const tab = searchParams.tab;
  //     if (tab === 'vip') {
  //       setActiveTab('vip');
  //     } else {
  //       setActiveTab('standard');
  //     }
  //   }, [searchParams]);

  const loadData = async (userId: number) => {
    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
      
      // Chargement des revendeurs associés au grossiste
      const revendeursResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users?role_id=4&parent_id=${userId}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!revendeursResponse.ok) {
        throw new Error(`Erreur lors du chargement des revendeurs: ${revendeursResponse.status}`);
      }
      
      const revendeursData = await revendeursResponse.json();
      
      const processedRevendeurs = revendeursData.map((revendeur: any) => ({
        ...revendeur,
        est_actif: revendeur.est_actif === 1 || revendeur.est_actif === true
      }));
      
      setRevendeurs(processedRevendeurs);
      
      // Chargement du nombre de tickets disponibles
      await loadAvailableTickets();

      // Chargement de l'historique des distributions
      await loadDistributionHistory();
      
    } catch (err: any) {
      setError('Erreur lors du chargement des données: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDataVip = async (userId: number) => {
    try {
      const token = getToken();
      
      if (!token)
        throw new Error('Token non disponible');

      // Chargement des revendeurs VIP associés au crp
      const revendeursResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?role_id=4&parent_id=${userId}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!revendeursResponse.ok)
        throw new Error(`Erreur lors du chargement des revendeurs VIP: ${revendeursResponse.status}`);
      const revendeursData = await revendeursResponse.json();
      
      const processedRevendeurs = revendeursData.map((revendeur: any) => ({
        ...revendeur,
        est_actif: revendeur.est_actif === 1 || revendeur.est_actif === true
      }));
      
      setRevendeursVip(processedRevendeurs);
      
      await loadAvailableTicketsVip();
      await loadDistributionHistoryVip();
      
    } catch (err: any) {
      setErrorVip('Erreur lors du chargement des données VIP: ' + err.message);
    }
  };

  const loadAvailableTickets = async () => {
    try {
      const token = getToken();
      
      // Nous utilisons la route /api/tickets/dispo pour obtenir le nombre de tickets disponibles
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/dispo`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement des tickets disponibles: ${response.status}`);
      }
      
      const data = await response.json();
      if (typeof data.tickets === 'number') {
        setAvailableTickets(data.tickets);
      } else {
        setAvailableTickets(0);
      }
    } catch (err: any) {
      setError('Erreur lors du chargement des tickets disponibles: ' + err.message);
    }
  };

  const loadAvailableTicketsVip = async () => {
    try {
      const token = getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/dispo`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!response.ok)
        throw new Error(`Erreur lors du chargement des tickets VIP disponibles: ${response.status}`);
      
      const data = await response.json();
      if (typeof data.tickets === 'number')
        setAvailableTicketsVip(data.tickets);
      else
        setAvailableTicketsVip(0);
    } catch (err: any) {
      setErrorVip('Erreur lors du chargement des tickets VIP disponibles: ' + err.message);
    }
  };

  const loadDistributionHistory = async () => {
    try {
      const token = getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/distributions/history`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement de l'historique des distributions: ${response.status}`);
      }
      
      const data = await response.json();
      setDistributions(data.distributions || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'historique des distributions:', err.message);
    }
  };

  const loadDistributionHistoryVip = async () => {
    try {
      const token = getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-distributions/history`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!response.ok)
        throw new Error(`Erreur lors du chargement de l'historique des distributions VIP: ${response.status}`);
      
      const data = await response.json();
      setDistributionsVip(data.distributions || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'historique des distributions VIP:', err.message);
    }
  };

  const handleDistributeTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRevendeur) {
      setError('Veuillez sélectionner un revendeur');
      return;
    }
    
    if (ticketQuantity == 0) {
      setError('La quantité doit être différent de 0');
      return;
    }
    
    if (ticketQuantity > availableTickets) {
      setError(`Vous n'avez que ${availableTickets} tickets disponibles`);
      return;
    }
    
    setError('');
    setSuccessMessage('');
    setSubmitting(true);
    
    try {
      const token = getToken();
      
      // Utiliser la route /api/tickets/distro pour distribuer les tickets
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/distro`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recv_id: selectedRevendeur,
          nb_distro: ticketQuantity
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `Erreur lors de la distribution: ${response.status}`);
      }
      
      const data = await response.json();
      setSuccessMessage(data.msg);
      toast.success(data.msg);
      
      // Réinitialiser le formulaire
      setSelectedRevendeur('');
      setTicketQuantity(1);
      
      // Actualiser les données
      await loadAvailableTickets();
      await loadDistributionHistory();
      
    } catch (err: any) {
      setError('Erreur: ' + err.message);
      toast.error('Erreur: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDistributeTicketsVip = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRevendeurVip) {
      setErrorVip('Veuillez sélectionner un revendeur');
      return;
    }
    
    if (ticketQuantityVip == 0) {
      setErrorVip('La quantité doit être différent de 0');
      return;
    }
    
    if (ticketQuantityVip > availableTicketsVip) {
      setErrorVip(`Vous n'avez que ${availableTicketsVip} tickets VIP disponibles`);
      return;
    }
    
    setErrorVip('');
    setSuccessMessageVip('');
    setSubmittingVip(true);
    
    try {
      const token = getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/distro`, {
        method: 'POST', headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }, body: JSON.stringify({
          recv_id: selectedRevendeurVip,
          nb_distro: ticketQuantityVip
        }), credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `Erreur lors de la distribution VIP: ${response.status}`);
      }
      
      const data = await response.json();
      setSuccessMessageVip(data.msg);
      toast.success(data.msg);
      
      setSelectedRevendeurVip('');
      setTicketQuantityVip(1);
      
      await loadAvailableTicketsVip();
      await loadDistributionHistoryVip();
      
    } catch (err: any) {
      setErrorVip('Erreur: ' + err.message);
      toast.error('Erreur: ' + err.message);
    } finally {
      setSubmittingVip(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading && !userInfo) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const sidebarOverlay = sidebarOpen && (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
      onClick={toggleSidebar}
    ></div>
  );

  const renderStandardSection = () => (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> 
        <div className={`${cardBackgroundClass} shadow rounded-lg p-6`}>
          <h2 className={`text-xl font-semibold  ${textClass} mb-6`}>Distribuer des tickets Standard</h2>
          
          {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">{error}</div>)}
          {successMessage && (<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">{successMessage}</div>)}
          
          <form onSubmit={handleDistributeTickets} className="space-y-6">
            <div>
              <label htmlFor="revendeur" className={`block text-sm font-medium ${textClass} mb-2`}>
                Sélectionner un revendeur
              </label>
              <select id="revendeur" value={selectedRevendeur} onChange={(e) => setSelectedRevendeur(e.target.value)}
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                required >
                <option value="" className={`${textClass}`}>-- Choisir un revendeur --</option>
                {revendeurs.filter(r => r.est_actif).map((revendeur) => (
                  <option className='text-gray-600' key={revendeur.id} value={revendeur.id}>
                    {revendeur.nom} {revendeur.prenoms} ({revendeur.telephone}) </option>))}
              </select>
            </div>
            
            <div>
              <label htmlFor="quantity" className={`block text-sm font-medium ${textClass} mb-2`}>
                Nombre de tickets à distribuer
              </label>
              <div className="flex items-center">
                <input id="quantity" type="number" value={ticketQuantity} onChange={(e) => setTicketQuantity(parseInt(e.target.value))}
                  className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                  required/>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                <span className="text-blue-600">{availableTickets}</span> ticket(s) standard disponible(s) pour distribution
              </p>
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting || ticketQuantity > availableTickets || !selectedRevendeur}
                className="w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {submitting ? 'Distribution en cours...' : 'Distribuer les tickets'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Informations et statistiques Standard */}
        <div className={`${cardBackgroundClass} shadow rounded-lg p-6`}>
          <h2 className={`text-xl font-semibold  ${textClass} mb-6`}>Informations Standard</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-blue-800">Tickets disponibles</h3>
                  <p className="text-blue-700">{availableTickets} ticket(s)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-green-800">Revendeurs actifs</h3>
                  <p className="text-green-700">{revendeurs.filter(r => r.est_actif).length} revendeur(s)</p>
                </div>
              </div>
            </div>
            
            <div className="max-w-md mx-auto mb-8">
              <ScrollingInfoCards distributions={distributions} autoScrollInterval={4000} showControls={false}/>
            </div>
          </div>
        </div>
      </div>
      
      {/* Historique des distributions Standard */}
      <div className={`${backgroundClass} shadow rounded-lg p-6 mt-6`}>
        <h2 className={`text-xl font-semibold  ${textClass} mb-6`}>Historique des distributions Standard</h2>
        
        {distributions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className={`${textClass} ${background3Class} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider`}>Date</th>
                  <th scope="col" className={`${textClass} ${background3Class} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider`}>Revendeur</th>
                  <th scope="col" className={`${textClass} ${background3Class} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider`}>Nombre de tickets</th></tr>
              </thead>
              <tbody className={`${cardBackgroundClass} divide-y divide-gray-200`}>
                {distributions.map((distribution) => (
                  <tr key={distribution.id}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>{formatDate(distribution.date_distribution)}</td>
                    {/* <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>{formatDate(distribution.date_distribution)}</td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${textClass}`}>{distribution.receveur_nom} {distribution.receveur_prenoms}</div>
                      {/* <div className={`text-sm font-medium text-gray-500`}>{distribution.receveur_nom} {distribution.receveur_prenoms}</div> */}
                      <div className={`text-sm text-gray-500`}>{distribution.receveur_telephone}</div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>{distribution.nombre_tickets} ticket(s)</td></tr>))}
                    {/* <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>{distribution.nombre_tickets} ticket(s)</td></tr>))} */}
              </tbody>
            </table>
          </div> ) : (<div className={`text-center py-4 text-gray-500`}> Aucune distribution de tickets standard enregistrée </div> )}
      </div>
    </div>
  );

  const renderVipSection = () => (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardBackgroundClass} shadow rounded-lg p-6`}>
          <h2 className={`text-xl font-semibold  ${textClass} mb-6`}>Distribuer des tickets VIP</h2>
          
          {errorVip && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">{errorVip}</div>)}
          {successMessageVip && (<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">{successMessageVip}</div>)}
          
          <form onSubmit={handleDistributeTicketsVip} className="space-y-6">
            <div>
              <label htmlFor="revendeurVip" className={`block text-sm font-medium ${textClass} mb-2`}>
                Sélectionner un revendeur
              </label>
              <select id="revendeurVip" value={selectedRevendeurVip} onChange={(e) => setSelectedRevendeurVip(e.target.value)}
                className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                // className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-gray-600"
                required >
                <option value="" className={`${textClass}`}>-- Choisir un revendeur --</option>
                {revendeursVip.filter(r => r.est_actif).map((revendeur) => (
                  <option className='text-gray-600' key={revendeur.id} value={revendeur.id}>
                    {revendeur.nom} {revendeur.prenoms} ({revendeur.telephone}) </option>))}
              </select>
            </div>
            
            <div>
              <label htmlFor="quantityVip" className={`block text-sm font-medium ${textClass} mb-2`}>
                Nombre de tickets VIP à distribuer
              </label>
              <div className="flex items-center">
                <input id="quantityVip" type="number" value={ticketQuantityVip} onChange={(e) => setTicketQuantityVip(parseInt(e.target.value) || 0)}
                  className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                  // className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-gray-600"
                  required/>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                <span className="text-yellow-600">{availableTicketsVip}</span> ticket(s)  VIP disponible(s) pour distribution
              </p>
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={submittingVip || ticketQuantityVip > availableTicketsVip || !selectedRevendeurVip}
                className="w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50">
                {submittingVip ? 'Distribution en cours...' : 'Distribuer les tickets VIP'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Informations et statistiques VIP */}
        <div className={`${cardBackgroundClass} shadow rounded-lg p-6`}>
          <h2 className={`text-xl font-semibold  ${textClass} mb-6`}>Informations VIP</h2>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-yellow-800">Tickets VIP disponibles</h3>
                  <p className="text-yellow-700">{availableTicketsVip} ticket(s)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-orange-800">Revendeurs VIP actifs</h3>
                  <p className="text-orange-700">{revendeursVip.filter(r => r.est_actif).length} revendeur(s)</p>
                </div>
              </div>
            </div>
            
            <div className="max-w-md mx-auto mb-8">
              <ScrollingInfoCards distributions={distributions} autoScrollInterval={4000} showControls={false}/>
            </div>
          </div>
        </div>
      </div>
      {/* Historique des distributions VIP */}
      <div className={`${backgroundClass} shadow rounded-lg p-6 mt-6`}>
        <h2 className={`text-xl font-semibold  ${textClass} mb-6`}>Historique des distributions VIP</h2>
        
        {distributionsVip.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className={`${textClass} ${background3Class} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider`}>Date</th>
                  <th scope="col" className={`${textClass} ${background3Class} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider`}>Revendeur</th>
                  <th scope="col" className={`${textClass} ${background3Class} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider`}>Nombre de tickets</th></tr>
              </thead>
              <tbody className={`${cardBackgroundClass} divide-y divide-gray-200`}>
                {distributionsVip.map((distribution) => (
                  <tr key={distribution.id}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>{formatDate(distribution.date_distribution)}</td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(distribution.date_distribution)}</td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${textClass}`}>{distribution.receveur_nom} {distribution.receveur_prenoms}</div>
                      {/* <div className="text-sm font-medium text-gray-900">{distribution.receveur_nom} {distribution.receveur_prenoms}</div> */}
                      <div className="text-sm text-gray-500">{distribution.receveur_telephone}</div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>{distribution.nombre_tickets} ticket(s)</td></tr>))}
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{distribution.nombre_tickets} ticket(s)</td></tr>))} */}
              </tbody>
            </table>
          </div> ) : (<div className={`text-center py-4 ${textClass}`}> Aucune distribution de tickets standard enregistrée </div> )}
          {/* </div> ) : (<div className="text-center py-4 text-gray-500"> Aucune distribution de tickets standard enregistrée </div> )} */}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header user={userInfo}
        userRole="Grossiste" 
        onMenuClick={toggleSidebar}
      />
      
      <div className="flex flex-1 relative">
        {/* Overlay pour mobile qui apparaît seulement quand la sidebar est ouverte */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
            onClick={toggleSidebar}
          ></div>
        )}

        {/* Sidebar avec positionnement responsive */}
        <Sidebar 
          role="grossiste" 
          currentPage="distribution"
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          links={[
            { label: 'Tableau de bord', href: '/grossiste/dashboard', icon: 'dashboard' },
            { label: 'Revendeurs', href: '/grossiste/revendeurs', icon: 'users' },
            { label: 'Tickets', href: '/grossiste/tickets', icon: 'ticket' },
            { label: 'Distribution', href: '/grossiste/distribution', icon: 'share' },
            { label: 'Mes Gains', href: '/grossiste/gains', icon: 'money' },
            { label: 'Profil', href: '/grossiste/profile', icon: 'user' },
          ]}
          className={`transition-transform duration-300 h-full z-30 
            fixed lg:sticky top-0 
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        />
        
        {/* Contenu principal - s'adapte automatiquement à la présence/absence de la sidebar */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full overflow-x-hidden">
          <h1 className={`text-2xl sm:text-3xl font-bold ${textClass} mb-4 sm:mb-6 flex items-center`}>
            <button 
              onClick={toggleSidebar} 
              className="mr-3 text-gray-500 lg:hidden focus:outline-none"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            Distribution de Tickets
          </h1>
          
          
          {error && (
            <div className={`${errorBgClass} px-4 py-3 rounded relative mb-4 sm:mb-6 border`}>
              {error}
            </div>
          )}
          
          {/* Onglets pour Standard/VIP */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('standard')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'standard' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  Standard
                </button>
                <button
                  onClick={() => setActiveTab('vip')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'vip' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  VIP
                </button>
              </nav>
            </div>
          </div>
            {activeTab === 'standard' && renderStandardSection()}
            {activeTab === 'vip' && renderVipSection()}
        </main>
      </div>
    </div>
  );
}

// }

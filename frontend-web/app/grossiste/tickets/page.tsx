'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import Table from '../../../components/ui/Table';
import Card from '../../../components/ui/Card';
import ModalGen from '../../../components/ui/ModalGen';


export default function GrossisteDistribution() {
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('standard');
  const [darkMode, setDarkMode] = useState(false);
  
  // États pour Standard
  const [revendeurs, setRevendeurs] = useState([]);
  const [availableTickets, setAvailableTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [historyTotal, setHistoryTotal] = useState(0);

  // États pour VIP
  const [revendeursVip, setRevendeursVip] = useState([]);
  const [availableTicketsVip, setAvailableTicketsVip] = useState([]);
  const [statsVip, setStatsVip] = useState(null);
  const [ticketVip, setTicketVip] = useState(null);
  const [historyTotalVip, setHistoryTotalVip] = useState(0);

  const [distributionError, setDistributionError] = useState('');
  const [distributionSuccess, setDistributionSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const distribution_val = [
    { id: 1, name: 'Distribution A' },
    { id: 2, name: 'Distribution B' },
    { id: 3, name: 'Distribution C' },
  ];
  const router = useRouter();

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  useEffect(() => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      const isDark = JSON.parse(savedTheme);
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
      localStorage.setItem('darkMode', JSON.stringify(prefersDark));
    }
  }
}, []);

  const toggleDarkMode = () => {
  const newDarkMode = !darkMode;
  setDarkMode(newDarkMode);
  document.documentElement.classList.toggle('dark', newDarkMode);
  if (typeof window !== 'undefined') {
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  }
};

  const backgroundClass = darkMode ? 'bg-gray-900' : 'bg-gray-100';
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
        
        if (data.user && data.user.role_id !== 3) {
          router.push('/');
          return;
        }

        if (!data.user.photo_profil || data.user.photo_profil === 'NULL')
          data.user.photo_profil = "/bg.jpg";
        
        setUserInfo(data.user);
        loadData(data.user.id);
        loadDataVip(data.user.id);
        loadhistory();
        loadhistoryVip();
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

  const loadData = async (userId) => {
    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
      
      // Chargement des revendeurs associés au grossiste
      const revendeursResponse = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/api/users?role_id=4&parent_id=${userId}`, 
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
    
      const processedRevendeurs = revendeursData.map(revendeur => ({
        ...revendeur,
        est_actif: revendeur.est_actif === 1 || revendeur.est_actif === true,
        photo_profil: revendeur.photo_profil || "/bg.jpg"
      }));
      
      setRevendeurs(processedRevendeurs);
      
      // Chargement des statistiques de l'utilisateur
      const statsResponse = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/api/stats`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!statsResponse.ok) {
        throw new Error(`Erreur lors du chargement des statistiques: ${statsResponse.status}`);
      }
      
      const statsData = await statsResponse.json();
      setStats(statsData);
      
      loadAvailableTickets();
      loadTickets();
      loadDistributionHistory();
      
    } catch (err) {
      setError('Erreur lors du chargement des données: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDataVip = async (userId) => {
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
      
      // Chargement des revendeurs VIP associés au grossiste
      const revendeursResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?role_id=4&parent_id=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!revendeursResponse.ok)
        throw new Error(`Erreur lors du chargement des revendeurs VIP: ${revendeursResponse.status}`);
      
      const revendeursData = await revendeursResponse.json();
    
      const processedrevendeurs = revendeursData.map(revendeur => ({
        ...revendeur,
        est_actif: revendeur.est_actif === 1 || revendeur.est_actif === true,
        photo_profil: revendeur.photo_profil || "/bg.jpg"
      }));
      
      setRevendeursVip(processedrevendeurs);
      
      // Chargement des statistiques VIP
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!statsResponse.ok)
        throw new Error(`Erreur lors du chargement des statistiques VIP: ${statsResponse.status}`);
      
      const statsData = await statsResponse.json();
      setStatsVip(statsData);
      loadAvailableTicketsVip();
      loadTicketsVip();
    } catch (err) {
      setError('Erreur lors du chargement des données VIP: ' + err.message);
    }
  };

  const loadAvailableTickets = async () => {
    try {
      const token = getToken();
      
      const response = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/dispo`, 
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
      setAvailableTickets(data.tickets);
    } catch (err) {
      setDistributionError('Erreur lors du chargement des tickets disponibles: ' + err.message);
    }
  };

  const loadAvailableTicketsVip = async () => {
    try {
      const token = getToken();
      
      const response = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/dispo`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!response.ok)
        throw new Error(`Erreur lors du chargement des tickets VIP disponibles: ${response.status}`);
      
      const data = await response.json();
      setAvailableTicketsVip(data.tickets);
    } catch (err) {
      setDistributionError('Erreur lors du chargement des tickets VIP disponibles: ' + err.message);
    }
  };

  const loadTickets = async () => {
    try {
      const token = getToken();
      
      const response = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/api/ticket`, 
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
      
      const reponse = await response.json();
      setTicket(reponse);
    } catch (err) {
      setDistributionError('Erreur lors du chargement des tickets disponibles: ' + err.message);
    }
  };

  const loadDistributionHistory = async () => {
    try {
      const token = getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/distributions/history`, 
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
      
      const reponse = await response.json();
      setHistoryTotal(reponse.distributions.length);
    } catch (err) {
      setDistributionError('Erreur lors du chargement des tickets disponibles: ' + err.message);
    }
  };

  const loadTicketsVip = async () => {
    try {
      const token = getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-ticket`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!response.ok)
        throw new Error(`Erreur lors du chargement des tickets VIP: ${response.status}`);
      const reponse = await response.json();
      setTicketVip(reponse);
    } catch (err) {
      setDistributionError('Erreur lors du chargement des tickets VIP: ' + err.message);
    }
  };

  const loadhistoryVip = async () => {
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
        throw new Error(`Erreur lors du chargement de l'historique VIP: ${response.status}`);
      const reponse = await response.json();
      setHistoryTotalVip(reponse.distributions.length);
    } catch (err) {
      setDistributionError('Erreur lors du chargement de l\'historique de distributions VIP: ' + err.message);
    }
  }

  const loadhistory = async () => {
    try {
      const token = getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/distributions/history`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!response.ok)
        throw new Error(`Erreur lors du chargement de l'historique: ${response.status}`);
      const reponse = await response.json();
      setHistoryTotal(reponse.distributions.length);
    } catch (err) {
      setDistributionError('Erreur lors du chargement de l\'historique de distributions: ' + err.message);
    }
  }

  const formatNumberWithSpaces = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "0";
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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

  const renderTicketSection = (isVip = false) => {
    const config = isVip ? {
    ticketsAvailable: availableTicketsVip,historyTotal: historyTotalVip,revendeursList: revendeursVip,statsData: statsVip,ticketData: ticketVip,loadFunction: loadAvailableTicketsVip,
    cardColors: {tickets: "gold", revendeurs: "yellow", distributions: "red"},buttonStyles: "px-3 py-1 sm:px-4 sm:py-2 bg-yellow-500 dark:bg-yellow-600 text-white dark:text-yellow-100 rounded hover:bg-yellow-600 dark:hover:bg-yellow-500 transition-colors text-sm md:text-base w-full sm:w-auto font-medium",alertStyles: "bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-400",alertIconColor: "text-yellow-600 dark:text-yellow-400",alertTextColor: "text-yellow-800 dark:text-yellow-200",spinnerColor: "border-yellow-500 dark:border-yellow-400",
    labels: {ticketsTitle: "Tickets VIP disponibles",distributionTitle: "Distribuer des tickets VIP",distributionsTotal: "Distributions VIP totales",distributionsDesc: "Tickets VIP distribués",historyTitle: "Historique de ventes VIP",ticketType: "VIP"
    }
  } : {
    ticketsAvailable: availableTickets,historyTotal: historyTotal, revendeursList: revendeurs,statsData: stats,ticketData: ticket,loadFunction: loadAvailableTickets,
    cardColors: {tickets: "green", revendeurs: "blue", distributions: "purple"},buttonStyles: "px-3 py-1 sm:px-4 sm:py-2 bg-gray-600 dark:bg-gray-700 text-white dark:text-gray-200 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm md:text-base w-full sm:w-auto font-medium", alertStyles: "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-400", alertIconColor: "text-blue-600 dark:text-blue-400", alertTextColor: "text-blue-800 dark:text-blue-200", spinnerColor: "border-indigo-500 dark:border-indigo-400",
    labels: {ticketsTitle: "Tickets disponibles",distributionTitle: "Distribuer des tickets Standard",distributionsTotal: "Distributions totales",distributionsDesc: "Tickets distribués",historyTitle: "Historique de ventes Standard",ticketType: "standard"
    }
  };

    return (
      <div>
        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card 
            title={config.labels.ticketsTitle}
            value={config.ticketsAvailable}
            description="Pour distribution"
            icon="inventory"
            color={config.cardColors.tickets}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
          />
          
          <Card 
            title="Revendeurs actifs"
            value={revendeurs.filter(r => r.est_actif).length}
            description={`Sur un total de ${revendeurs.length}`}
            icon="users"
            color={config.cardColors.revendeurs}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
          />
          
          <Card 
            title={config.labels.distributionsTotal}
            value={config.historyTotal}
            description={config.labels.distributionsDesc}
            icon="send"
            color={config.cardColors.distributions}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </div>
        
        {/* Section distribution */}
        <div className={`${cardBackgroundClass} shadow rounded-lg p-3 sm:p-4 md:p-6 mb-6 md:mb-8 overflow-x-auto`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
            <h2 className={`text-lg md:text-xl font-semibold ${textClass}`}>{config.labels.distributionTitle}</h2>
            <button
              onClick={() => config.loadFunction()}
              className={config.buttonStyles}
            >
              Actualiser les données
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-6">
              <div className={`animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 ${config.spinnerColor}`}></div>
            </div>
          ) : (
            <>
              <div className={`${config.alertStyles} p-3 md:p-4 mb-4 md:mb-6`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={`h-5 w-5 ${config.alertIconColor}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={`text-xs sm:text-sm ${config.alertTextColor}`}>
                      Vous avez <span className="font-bold">{config.ticketsAvailable}</span> ticket(s) {config.labels.ticketType} disponible(s) pour distribution.
                    </p>
                  </div>
                </div>
              </div>
              
              {renderRevendeursTable(config.revendeursList, config.statsData, isVip)}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderRevendeursTable = (revendeursData, statsData, isVip) => {
  const pricePerTicket = isVip ? 30000 : 8000;
  const availableTicketsCount = isVip ? availableTicketsVip : availableTickets;
  
  return revendeursData && revendeursData.length > 0 ? (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <Table 
        columns={[
          { key: 'photo', header: 'Photo' },
          { key: 'nom_complet', header: 'Nom' },
          { key: 'telephone', header: 'Téléphone', hideOnMobile: true },
          { key: 'tickets_actives', header: 'Tickets vendus', hideOnMobile: true },
          { key: 'tickets_remis', header: 'Tickets Remis', hideOnMobile: true },
          { key: 'money', header: "Chiffre d'affaire", hideOnMobile: true },
          { key: 'tickets_disponibles', header: 'Stock' },
          { key: 'statut', header: 'Statut' },
          { key: 'actions', header: 'Actions' }
        ]}
        data={revendeursData.map(revendeur => ({
          ...revendeur,
          photo: (
            <Image 
              src={revendeur.photo_profil} 
              alt="Photo de profil"
              width={40}
              height={35}
              className="rounded-full object-cover"
              style={{ objectFit: 'cover' }}
              priority={true}
            />
          ),
          nom_complet: `${revendeur.nom || ''} ${revendeur.prenoms || ''}`,
          tickets_actives: isVip 
            ? statsData?.revendeurs_vip?.find(r => r.id === revendeur.id)?.nb_vip_ven || 0
            : statsData?.revendeurs?.find(r => r.id === revendeur.id)?.nb_tickets_ven || 0,
          tickets_disponibles: isVip 
            ? statsData?.revendeurs_vip?.find(r => r.id === revendeur.id)?.nb_vip || 0
            : statsData?.revendeurs?.find(r => r.id === revendeur.id)?.nb_tickets || 0,
          tickets_remis: isVip 
            ? statsData?.revendeurs_vip?.find(r => r.id === revendeur.id)?.nb_vip_reçu || 0
            : statsData?.revendeurs?.find(r => r.id === revendeur.id)?.nb_tickets_reçu || 0,
          money: formatNumberWithSpaces((isVip 
            ? (statsData?.revendeurs_vip?.find(r => r.id === revendeur.id)?.nb_vip_ven || 0)
            : (statsData?.revendeurs?.find(r => r.id === revendeur.id)?.nb_tickets_ven || 0)) * pricePerTicket) + " F",
          statut: revendeur.est_actif ? 
            <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-xs">Actif</span> : 
            <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full text-xs">Bloqué</span>,
          actions: (
            <div className="flex space-x-2">
              <button 
                onClick={() => router.push(`/grossiste/distributions/${isVip ? '?tab=vip' : ''}`)}
                className={`px-2 py-1 sm:px-3 sm:py-1 text-white rounded hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                  isVip 
                    ? 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600' 
                    : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500'
                } `}
              >
                <span className="hidden sm:inline">Distribuer des tickets</span>
                <span className="sm:hidden">Distribuer</span>
              </button>
            </div>
          )
        }))}
        emptyMessage={`Aucun ${isVip ? 'revendeur' : 'revendeur'} disponible`}
        responsiveView={true}
        darkMode={darkMode}
      />
    </div>
  ) : (
    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
      <p>Aucun {isVip ? 'revendeur' : 'revendeur'} n'est associé à votre compte</p>
      <p className="mt-2 text-sm">Ajoutez des revendeurs pour commencer à distribuer des tickets</p>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`mt-4 px-4 py-2 text-white rounded transition-colors text-sm md:text-base ${
          isVip 
            ? 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600' 
            : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
        }`}
      >
        Ajouter un {isVip ? 'revendeur' : 'revendeur'}
      </button>
      <ModalGen
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetRoleId={4}
        roleName="Revendeur"
        isDarkMode={darkMode}
      />
    </div>
  );
};

  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header 
        user={userInfo} 
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

        <Sidebar 
          role="grossiste" 
          currentPage="tickets"
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          links={[
          { label: 'Tableau de bord', href: '/grossiste/dashboard', icon: 'dashboard' },
          { label: 'Revendeurs', href: '/grossiste/revendeurs', icon: 'users' },
          { label: 'Tickets', href: '/grossiste/tickets', icon: 'ticket' },
          { label: 'Distributions', href: '/grossiste/distributions', icon: 'share' },
          { label: 'Mes Gains', href: '/grossiste/gains', icon: 'money' },
          { label: 'Profil', href: '/grossiste/profile', icon: 'user' },
        ]}
        className={`transition-transform duration-300 h-full z-30 
          fixed lg:sticky top-0 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        />

        <main className={`flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden transition-all duration-300 w-full ${
            sidebarOpen ? 'lg:ml-0' : ''
          }`}>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold ${textClass} mb-4 sm:mb-6 flex items-center`}>
              <button 
                onClick={toggleSidebar}
                className="mr-3 text-gray-500 dark:text-gray-400 lg:hidden focus:outline-none hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              Gestion de Tickets
            </h1>
          
          {error && (
            <div className={`${errorBgClass} px-4 py-3 rounded relative mb-4 sm:mb-6 border`}>
              {error}
            </div>
          )}
          
          {/* Onglets pour Standard/VIP */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('standard')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'standard' 
                      ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  Standard
                </button>
                <button
                  onClick={() => setActiveTab('vip')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'vip' 
                      ? 'border-yellow-500 text-yellow-600 dark:border-yellow-400 dark:text-yellow-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  VIP
                </button>
              </nav>
            </div>
          </div>
          
          {activeTab === 'standard' && renderTicketSection(false)}
          {activeTab === 'vip' && renderTicketSection(true)}
        </main>
      </div>
    </div>
  );
}

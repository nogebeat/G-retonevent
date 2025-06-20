'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import Table from '../../../components/ui/Table';
import Card from '../../../components/ui/Card';
import ModalGen from '../../../components/ui/ModalGen';


export default function GrossisteDistribution() {
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('standard');
  
  // États pour Standard
  const [grossistes, setGrossistes] = useState([]);
  const [availableTickets, setAvailableTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [historyTotal, setHistoryTotal] = useState(0);
  // const [historyPage, setHistoryPage] = useState(1);
  
  // États pour VIP
  const [grossistesVip, setGrossistesVip] = useState([]);
  const [availableTicketsVip, setAvailableTicketsVip] = useState([]);
  const [statsVip, setStatsVip] = useState(null);
  const [ticketVip, setTicketVip] = useState(null);
  const [historyTotalVip, setHistoryTotalVip] = useState(0);
  
  const [distributionError, setDistributionError] = useState('');
  // const [distributionSuccess, setDistributionSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
          }, credentials: 'include'
        });
        
        if (!response.ok) {
          router.push('/');
          return;
        }
        
        const data = await response.json();
        
        if (data.user && data.user.role_id !== 2) {
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

  const backgroundClass = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = darkMode ? 'text-white' : 'text-gray-800';
  const cardBackgroundClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';
  const errorBgClass = darkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700';

  const loadData = async (userId) => {
    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
      
      // Chargement des grossistes standard associés au crp
      const grossistesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?role_id=3&parent_id=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!grossistesResponse.ok)
        throw new Error(`Erreur lors du chargement des grossistes: ${grossistesResponse.status}`);
      
      const grossistesData = await grossistesResponse.json();
    
      const processedgrossistes = grossistesData.map(revendeur => ({
        ...revendeur,
        est_actif: revendeur.est_actif === 1 || revendeur.est_actif === true
      }));
      
      setGrossistes(processedgrossistes);
      
      // Chargement des statistiques standard
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!statsResponse.ok)
        throw new Error(`Erreur lors du chargement des statistiques: ${statsResponse.status}`);
      
      const statsData = await statsResponse.json();
      setStats(statsData);
      loadAvailableTickets();
      loadTickets();
    } catch (err) {
      setError('Erreur lors du chargement des données standard: ' + err.message);
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
      
      // Chargement des grossistes VIP associés au crp
      const grossistesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?role_id=4&parent_id=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!grossistesResponse.ok)
        throw new Error(`Erreur lors du chargement des grossistes VIP: ${grossistesResponse.status}`);
      
      const grossistesData = await grossistesResponse.json();
    
      const processedgrossistes = grossistesData.map(revendeur => ({
        ...revendeur,
        est_actif: revendeur.est_actif === 1 || revendeur.est_actif === true
      }));
      
      setGrossistesVip(processedgrossistes);
      
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
      
      const response = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/dispo`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!response.ok)
        throw new Error(`Erreur lors du chargement des tickets disponibles: ${response.status}`);
      
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ticket`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!response.ok)
        throw new Error(`Erreur lors du chargement des tickets: ${response.status}`);
      const reponse = await response.json();
      setTicket(reponse);
    } catch (err) {
      setDistributionError('Erreur lors du chargement des tickets: ' + err.message);
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

  const handleExportExcel = async (isVip = false, format = 'complet') => {
    setExportLoading(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Token non disponible');
      }

      // Construire l'URL avec les paramètres
      const baseUrl = isVip 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/export/excel`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/export/excel`;
      
      const params = new URLSearchParams({
        statut: 'active',
        format: format
      });

      const response = await fetch(`${baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de l'export: ${response.status}`);
      }

      // Récupérer le nom du fichier depuis les headers si disponible
      const contentDisposition = response.headers.get('content-disposition');
      let filename = isVip 
        ? `ventes_tickets_vip_${new Date().toISOString().split('T')[0]}.xlsx`
        : `ventes_tickets_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convertir la réponse en blob
      const blob = await response.blob();
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      setError('Erreur lors du téléchargement: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const ExportButtons = ({ isVip }) => (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => handleExportExcel(isVip, 'complet')}
        disabled={exportLoading}
        className={`px-3 py-2 rounded text-white text-sm transition-colors ${
          isVip 
            ? 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400' 
            : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
        }`}
      >
        {exportLoading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Export...
          </span>
        ) : (
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Télécharger Excel {isVip ? 'VIP' : 'Standard'}
          </span>
        )}
      </button>
      
      <button
        onClick={() => handleExportExcel(isVip, 'resume')}
        disabled={exportLoading}
        className={`px-3 py-2 rounded text-white text-sm transition-colors ${
          isVip 
            ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400' 
            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
        }`}
      >
        {exportLoading ? 'Export...' : 'Résumé Excel'}
      </button>
    </div>
  );

  // Fonction pour rendre la section Standard
  const renderStandardSection = () => (
    <div>

      {/* Boutons d'export pour Standard */}
      <ExportButtons isVip={false} />
      {/* Cartes de statistiques Standard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card 
          title="Tickets disponibles"
          value={availableTickets}
          description="Pour distribution"
          icon="inventory"
          color="green"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        
        <Card 
          title="Grossistes actifs"
          value={grossistes.filter(r => r.est_actif).length}
          description={`Sur un total de ${grossistes.length}`}
          icon="users"
          color="blue"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        
        <Card 
          title="Distributions totales"
          value={historyTotal}
          description="Tickets distribués"
          icon="send"
          color="purple"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
      </div>
      
      {/* Section distribution Standard */}
      <div className={`${cardBackgroundClass} shadow rounded-lg p-4 sm:p-6 mb-6`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className={`text-lg md:text-xl font-semibold ${textClass}`}>Distribuer des tickets Standard</h2>
          <button 
            onClick={() => loadAvailableTickets()}
            className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors text-sm md:text-base w-full sm:w-auto"
          >
            Actualiser les données
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm text-blue-700">
                    Vous avez <span className="font-bold">{availableTickets}</span> ticket(s) standard disponible(s) pour distribution.
                  </p>
                </div>
              </div>
            </div>
            
            {renderGrossistesTable(grossistes, stats, false)}
          </>
        )}
      </div>
      
      {/* Historique des ventes Standard */}
      <div className={`${cardBackgroundClass} shadow rounded-lg p-3 sm:p-4 md:p-6 mb-6 md:mb-8 overflow-x-auto`}>
        <h2 className={`text-lg md:text-xl font-semibold ${textClass} mb-4`}>Historique de ventes Standard</h2>
        {renderTicketHistory(ticket, false)}
      </div>
    </div>
  );

  // Fonction pour rendre la section VIP
  const renderVipSection = () => (
    <div>
      <ExportButtons isVip={true} />

      {/* Cartes de statistiques VIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card 
          title="Tickets VIP disponibles"
          value={availableTicketsVip}
          description="Pour distribution"
          icon="inventory"
          color="gold"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        
        <Card 
          title="Grossistes actifs"
          value={grossistes.filter(r => r.est_actif).length}
          description={`Sur un total de ${grossistes.length}`}
          icon="users"
          color="yellow"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        
        <Card 
          title="Distributions VIP totales"
          value={historyTotalVip}
          description="Tickets VIP distribués"
          icon="send"
          color="red"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
      </div>
      
      {/* Section distribution VIP */}
      <div className={`${cardBackgroundClass} shadow rounded-lg p-3 sm:p-4 md:p-6 mb-6 md:mb-8 overflow-x-auto`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className={`text-lg md:text-xl font-semibold ${textClass}`}>Distribuer des tickets VIP</h2>
          <button 
            onClick={() => loadAvailableTicketsVip()}
            className="px-3 py-1 sm:px-4 sm:py-2 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 transition-colors text-sm md:text-base w-full sm:w-auto"
          >
            Actualiser les données
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm text-yellow-700">
                    Vous avez <span className="font-bold">{availableTicketsVip}</span> ticket(s) VIP disponible(s) pour distribution.
                  </p>
                </div>
              </div>
            </div>
            
            {renderGrossistesTable(grossistesVip, statsVip, true)}
          </>
        )}
      </div>
      
      {/* Historique des ventes VIP */}
      <div className={`${cardBackgroundClass} shadow rounded-lg p-3 sm:p-4 md:p-6 mb-6 md:mb-8 overflow-x-auto`}>
        <h2 className={`text-lg md:text-xl font-semibold ${textClass} mb-4`}>Historique de ventes VIP</h2>
        {renderTicketHistory(ticketVip, true)}
      </div>
    </div>
  );

  // Fonction pour rendre le tableau des grossistes
  const renderGrossistesTable = (grossistesData, statsData, isVip) => {
    const pricePerTicket = isVip ? 30000 : 8000;
      const availableTicketsCount = isVip ? availableTicketsVip : availableTickets;
      
      return grossistesData && grossistesData.length > 0 ? (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <Table
            darkMode={darkMode}
            columns={[
              { key: 'nom_complet', header: 'Nom' },
              { key: 'telephone', header: 'Téléphone', hideOnMobile: true },
              { key: 'tickets_actives', header: 'Tickets vendus', hideOnMobile: true },
              { key: 'tickets_remis', header: 'Tickets Remis', hideOnMobile: true },
              { key: 'money', header: "Chiffre d'affaire", hideOnMobile: true },
              { key: 'tickets_disponibles', header: 'Stock' },
              { key: 'statut', header: 'Statut' },
              { key: 'actions', header: 'Actions' }
            ]}
            data={grossistesData.map(revendeur => ({
              ...revendeur,
              nom_complet: `${revendeur.nom || ''} ${revendeur.prenoms || ''}`,
              tickets_actives: isVip 
                ? statsData?.grossistes_vip?.find(r => r.id === revendeur.id)?.nb_vip_ven || 0
                : statsData?.grossistes?.find(r => r.id === revendeur.id)?.nb_tickets_ven || 0,
              tickets_disponibles: isVip 
                ? statsData?.grossistes_vip?.find(r => r.id === revendeur.id)?.nb_vip || 0
                : statsData?.grossistes?.find(r => r.id === revendeur.id)?.nb_tickets || 0,
              tickets_remis: isVip 
                ? statsData?.grossistes_vip?.find(r => r.id === revendeur.id)?.nb_vip_reçu || 0
                : statsData?.grossistes?.find(r => r.id === revendeur.id)?.nb_tickets_reçu || 0,
              money: formatNumberWithSpaces((isVip 
                ? (statsData?.grossistes_vip?.find(r => r.id === revendeur.id)?.nb_vip_ven || 0)
                : (statsData?.grossistes?.find(r => r.id === revendeur.id)?.nb_tickets_ven || 0)) * pricePerTicket) + " F",
              statut: revendeur.est_actif ? 
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Actif</span> : 
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Bloqué</span>,
              actions: (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => router.push(`/crp/distributions/${isVip ? '?tab=vip' : ''}`)}
                    className={`px-2 py-1 sm:px-3 sm:py-1 text-white rounded hover:opacity-80 disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap ${
                      isVip ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    disabled={availableTicketsCount.length === 0 || !revendeur.est_actif}
                    title={availableTicketsCount.length === 0 ? "Aucun ticket disponible" : !revendeur.est_actif ? "Revendeur bloqué" : `Distribuer des tickets ${isVip ? 'VIP' : 'Standard'}`}
                  >
                    <span className="hidden sm:inline">Distribuer des tickets</span>
                    <span className="sm:hidden">Distribuer</span>
                  </button>
                </div>
              )
            }))}
            emptyMessage={`Aucun ${isVip ? 'grossiste' : 'grossiste'} disponible`}
            responsiveView={true}
          />
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          <p>Aucun {isVip ? 'grossiste' : 'grossiste'} n'est associé à votre compte</p>
          <p className="mt-2 text-sm">Ajoutez des grossistes pour commencer à distribuer des tickets</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className={`mt-4 px-4 py-2 text-white rounded transition-colors text-sm md:text-base ${
              isVip ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Ajouter un {isVip ? 'grossiste' : 'grossiste'}
          </button>
          <ModalGen
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            targetRoleId={3}
            roleName="Grossiste"
            isDarkMode={darkMode}
          />
        </div>
      );
  };

  const renderTicketHistory = (ticketData, isVip) => {
    return loading ? (
      <div className="flex justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    ) : (
      <>
        <div className="mb-4 flex justify-end"></div>
        {ticketData && ticketData.length > 0 ? (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table
              darkMode={darkMode}
              columns={[
                { key: 'code', header: 'Code Ticket', hideOnMobile: true },
                { key: 'nom_rev', header: 'Nom et Prénom du revendeur' },
                { key: 'nom_gros', header: 'Nom et Prrenom du grossiste' },
                { key: 'activation', header: "Date d'activation", hideOnMobile: true },
              ]}
              data={ticketData
              .slice()
              .sort((a, b) => {
                const dateA = new Date(a.date_activation);
                const dateB = new Date(b.date_activation);
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
                return a.id - b.id;
              })
              .map(ticket => ({
                ...ticket,
                nom_rev: `${ticket.nom_rev || ''} ${ticket.prenoms_rev || ''} (${ticket.tel_rev})`,
                nom_gros: `${ticket.nom_gros || ''} ${ticket.prenoms_gros || ''} (${ticket.tel_gros})`,
                activation: `${formatDate(ticket.date_activation)}`,
                code: `${ticket.id}`,
              }))}
            emptyMessage={`Aucun revendeur n'a vendu de tickets ${isVip ? 'VIP' : 'Standard'}`}
            responsiveView={true}
          />
        </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p>Aucun revendeur n'a vendu de tickets {isVip ? 'VIP' : 'Standard'}</p>
            <p className="mt-2 text-sm">Ajoutez des grossistes pour qu'ils vendent des tickets</p>
          </div>
        )}
      </>
    );
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

  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header user={userInfo} 
        userRole="CRP" 
        onMenuClick={toggleSidebar}
      />
      
      <div className="flex flex-1 relative">
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
            onClick={toggleSidebar}
          ></div>
        )}

        <Sidebar 
          role="crp" 
          currentPage="tickets"
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          links={[
            { label: 'Tableau de bord', href: '/crp/dashboard', icon: 'dashboard' },
            { label: 'Grossistes', href: '/crp/grossistes', icon: 'users' },
            { label: 'Tickets', href: '/crp/tickets', icon: 'ticket' },
            { label: 'Distributions', href: '/crp/distributions', icon: 'share' },
            { label: 'Profil', href: '/crp/profile', icon: 'user' },
          ]}
          className={`transition-transform duration-300 h-full z-30 fixed lg:sticky top-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        />
        
        <main className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-0' : ''
        }`}>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textClass} mb-4 sm:mb-6 flex items-center`}>
            <button 
              onClick={toggleSidebar} 
              className="mr-3 text-gray-500 lg:hidden focus:outline-none"
              aria-label="Menu">
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
            {/* {renderAddButton()}
            {renderTicketHistory(ticketData, isVip)} */}
            {/* {renderTicketHistory(ticketData, isVip)} */}
            {activeTab === 'standard' && renderStandardSection()}
            {activeTab === 'vip' && renderVipSection()}
          {/* </div> */}
        </main>
      </div>
    </div>
  );
};

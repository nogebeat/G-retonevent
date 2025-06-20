'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import Card from '../../../components/ui/Card';
import Table from '../../../components/ui/Table';
import NotificationModal from '../../../components/ui/NotificationModal';
import ModalGen from '../../../components/ui/ModalGen';


export default function GrossisteDashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('standard');
  
  // États pour la section Standard
  const [revendeurs, setRevendeurs] = useState([]);
  const [tickets, setTickets] = useState({ tickets: [], pagination: { total: 0 } });
  const [stats, setStats] = useState(null);
  const [ticketsVendus, setTicketsVendus] = useState(0);
  const [ticketsreçu, setTicketsReçu] = useState(0);
  
  // États pour la section VIP
  const [statsVip, setStatsVip] = useState(null);
  const [ticketsVendusVip, setTicketsVendusVip] = useState(0);
  const [ticketsreçuVip, setTicketsReçuVip] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);

  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

        const actifResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/check-actif`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (actifResponse.ok) {
          const actifData = await actifResponse.json();
          if (actifData.est_actif === 0) {
            router.push('/blocked');
            return;
          }
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
        loadDashboardData(data.user.id);
        loadVenteData();
        loadrecuData();
        // Charger les données VIP
        loadDashboardDataVip(data.user.id);
        loadVenteDataVip();
        loadrecuDataVip();
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

    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, [router]);


const [notificationModal, setNotificationModal] = useState({
  isOpen: false,
  recipientId: null,
  recipientName: ''
});

const openNotificationModal = (revendeurId, revendeurName) => {
  setNotificationModal({
    isOpen: true,
    recipientId: revendeurId,
    recipientName: revendeurName
  });
};

const closeNotificationModal = () => {
  setNotificationModal({
    isOpen: false,
    recipientId: null,
    recipientName: ''
  });
};

const handleNotificationSent = (result) => {
  console.log('Notification envoyée:', result);
};

  // Fonctions pour la section Standard (existantes)
  const loadDashboardData = async (userId) => {
    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
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
    
      const processedRevendeurs = revendeursData.map(revendeur => ({
        ...revendeur,
        est_actif: revendeur.est_actif === 1 || revendeur.est_actif === true,
        photo_profil: revendeur.photo_profil || "/bg.jpg"
      }));
      
      setRevendeurs(processedRevendeurs);
      
      // Chargement des tickets du grossiste
      const ticketsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tickets?page=${page}&limit=${limit}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!ticketsResponse.ok) {
        throw new Error(`Erreur lors du chargement des tickets: ${ticketsResponse.status}`);
      }
      
      const ticketsData = await ticketsResponse.json();
      setTickets(ticketsData);
      
      // Chargement des statistiques Standard
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stats`, 
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
      
    } catch (err) {
      setError('Erreur lors du chargement des données: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Nouvelles fonctions pour la section VIP
  const loadDashboardDataVip = async (userId) => {
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
      // Chargement des statistiques VIP
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vip-stats`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!statsResponse.ok) {
        throw new Error(`Erreur lors du chargement des statistiques VIP: ${statsResponse.status}`);
      }
      
      const statsData = await statsResponse.json();
      setStatsVip(statsData);
      
    } catch (err) {
      setError('Erreur lors du chargement des données VIP: ' + err.message);
    }
  };

  const loadVenteData = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error("Token non disponible");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/vente`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des ventes");
      }

      const data = await response.json();
      setTicketsVendus(data.tickets || 0);
    } catch (error) {
      console.error("Erreur lors du chargement des ventes :", error.message);
    }
  };

  const loadVenteDataVip = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error("Token non disponible");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/vente`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des ventes VIP");
      }

      const data = await response.json();
      setTicketsVendusVip(data.tickets || 0);
    } catch (error) {
      console.error("Erreur lors du chargement des ventes VIP :", error.message);
    }
  };

  const loadrecuData = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error("Token non disponible");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/remis`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des tickets remis");
      }

      const data = await response.json();
      setTicketsReçu(data.tickets || 0);
    } catch (error) {
      console.error("Erreur lors du chargement des tickets remis :", error.message);
    }
  };

  const loadrecuDataVip = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error("Token non disponible");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/remis`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des tickets remis VIP");
      }

      const data = await response.json();
      setTicketsReçuVip(data.tickets || 0);
    } catch (error) {
      console.error("Erreur lors du chargement des tickets remis VIP :", error.message);
    }
  };

  const handleToggleUserStatus = async (userId, isActive, isVip = false) => {
    try {
      const token = getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/change-actif/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ est_actif: !isActive }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la modification du statut: ${response.status}`);
      }
      
      setRevendeurs(prevRevendeurs => 
        prevRevendeurs.map(revendeur => 
          revendeur.id === userId 
            ? { ...revendeur, est_actif: !isActive } 
            : revendeur
        )
      );
      
    } catch (err) {
      setError('Erreur: ' + err.message);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadDashboardData(userInfo?.id);
  };

  const formatNumberWithSpaces = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "0";
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

      const blob = await response.blob();
      
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

  // Fonction pour rendre le contenu de la section Standard
  const renderStandardSection = () => (
    <div>
      <ExportButtons isVip={false} />
      {/* Cartes de statistiques Standard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card 
          title="Tickets vendus"
          value={ticketsVendus || 0}
          description="Total des tickets activés"
          icon="ticket"
          color="blue"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        
        <Card 
          title="Tickets disponibles"
          value={stats?.tickets?.available || 0}
          description="Non distribués"
          icon="inventory"
          color="green"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        
        <Card 
          title="Chiffre d'affaires"
          value={`${formatNumberWithSpaces(ticketsVendus * 8000)} FCFA`}
          description={`Avec ${ticketsVendus} tickets vendus`}
          icon="money"
          color="red"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />

        <Card 
          title="Ticket Reçu"
          value={`${formatNumberWithSpaces(ticketsreçu)}`}
          description={"Tickets Standard reçu de votre Super-Grossiste *"}
          icon="ticket"
          color="purple"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />

        <Card 
          title="Ticket Distribué"
          description={"Tickets remis au revendeur"}
          value={`${formatNumberWithSpaces(ticketsreçu - (stats?.tickets?.available || 0))}`}
          icon="ticket"
          color="purple"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
      </div>
      
      {/* Section des revendeurs Standard */}
      <div className={`${cardBackgroundClass} shadow rounded-lg p-4 sm:p-6 mb-6`}>
        <div className={`${cardBackgroundClass} shadow rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
            <h2 className={`text-lg sm:text-xl font-semibold ${textClass}`}>Mes revendeurs</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm md:text-base"
            >
              Ajouter un revendeur
            </button>
            <ModalGen
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              targetRoleId={4}
              roleName="Revendeur"
              isDarkMode={darkMode}
            />
          </div>
          
          {renderRevendeursTable(revendeurs, stats, false)}
        </div>
      </div>
    </div>
  );

  const renderVipSection = () => (
    <div>
      <ExportButtons isVip={true} />
      {/* Cartes de statistiques VIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card 
          title="Tickets VIP vendus"
          value={ticketsVendusVip || 0}
          description="Total des tickets VIP activés"
          icon="ticket"
          color="gold"
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
        
        <Card 
          title="Tickets VIP disponibles"
          value={statsVip?.tickets?.available || 0}
          description="Non distribués"
          icon="inventory"
          color="green"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        
        <Card 
          title="Chiffre d'affaires VIP"
          value={`${formatNumberWithSpaces(ticketsVendusVip * 30000)} FCFA`}
          description={`Avec ${ticketsVendusVip} tickets VIP vendus`}
          icon="money"
          color="red"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />

        <Card 
          title="Ticket VIP Reçu"
          value={`${formatNumberWithSpaces(ticketsreçuVip)}`}
          description={"Tickets VIP reçu de votre Super-Grossiste *"}
          icon="ticket"
          color="purple"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />

        <Card 
          title="Ticket VIP Distribué"
          description={"Tickets VIP remis au revendeur"}
          value={`${formatNumberWithSpaces(ticketsreçuVip - (statsVip?.tickets?.available || 0))}`}
          icon="ticket"
          color="purple"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
      </div>
      
      {/* Section des revendeurs VIP */}
      <div className={`${cardBackgroundClass} shadow rounded-lg p-4 sm:p-6 mb-6`}>
        <div className={`${cardBackgroundClass} shadow rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
            <h2 className={`text-lg sm:text-xl font-semibold  ${textClass}`}>Mes revendeurs</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm md:text-base"
            >
              Ajouter un revendeur
            </button>
            <ModalGen
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              targetRoleId={4}
              roleName="Revendeur"
              isDarkMode={darkMode}
            />
          </div>
          
          {renderRevendeursTable(revendeurs, statsVip, true)}
        </div>
      </div>
    </div>
  );

  // Fonction pour rendre le tableau des revendeurs
  
  const renderRevendeursTable = (revendeursData, statsData, isVip) => {
  const pricePerTicket = isVip ? 30000 : 8000;
  
  return (
    <>
      {revendeursData && revendeursData.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="min-w-full overflow-x-auto -mx-4 md:mx-0">
            <Table 
              columns={[
                { key: 'nom_complet', header: 'Nom' },
                { key: 'photo', header: 'Photo' },
                { key: 'telephone', header: 'Téléphone' },
                { key: 'tickets_actives', header: 'Tickets vendus' },
                { key: 'tickets_remis', header: 'Tickets Remis', hideOnMobile: true},
                { key: 'money', header: "Chiffre d'affaire", hideOnMobile: true},
                { key: 'tickets_disponibles', header: 'Stock', hideOnMobile: true},
                { key: 'statut', header: 'Statut', hideOnMobile: true},
                { key: 'actions', header: 'Actions', hideOnMobile: true }
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
                tickets_actives: isVip ? statsData?.revendeurs_vip?.find(r => r.id === revendeur.id)?.nb_vip_ven || 0 : statsData?.revendeurs?.find(r => r.id === revendeur.id)?.nb_tickets_ven || 0,
                tickets_disponibles: isVip ? statsData?.revendeurs_vip?.find(r => r.id === revendeur.id)?.nb_vip || 0 : statsData?.revendeurs?.find(r => r.id === revendeur.id)?.nb_tickets || 0,
                tickets_remis: isVip ?  statsData?.revendeurs_vip?.find(r => r.id === revendeur.id)?.nb_vip_reçu || 0 : statsData?.revendeurs?.find(r => r.id === revendeur.id)?.nb_tickets_reçu || 0,
                money:  isVip ? (statsData?.revendeurs_vip?.find(r => r.id === revendeur.id)?.nb_vip_ven || 0) * pricePerTicket : (statsData?.revendeurs?.find(r => r.id === revendeur.id)?.nb_tickets_ven || 0) * pricePerTicket,
                statut: revendeur.est_actif ? 
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Actif</span> : 
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Bloqué</span>,
                actions: (
                  <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
                    <button 
                      onClick={() => router.push(`/grossiste/distributions/${isVip ? '?tab=vip' : ''}`)}
                      className={`px-2 py-1 text-white rounded transition-colors text-xs whitespace-nowrap ${
                        isVip ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                      title="Distribuer des tickets"
                    >
                      Distribuer
                    </button>
                    
                    <button 
                      onClick={() => openNotificationModal(
                        revendeur.id, 
                        `${revendeur.nom || ''} ${revendeur.prenoms || ''}`.trim()
                      )}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-xs whitespace-nowrap"
                      title="Envoyer une notification"
                    >
                      <svg className="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Notifier
                    </button>
                    
                    <button 
                      onClick={() => handleToggleUserStatus(revendeur.id, revendeur.est_actif, isVip)}
                      className={`px-2 py-1 rounded text-white text-xs whitespace-nowrap ${
                        revendeur.est_actif ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                      }`}
                      title={revendeur.est_actif ? "Bloquer" : "Débloquer"}
                    >
                      {revendeur.est_actif ? 'Bloquer' : 'Débloquer'}
                    </button>

                    <button
                      onClick={() => router.push(`/grossiste/revendeurs/${revendeur.id}`)}
                      className="px-2 py-1 bg-blue-600 hover:bg-violet-700 text-white rounded transition-colors"
                    >
                      Details
                    </button>
                    <NotificationModal
                      isOpen={notificationModal.isOpen}
                      onClose={closeNotificationModal}
                      recipientId={notificationModal.recipientId}
                      recipientName={notificationModal.recipientName}
                      onSend={handleNotificationSent}
                    />
                  </div>
                )
              }))}
              emptyMessage={`Aucun revendeur disponible`}
              darkMode={darkMode}
            />
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          <p>Aucun revendeur n'est associé à votre compte</p>
          <p className="mt-2 text-sm">Ajoutez des revendeurs pour commencer à distribuer des tickets</p>
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

  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header user={userInfo}
        userRole="Grossiste"
        onMenuClick={toggleSidebar}
      />
      
      <div className="flex flex-1">
        <Sidebar 
          role="grossiste" 
          currentPage="dashboard"
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
          className={`transition-all duration-300 fixed lg:relative z-30 h-full ${
            sidebarOpen ? 'left-0' : '-left-64'
          } lg:left-0`}
        />
        
        <main className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-0' : ''
        }`}>
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
            Tableau de bord Grossiste
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
                    activeTab === 'standard'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setActiveTab('vip')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'vip'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  VIP
                </button>
              </nav>
            </div>
          </div>

          {/* Contenu des sections */}
          {activeTab === 'standard' && renderStandardSection()}
          {activeTab === 'vip' && renderVipSection()}
          
        </main>
      </div>
    </div>
  );
}

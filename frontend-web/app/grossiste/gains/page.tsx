'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import Card from '../../../components/ui/Card';


export default function GrossisteDashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('standard');
  
  // États pour la section Standard
  const [stats, setStats] = useState(null);
  const [ticketsVendus, setTicketsVendus] = useState(0);
  
  // États pour la section VIP
  const [statsVip, setStatsVip] = useState(null);
  const [ticketsVendusVip, setTicketsVendusVip] = useState(0);

  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [gains, setgains] = useState('');
  const [gainsVip, setgainsVip] = useState('');
  
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
        loadDashboardData(data.user);
        loadDashboardDataVip(data.user);
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

  // Fonctions pour la section Standard (existantes)
  const loadDashboardData = async (userInfo) => {
    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
      
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
      setgainsByStatus(userInfo, statsData);
      
    } catch (err) {
      setError('Erreur lors du chargement des données: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const setgainsByStatus = async (userInfo, stats) => {
    const status = userInfo?.statut;
    const TicketVen = stats?.tickets?.activated;

    let gain = 0;

    if (status !== "non_assigné"){
      switch (status) {
        case "RP-Ancien":
          gain = TicketVen <= 300 ? 750 : 1000;
          break;

        case "RP-Nouveau":
          gain = TicketVen <= 300 ? 500 : 750;
          break;

        case "Partenaire":
          gain = 750;
          break;

        default:
          gain = 0;
      }
      let vgain = TicketVen * gain;
      setgains(`${formatNumberWithSpaces(vgain)} FCFA`);
    } else {
      setgains("Contacter votre Super-Grossiste pour vous assigné un statut");
    }

    // setGain(gain);
  };

  // Nouvelles fonctions pour la section VIP
  const loadDashboardDataVip = async (userInfo) => {
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
      setgainsVIPByStatus(userInfo, statsData);
      
    } catch (err) {
      setError('Erreur lors du chargement des données VIP: ' + err.message);
    }
  };

   const setgainsVIPByStatus = async (userInfo, statsVip) => {
    const status = userInfo?.statut;
    const TicketVen = statsVip?.tickets?.activated;

    let gain = 0;
    if (status !== "non_assigné"){
      switch (status) {
        case "RP-Ancien":
          gain = 5000;
          break;

        case "RP-Nouveau":
          gain = 3000;
          break;

        case "Partenaire":
          gain = 5000;
          break;

        default:
          gain = 0;
      }

    let vgain = TicketVen * gain;
    setgainsVip(`${formatNumberWithSpaces(vgain)} FCFA`);
    } else
      setgainsVip(`Contacter votre Super-Grossiste pour vous assigné un statut`);
  }

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadDashboardData(userInfo);
  };

  const formatNumberWithSpaces = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "0";
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };


  // Fonction pour rendre le contenu de la section Standard
  const renderStandardSection = () => (
    <div>
      {/* Cartes de statistiques Standard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card 
          title="Tickets vendus"
          value={stats?.tickets?.activated || 0}
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
          value={`${formatNumberWithSpaces(stats?.tickets?.activated * 8000)} FCFA`}
          description={`Avec ${stats?.tickets?.activated} tickets vendus`}
          icon="money"
          color="red"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        <Card
          title="Gains de vente"
          description={"Total des gains de vente par ticket vendu"}
          icon={"money"}
          color='green'
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          value={gains}
        />
      </div>
      
    </div>
  );

  const renderVipSection = () => (
    <div>
      {/* Cartes de statistiques VIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card 
          title="Tickets VIP vendus"
          value={statsVip?.tickets?.activated || 0}
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
          value={`${formatNumberWithSpaces(statsVip?.tickets?.activated * 30000)} FCFA`}
          description={`Avec ${statsVip?.tickets?.activated} tickets VIP vendus`}
          icon="money"
          color="red"
          darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
        />
        <Card
          title="Gains de vente"
          description={"Total des gains de vente par ticket vendu"}
          icon={"money"}
          color='green'
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          value={`Contacte ton Super-Grossiste pour plus dinformation !`}
          // value={`${formatNumberWithSpaces(gainsVip)} FCFA`}
        />
      </div>
    </div>
  );

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
          currentPage="gains"
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
            Mes gains Grossiste
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

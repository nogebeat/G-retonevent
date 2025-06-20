'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import Table from '../../../components/ui/Table';
import Card from '../../../components/ui/Card';
import ModalGen from '../../../components/ui/ModalGen';
import NotificationModal from '../../../components/ui/NotificationModal';


export default function RevendeursPage() {
  const [userInfo, setUserInfo] = useState(null);
  const [revendeurs, setRevendeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('standard');
  const [statsVip, setStatsVip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stat, setStat] = useState({
    total: 0,
    actifs: 0,
    inactifs: 0
  });
  
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

  // Fonction pour récupérer le token
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
          // console.log("Aucun token trouvé, redirection vers login");
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
        
        if (data.user && data.user.role_id !== 3) {
          router.push('/');
          return;
        }

        if (!data.user.photo_profil || data.user.photo_profil === 'NULL')
          data.user.photo_profil = "/bg.jpg";
        
        setUserInfo(data.user);
        loadRevendeurs(data.user.id);
        loadDashboardDataVip(data.user.id);
      } catch (err) {
        console.error('Erreur d\'authentification:', err);
        router.push('/');
      }
    };
    
    checkAuth();

    // Gérer la taille de l'écran pour la sidebar
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

  const loadRevendeurs = async (userId) => {
    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
      
      // Charger les revendeurs associés au grossiste
      const revendeursResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?role_id=4&parent_id=${userId}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
        }
      );
      
      if (!revendeursResponse.ok) {
        throw new Error(`Erreur lors du chargement des revendeurs: ${revendeursResponse.status}`);
      }
      
      const revendeursData = await revendeursResponse.json();
      const revendeursList = revendeursData;


      const processedRevendeurs = revendeursData.map(revendeur => ({
        ...revendeur,
        est_actif: revendeur.est_actif === 1 || revendeur.est_actif === true,
        photo_profil: revendeur.photo_profil || "/bg.jpg"
      }));
      
      setRevendeurs(processedRevendeurs);
      
      // Calculer les statistiques
      // setStat({
        stat.total = revendeursList.length;
        stat.actifs = revendeursList.filter(r => r.est_actif).length,
        stat.inactifs = revendeursList.filter(r => !r.est_actif).length
      // });
      

    const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, credentials: 'include'
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

  const loadDashboardDataVip = async (userId) => {
    try {
      const token = getToken();
      
      if (!token)
        throw new Error('Token non disponible');
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
      
    } catch (err) {
      setError('Erreur lors du chargement des données VIP: ' + err.message);
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
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
      
      setStats && setStats(prev => ({
        ...prev,
        actifs: isActive ? prev.actifs - 1 : prev.actifs + 1,
        inactifs: isActive ? prev.inactifs + 1 : prev.inactifs - 1
      }));
      
    } catch (err) {
      setError('Erreur: ' + err.message);
    }
  };


  const formatNumberWithSpaces = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "0";
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Overlay pour la sidebar sur mobile
  const sidebarOverlay = sidebarOpen && (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
      onClick={toggleSidebar}
    ></div>
  );

  if (loading && !userInfo) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const renderRevendeursTable = (isVip = false) => {
  const currentStats = isVip ? statsVip : stats;
  const pricePerTicket = isVip ? 30000 : 8000;
  const ticketTypeLabel = isVip ? 'VIP' : 'Standard';
return loading ? (
      <div className="flex justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    ) : revendeurs.length > 0 ? (
      <Table
        darkMode={darkMode}
        columns={[
          { key: 'photo', header: 'Photo' },
          { key: 'nom_complet', header: 'Nom' },
          { key: 'telephone', header: 'Téléphone' },
          { key: 'tickets_actives', header: `Tickets ${ticketTypeLabel} vendus` },
          { key: 'tickets_remis', header: `Tickets ${ticketTypeLabel} Remis` },
          { key: 'money', header: "Chiffre d'affaire" },
          { key: 'tickets_disponibles', header: `Stock ${ticketTypeLabel}` },
          { key: 'statut', header: 'Statut' },
          { key: 'actions', header: 'Actions' }
        ]}
        data={revendeurs.map(revendeur => {
          const revendeurStats = isVip 
            ? currentStats?.revendeurs_vip?.find(r => r.id === revendeur.id)
            : currentStats?.revendeurs?.find(r => r.id === revendeur.id);
          
          const ticketsVendus = isVip 
            ? revendeurStats?.nb_vip_ven || 0
            : revendeurStats?.nb_tickets_ven || 0;
          
          const ticketsDisponibles = isVip 
            ? revendeurStats?.nb_vip || 0
            : revendeurStats?.nb_tickets || 0;
          
          const ticketsRemis = isVip 
            ? revendeurStats?.nb_vip_reçu || 0
            : revendeurStats?.nb_tickets_reçu || 0;

          return {
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
            tickets_actives: ticketsVendus,
            tickets_disponibles: ticketsDisponibles,
            tickets_remis: ticketsRemis,
            money: ticketsVendus * pricePerTicket,
            statut: revendeur.est_actif ? 
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Actif</span> : 
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Bloqué</span>,
            actions: (
              <div className="flex space-x-2">
                <button 
                  onClick={() => router.push(`/grossiste/distributions/${isVip ? '?tab=vip' : ''}`)}
                  className={`px-2 py-1 text-white rounded transition-colors ${
                    isVip ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  title={`Distribuer des tickets ${ticketTypeLabel}`}
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
                  onClick={() => handleToggleUserStatus(revendeur.id, revendeur.est_actif)}
                  className={`px-2 py-1 rounded text-white ${
                    revendeur.est_actif ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                  }`}
                  title={revendeur.est_actif ? "Bloquer" : "Débloquer"}>
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
            )};
        })}
        emptyMessage={`Aucun revendeur avec des tickets ${ticketTypeLabel} disponible`}
      />
    ) : (
      <div className="p-4 text-center text-gray-500">
        <p>Aucun revendeur n'est associé à votre compte</p>
        <p className="mt-2 text-sm">Ajoutez des revendeurs pour commencer à distribuer des tickets {ticketTypeLabel}</p>
      </div>
    );
  };


  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header user={userInfo} 
        userRole="Grossiste" 
        onMenuClick={toggleSidebar} 
      />
      
      <div className="flex flex-1 relative">
        <Sidebar 
          role="grossiste" 
          currentPage="revendeurs"
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          className={`md:relative absolute z-10 transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
          links={[
            { label: 'Tableau de bord', href: '/grossiste/dashboard', icon: 'dashboard' },
            { label: 'Revendeurs', href: '/grossiste/revendeurs', icon: 'users' },
            { label: 'Tickets', href: '/grossiste/tickets', icon: 'ticket' },
            { label: 'Distributions', href: '/grossiste/distributions', icon: 'share' },
            { label: 'Mes Gains', href: '/grossiste/gains', icon: 'money' },
            { label: 'Profil', href: '/grossiste/profile', icon: 'user' },
          ]}
        />
        
        {/* Overlay pour fermer le sidebar sur mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <main className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-0' : ''}`}>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textClass} mb-4 sm:mb-6 flex items-center`}>
            <button 
              onClick={toggleSidebar} 
              className="mr-3 text-gray-500 lg:hidden focus:outline-none"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>Gestion des Revendeurs</h1>
          
          {error && (
            <div className={`${errorBgClass} px-4 py-3 rounded relative mb-4 sm:mb-6 border`}>
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
            <Card 
              title="Total de revendeurs"
              value={stat.total}
              description="Sous votre supervision"
              icon="users"
              color="blue"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            
            <Card 
              title="Revendeurs actifs"
              value={stat.actifs}
              description="Autorisés à vendre"
              icon="user-check"
              color="green"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            
            <Card 
              title="Revendeurs inactifs"
              value={stat.inactifs}
              description="Bloqués"
              icon="user-x"
              color="red"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
          </div>
          
          <div className={`${cardBackgroundClass} shadow rounded-lg p-3 sm:p-4 md:p-6 mb-6 md:mb-8 overflow-x-auto`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
              <h2 className={`text-lg md:text-xl font-semibold  ${textClass}`}>Liste des revendeurs</h2>
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
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('standard')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'standard'
                        ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}>
                    Tickets Standard
                  </button>
                  <button
                    onClick={() => setActiveTab('vip')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'vip'
                        ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}>
                    Tickets VIP
                  </button>
                </nav>
              </div>
            </div>
            <div className="tab-content">
              {activeTab === 'standard' && renderRevendeursTable(false)}
              {activeTab === 'vip' && renderRevendeursTable(true)}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
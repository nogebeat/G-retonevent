'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import Card from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';
import QRScanner from '../../../components/QRScanner';

export default function RevendeurDashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [tickets, setTickets] = useState({ tickets: [], pagination: { total: 0 } });
  const [ticketsVendus, setTicketsVendus] = useState(0);
  const [ticketsDisponibles, setTicketsDisponibles] = useState(0);
  const [chiffreAffaires, setChiffreAffaires] = useState(0);
  
  // États pour les tickets VIP
  const [ticketsVIPVendus, setTicketsVIPVendus] = useState(0);
  const [ticketsVIPDisponibles, setTicketsVIPDisponibles] = useState(0);
  const [chiffreVIPAffaires, setChiffreVIPAffaires] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activationModal, setActivationModal] = useState(false);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  
  const [qrCode, setQrCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // État pour le type de ticket détecté automatiquement
  const [detectedTicketType, setDetectedTicketType] = useState(null);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [ticketdetected, setTicketdetected] = useState(0);
  
  // État pour le mode sombre
  
  const router = useRouter();
  const PRIX_TICKET = 8000;
  const PRIX_TICKET_VIP = 30000;
  
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };
  
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
        
        if (data.user && data.user.role_id !== 4) {
          router.push('/');
          return;
        }

        if (!data.user.photo_profil || data.user.photo_profil === 'NULL')
          data.user.photo_profil = "/bg.jpg";
        
        setUserInfo(data.user);
        loadDashboardData(data.user.id);
        loadTicketsInfo();
        loadVIPTicketsInfo();
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
      if (window.innerWidth >= 1024)
        setSidebarOpen(true);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [router]);

  const loadTicketsInfo = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Token non disponible');
      }
      const dispoResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/dispo`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!dispoResponse.ok) {
        throw new Error(`Erreur lors de la récupération des tickets disponibles: ${dispoResponse.status}`);
      }
      
      const dispoData = await dispoResponse.json();
      setTicketsDisponibles(dispoData.tickets || 0);
      const venteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/vente`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!venteResponse.ok) {
        throw new Error(`Erreur lors de la récupération des tickets vendus: ${venteResponse.status}`);
      }
      
      const venteData = await venteResponse.json();
      const ticketsVendus = venteData.tickets || 0;
      setTicketsVendus(ticketsVendus);
      setChiffreAffaires(ticketsVendus * PRIX_TICKET);
      
    } catch (err) {
      console.error("Erreur lors du chargement des informations sur les tickets standard:", err);
      setError('Erreur lors du chargement des informations sur les tickets standard: ' + err.message);
    }
  };

  const loadVIPTicketsInfo = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Token non disponible');
      }
      const dispoVIPResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/dispo`, {
        method: 'GET',headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }, credentials: 'include'
      });
      
      if (!dispoVIPResponse.ok) {
        throw new Error(`Erreur lors de la récupération des tickets VIP disponibles: ${dispoVIPResponse.status}`);
      }
      
      const dispoVIPData = await dispoVIPResponse.json();
      setTicketsVIPDisponibles(dispoVIPData.tickets || 0);
      const venteVIPResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/vente`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!venteVIPResponse.ok) {
        throw new Error(`Erreur lors de la récupération des tickets VIP vendus: ${venteVIPResponse.status}`);
      }
      
      const venteVIPData = await venteVIPResponse.json();
      const ticketsVIPVendus = venteVIPData.tickets || 0;
      setTicketsVIPVendus(ticketsVIPVendus);
      setChiffreVIPAffaires(ticketsVIPVendus * PRIX_TICKET_VIP);
      
    } catch (err) {
      console.error("Erreur lors du chargement des informations sur les tickets VIP:", err);
      setError('Erreur lors du chargement des informations sur les tickets VIP: ' + err.message);
    }
  };

  const loadDashboardData = async (userId) => {
    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }
      
      const ticketsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tickets?proprietaire_id=${userId}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!ticketsResponse.ok) {
        const errorText = await ticketsResponse.text();
        throw new Error(`Erreur serveur (${ticketsResponse.status}): ${errorText}`);
      }
      
      const ticketsData = await ticketsResponse.json();
      if (!ticketsData.tickets) {
        console.warn("Structure de réponse inattendue - pas de champ 'tickets':", ticketsData);
        setTickets({ tickets: [], pagination: { total: 0 } });
      } else {
        setTickets(ticketsData);
      }
      
    } catch (err) {
      setError('Erreur lors du chargement des données: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ouvrir le modal unifié
  const openActivationModal = () => {
    setActivationModal(true);
    setIsScanning(true);
    setQrCode('');
    setActivationError('');
    setActivationSuccess('');
    setDetectedTicketType(null);
    setTicketInfo(null);
  };

  const handleQrScan = (result) => {
    setQrCode(result);
    setIsScanning(false);
  };

  const toggleScanner = () => {
    setIsScanning(!isScanning);
    if (!isScanning) {
      setQrCode('');
      setDetectedTicketType(null);
      setTicketInfo(null);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Fonction pour détecter le type de ticket
  const detectTicketType = async (qrCodeValue) => {
    try {
      const externalResponse = await fetch(`https://api.aladecouvertedelafrique.com/api/festichill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrcode: qrCodeValue })
      });

      const exData = await externalResponse.json();

      const externalData = exData.data;

      // console.log(externalData?.ticket);

      if (!externalResponse.ok) {
        throw new Error(`Validation externe échouée: ${externalData.message || 'Erreur inconnue'}`);
      }

      // Détection automatique du type de ticket basé sur le prix
      let detectedType = 'standard';
      let ticketPrice = 0;
      
      if (externalData.ticket && externalData.ticket.price) {
        ticketPrice = parseInt(externalData.ticket.price);
        
        if (ticketPrice !== 7000 && ticketPrice !== 6000 && ticketPrice !== 8000 && ticketPrice !== 100) {
          detectedType = 'vip';
        }
        ticketPrice = 8000
      }
      setTicketdetected(ticketPrice);
      setDetectedTicketType(detectedType);
      setTicketInfo(externalData);
      return { type: detectedType, data: externalData };
    } catch (error) {
      throw error;
    }
  };

  const handleActivateTicket = async (e) => {
    e.preventDefault();
    setActivationLoading(true);
    setActivationError('');
    setActivationSuccess('');
    
    try {
      if (!qrCode) {
        throw new Error('Veuillez saisir ou scanner un code QR valide');
      }

      // Détecter le type de ticket si pas encore fait
      let ticketTypeToUse = detectedTicketType;
      let ticketData = ticketInfo;

      if (!ticketTypeToUse) {
        const detection = await detectTicketType(qrCode);
        ticketTypeToUse = detection.type;
        ticketData = detection.data;
      }

      // Vérifier si on a des tickets disponibles pour ce type
      const hasAvailableTickets = ticketTypeToUse === 'vip' ? 
        ticketsVIPDisponibles > 0 : ticketsDisponibles > 0;

      if (!hasAvailableTickets) {
        const ticketTypeText = ticketTypeToUse === 'vip' ? 'VIP' : 'Standard';
        throw new Error(`Aucun ticket ${ticketTypeText} disponible pour l'activation`);
      }

      // Déterminer l'endpoint basé sur le type détecté
      const endpoint = ticketTypeToUse === 'vip'
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/activate`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/activate`;

      // const endpoint = ticketTypeToUse === 'vip' 
      //   ? `${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/activator`
      //   : `${process.env.NEXT_PUBLIC_API_URL}/api/tickets/activator`;

      const token = getToken();
      const activationResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codeQr: qrCode }),
        credentials: 'include'
      });

      if (!activationResponse.ok) {
        const errorData = await activationResponse.json();
        throw new Error(`Activation échouée: ${errorData.msg || 'Erreur inconnue'}`);
      }

      const ticketTypeText = ticketTypeToUse === 'vip' ? 'VIP' : 'Standard';
      const ticketPriceText = ticketData?.ticket?.price ? `(${ticketData.ticket.price} FCFA)` : '';
      setActivationSuccess(`Ticket ${ticketTypeText} ${ticketPriceText} activé avec succès!`);
      
      loadDashboardData(userInfo.id);

      // Recharger les informations appropriées
      if (ticketTypeToUse === 'vip') {
        loadVIPTicketsInfo();
      } else {
        loadTicketsInfo();
      }

      setTimeout(() => {
        setActivationModal(false);
      }, 2000);

    } catch (err) {
      console.error('Erreur attrapée:', err);
      setActivationError('Erreur lors de l\'activation: ' + err.message);
    } finally {
      setActivationLoading(false);
    }
  };

  // Effet pour détecter automatiquement le type quand le QR code change
  useEffect(() => {
    if (qrCode && !isScanning && activationModal) {
      detectTicketType(qrCode).catch((error) => {
        console.error('Erreur lors de la détection:', error);
        setActivationError('Erreur lors de la vérification du ticket: ' + error.message);
      });
    }
  }, [qrCode, isScanning, activationModal]);

  if (loading && !userInfo) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  const ticketsList = Array.isArray(tickets.tickets) ? tickets.tickets : [];
  const hasAvailableTickets = ticketsDisponibles > 0 || ticketsVIPDisponibles > 0;
  const sidebarOverlay = sidebarOpen && (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
      onClick={toggleSidebar}
    ></div>
  );

  // Classes CSS dynamiques basées sur le thème
  const backgroundClass = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = darkMode ? 'text-white' : 'text-gray-800';
  const cardBackgroundClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';
  const errorBgClass = darkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700';

  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header 
        user={userInfo} 
        userRole="Revendeur" 
        onMenuClick={toggleSidebar}
        darkMode={darkMode}
      />
      
      <div className="flex flex-1 relative">
        {sidebarOverlay}
        
        <Sidebar 
          role="revendeur" 
          currentPage="dashboard"
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          links={[
            { label: 'Tableau de bord', href: '/revendeur/dashboard', icon: 'dashboard' },
            { label: 'Profil', href: '/revendeur/profile', icon: 'user' },
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
              className={`mr-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'} lg:hidden focus:outline-none`}
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            Tableau de bord
          </h1>
          
          {error && (
            <div className={`${errorBgClass} px-4 py-3 rounded relative mb-4 sm:mb-6 border`}>
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <Card
              title="Tickets Standard vendus"
              value={ticketsVendus}
              description="Total des ventes"
              icon="ticket"
              color="blue"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            <Card
              title="Tickets Standard restants"
              value={ticketsDisponibles}
              description="Non activés"
              icon="inventory"
              color="green"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            <Card
              title="Chiffre d'affaires Standard"
              value={`${chiffreAffaires.toLocaleString()} FCFA`}
              description="Total des ventes"
              icon="money"
              color="purple"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            <Card 
              title="Tickets VIP vendus"
              value={ticketsVIPVendus}
              description="Total des ventes VIP"
              icon="ticket"
              color="red"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            <Card
              title="Tickets VIP restants"
              value={ticketsVIPDisponibles}
              description="Non activés"
              icon="inventory"
              color="orange"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            <Card
              title="Chiffre d'affaires VIP"
              value={`${chiffreVIPAffaires.toLocaleString()} FCFA`}
              description="Total des ventes VIP"
              icon="money"
              color="yellow"
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
          </div>
          
          {/* Section d'activation unifiée */}
          <div className={`${cardBackgroundClass} shadow rounded-lg p-4 sm:p-6 mb-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className={`text-xl font-semibold ${textClass}`}>Scanner un ticket</h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                  Détection automatique du type (Standard/VIP)
                </p>
              </div>
              <button
                onClick={openActivationModal}
                disabled={!hasAvailableTickets}
                className={`px-4 py-2 rounded text-white flex items-center ${
                  hasAvailableTickets ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden xs:inline">Scanner un ticket</span>
                <span className="xs:hidden">Scanner</span>
              </button>
            </div>
            {!hasAvailableTickets && (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                Aucun ticket disponible pour l'activation
              </p>
            )}
            
            {/* Résumé des tickets disponibles */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className={`p-3 rounded-lg border ${
                darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className={`text-sm font-medium ${
                    darkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    Standard: {ticketsDisponibles} disponibles
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${
                darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span className={`text-sm font-medium ${
                    darkMode ? 'text-red-300' : 'text-red-700'
                  }`}>
                    VIP: {ticketsVIPDisponibles} disponibles
                  </span>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Modal d'activation unifié */}
      <Modal
        isOpen={activationModal} 
        onClose={() => {
          setActivationModal(false);
          setIsScanning(false);
          setDetectedTicketType(null);
          setTicketInfo(null);
        }}
        title="Scanner un ticket"
      >
        <form onSubmit={handleActivateTicket} className="space-y-4">
          {isScanning ? (
            <div className="mb-4">
              <div className="w-full max-w-full overflow-hidden">
                <QRScanner onScan={handleQrScan} />
              </div>
              <button 
                type="button" 
                onClick={toggleScanner}
                className={`mt-2 w-full px-4 py-2 border ${
                  darkMode 
                    ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' 
                    : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50'
                } rounded-md shadow-sm text-sm font-medium`}
              >
                Saisir manuellement
              </button>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap justify-between items-center mb-1">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Code QR du ticket
                </label>
                <button
                  type="button"
                  onClick={toggleScanner}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Scanner avec la caméra
                </button>
              </div>
              <input
                type="password"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-600 placeholder-gray-400'
                }`}
                placeholder="Entrez ou scannez le code QR du ticket"
                required
                autoFocus
              />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                {qrCode ? 'Code QR détecté - Vérification en cours...' : 'Scannez ou saisissez le code QR du ticket à activer'}
              </p>
            </div>
          )}
          
          {/* Affichage du type de ticket détecté */}
          {detectedTicketType && ticketInfo && (
            <div className={`p-4 rounded-lg border ${
              detectedTicketType === 'vip' 
                ? (darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200')
                : (darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200')
            }`}>
              <div className="flex items-center mb-2">
                <div className={`w-4 h-4 rounded-full mr-3 ${detectedTicketType === 'vip' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <span className={`text-lg font-bold ${
                  detectedTicketType === 'vip' 
                    ? (darkMode ? 'text-red-300' : 'text-red-700')
                    : (darkMode ? 'text-blue-300' : 'text-blue-700')
                }`}>
                  Ticket {detectedTicketType === 'vip' ? 'VIP' : 'Standard'}
                </span>
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p><strong>Prix:</strong> {ticketdetected} FCFA</p>
                <p><strong>Type:</strong> {ticketInfo.ticket?.ticket}</p>
              </div>
            </div>
          )}
          
          {activationError && (
            <div className={`px-4 py-3 rounded relative border ${
              darkMode ? 'bg-red-900/50 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700'
            }`}>
              {activationError}
            </div>
          )}
          {activationSuccess && (
            <div className={`px-4 py-3 rounded relative border ${
              darkMode ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-green-100 border-green-400 text-green-700'
            }`}>
              {activationSuccess}
            </div>
          )}
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => {
                setActivationModal(false);
                setIsScanning(false);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                darkMode 
                  ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' 
                  : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50'
              }`}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={activationLoading || !qrCode || isScanning}
              className={`flex-1 sm:flex-none px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                detectedTicketType === 'vip' 
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }`}
            >
              {activationLoading ? 'Activation...' : `Activer le ticket ${detectedTicketType === 'vip' ? 'VIP' : 'Standard'}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


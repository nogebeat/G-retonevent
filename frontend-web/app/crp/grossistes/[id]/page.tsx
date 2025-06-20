'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../../components/dashboard/Header';
import Sidebar from '../../../../components/dashboard/Sidebar';
import Modal from '../../../../components/ui/Modal';
import Table from '../../../../components/ui/Table';
import NotificationModal from '../../../../components/ui/NotificationModal';
import { toast } from 'react-hot-toast';

export default function GrossisteDetailPage() {
  // États principaux
  const [userInfo, setUserInfo] = useState(null);
  const [grossiste, setGrossiste] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [revendeursGrossiste, setRevendeursGrossiste] = useState([]);
  const [loadingRevendeurs, setLoadingRevendeurs] = useState(false);

  const [activeTab, setActiveTab] = useState('standard');

  // États pour les modals
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [notificationModal, setNotificationModal] = useState({
    isOpen: false,
    recipientId: null,
    recipientName: ''
  });

  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    telephone: '',
    email: '',
    pseudo: '',
    age: '',
    cip: ''
  });

  const [newStatus, setNewStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const router = useRouter();
  const params = useParams();
  const grossisteId = params.id;

  // Liste des statuts disponibles
  const statutsDisponibles = [
    { value: 'non_assigné', label: 'Non assigné', color: 'bg-gray-100 text-gray-800' },
    { value: 'RP-Ancien', label: 'RP-Ancien', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'RP-Nouveau', label: 'RP-Nouveau', color: 'bg-green-100 text-green-800' },
    { value: 'Partenaire', label: 'Partenaire', color: 'bg-blue-100 text-blue-800' }
  ];

  // Gestion du mode sombre
  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    if (savedTheme !== null) {
      setDarkMode(JSON.parse(savedTheme));
    }
  }, []);

  useEffect(() => {
      if (grossisteId) {
          loadRevendeursGrossiste(grossisteId);
      }
  }, [grossisteId]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    }
  };

  const backgroundClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const cardBackgroundClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';

  // Fonction pour récupérer le token
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');
    
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include' as RequestCredentials
    };
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, 
      { ...defaultOptions, ...options }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur: ${response.status}`);
    }
    
    return await response.json();
  }, []);

  // Vérifier l'authentification
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const actifData = await apiCall('/api/users/check-actif');
        if (actifData.est_actif === 0) {
          router.push('/blocked');
          return;
        }
        const userData = await apiCall('/api/auth/me');
        if (userData.user && userData.user.role_id !== 2) {
          router.push('/');
          return;
        }
        if (!userData.user.photo_profil || userData.user.photo_profil === 'NULL') {
          userData.user.photo_profil = "/bg.jpg";
        }
        setUserInfo(userData.user);

        // Charger les données du grossiste
        if (grossisteId) {
          await loadGrossisteData();
        } else {
          router.push('/crp/grossistes');
        }
      } catch (err) {
        console.error('Erreur d\'authentification:', err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Gestion de la sidebar responsive
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

  }, [apiCall, router, grossisteId]);

  const handleNotificationSent = (result) => {
  console.log('Notification envoyée:', result);
};

  // Charger les données du grossiste
  const loadGrossisteData = async () => {
    try {
      const grossisteData = await apiCall(`/api/users/${grossisteId}`);
      
      // Vérifier que c'est bien un grossiste
      if (grossisteData.role_id !== 3) {
        throw new Error('Cet utilisateur n\'est pas un grossiste');
      }

      if (!grossisteData.photo_profil || grossisteData.photo_profil === 'NULL') {
        grossisteData.photo_profil = "/bg.jpg";
      }
      
      setGrossiste(grossisteData);
      setFormData({
        nom: grossisteData.nom || '',
        prenoms: grossisteData.prenoms || '',
        telephone: grossisteData.telephone || '',
        email: grossisteData.email || '',
        pseudo: grossisteData.pseudo || '',
        age: grossisteData.age || '',
        cip: grossisteData.cip || ''
      });
      setNewStatus(grossisteData.statut || 'non_assigné');
      // console.log(grossisteData);
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Impossible de charger les informations du grossiste.');
      toast.error('Impossible de charger les informations du grossiste.');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await apiCall(`/api/users/${grossisteId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      toast.success('Informations du grossiste mises à jour');
      await loadGrossisteData();
      setEditModal(false);
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setFormError('Impossible de mettre à jour les informations');
      toast.error('Erreur lors de la mise à jour des informations');
    } finally {
      setFormLoading(false);
    }
  };

  // Modifier le statut
  const handleSubmitStatus = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await apiCall(`/api/users/change-statut/${grossisteId}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: newStatus })
      });

      toast.success('Statut du grossiste mis à jour');
      await loadGrossisteData();
      setStatusModal(false);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setFormError('Impossible de mettre à jour le statut');
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setFormLoading(false);
    }
  };

  // Supprimer le grossiste
  const handleDeleteGrossiste = async () => {
    try {
      await apiCall(`/api/users/${grossisteId}`, {
        method: 'DELETE'
      });

      toast.success('Grossiste supprimé avec succès');
      router.push('/crp/grossistes');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toast.error('Impossible de supprimer le grossiste');
    }
  };

  // Bloquer/débloquer un grossiste
  const handleToggleUserStatus = async () => {
    try {
      await apiCall(`/api/users/change-actif/${grossisteId}`, {
        method: 'PUT',
        body: JSON.stringify({ est_actif: !grossiste.est_actif })
      });
      
      toast.success(`Grossiste ${grossiste.est_actif ? 'bloqué' : 'débloqué'} avec succès`);
      await loadGrossisteData();
    } catch (err) {
      console.error('Erreur lors du changement de statut:', err);
      toast.error('Impossible de modifier le statut du grossiste');
    }
  };

  const handleToggleUserStatusrev = async (userId, isActive) => {
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
      
      if (!response.ok)
        throw new Error(`Erreur lors de la modification du statut: ${response.status}`);
      // setGrossistes(prevGrossistes => 
      //   prevGrossistes.map(grossiste => 
      //     grossiste.id === userId 
      //       ? { ...grossiste, est_actif: !isActive } 
      //       : grossiste
      //   )
      // );
      
    } catch (err) {
      setError('Erreur: ' + err.message);
    }
  };

  // Fonctions utilitaires
  const getStatusInfo = (statut) => {
    const statusInfo = statutsDisponibles.find(s => s.value === statut);
    return statusInfo || { value: 'non_assigné', label: 'Non assigné', color: 'bg-gray-100 text-gray-800' };
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const openNotificationModal = (grossisteId, grossisteName) => {
    setNotificationModal({
      isOpen: true,
      recipientId: grossisteId,
      recipientName: grossisteName
    });
  };

  const closeNotificationModal = () => {
    setNotificationModal({
      isOpen: false,
      recipientId: null,
      recipientName: ''
    });
  };

  const loadRevendeursGrossiste = async (grossisteId) => {
      try {
          setLoadingRevendeurs(true);
          const data = await apiCall(`/api/users/grossiste/${grossisteId}/revendeurs`);
          
          setRevendeursGrossiste(data.revendeurs || []);
          
          // console.log('Grossiste:', data.grossiste);
          // console.log('Nombre de revendeurs:', data.total);
          
          return data;
      } catch (err) {
          console.error('Erreur lors du chargement des revendeurs:', err);
          toast.error('Impossible de charger les revendeurs du grossiste');
          setRevendeursGrossiste([]);
          throw err;
      } finally {
          setLoadingRevendeurs(false);
      }
  };

  const getRevendeursSimple = async (grossisteId) => {
      try {
          const revendeurs = await apiCall(`/api/users/revendeurs-by-grossiste/${grossisteId}`);
          return revendeurs;
      } catch (err) {
          console.error('Erreur lors de la récupération des revendeurs:', err);
          toast.error('Impossible de récupérer les revendeurs');
          return [];
      }
  };

  const renderRevendeursTable = (revendeursData, isVip) => {
    const pricePerTicket = isVip ? 30000 : 8000;
    
    return revendeursData && revendeursData.length > 0 ? (
      <div className="overflow-x-auto">
        <div className="min-w-full overflow-x-auto -mx-4 md:mx-0">
          <Table
            darkMode={darkMode}
            columns={[
              { key: 'photo', header: 'Photo' },
              { key: 'nom_complet', header: 'Nom' },
              { key: 'tickets_actives', header: 'Tickets vendus' },
              { key: 'tickets_remis', header: 'Tickets Remis', hideOnMobile: true },
              { key: 'money', header: "Chiffre d'affaire", hideOnMobile: true },
              { key: 'tickets_disponibles', header: 'Stock', hideOnMobile: true },
              { key: 'statut', header: 'Statut', hideOnMobile: true },
              { key: 'actions', header: 'Actions', hideOnMobile: true }
            ]}
            data={revendeursData.map(revendeur => ({
              ...revendeur,
              photo: (
                <Image 
                  src={revendeur.photo_profil || '/bg.jpg'}
                  alt="Photo de profil"
                  width={40}
                  height={35}
                  className="rounded-full object-cover"
                  style={{ objectFit: 'cover' }}
                  priority={true}
                />
              ),
              nom_complet: `${revendeur.nom || ''} ${revendeur.prenoms || ''} (${revendeur.telephone || ''}) `,
              tickets_actives: isVip ? revendeur.nb_vip_ven || 0 : revendeur.nb_tickets_ven || 0,
              tickets_disponibles: isVip ? revendeur.nb_vip || 0 : revendeur.nb_tickets || 0,
              tickets_remis: isVip ? revendeur.nb_vip_reçu || 0 : revendeur.nb_tickets_reçu || 0,
              money: isVip ? (revendeur.nb_vip_ven || 0) * pricePerTicket : (revendeur.nb_tickets_ven || 0) * pricePerTicket,
              statut: revendeur.est_actif ? 
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Actif</span> : 
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Bloqué</span>,
              actions: (
                <div className="flex flex-wrap gap-1 justify-center sm:justify-start space-x-2">
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
                </div>
              )
            }))}
            emptyMessage={`Aucun revendeur disponible pour ce grossiste`}
          />
        </div>
      </div>
    ) : (
      <div className="p-4 text-center text-gray-500">
        <p>Aucun revendeur n'est associé à ce grossiste</p>
        <p className="mt-2 text-sm">Le grossiste peut ajouter des revendeurs via son tableau de bord</p>
      </div>
    );
};


  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${backgroundClass}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className={`${textClass} text-lg`}>Chargement des informations...</p>
        </div>
      </div>
    );
  }

  if (!grossiste) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${backgroundClass}`}>
        <div className={`text-center ${textClass}`}>
          <div className="mb-8">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4">Grossiste non trouvé</h2>
          <p className="text-gray-500 mb-8">Le grossiste que vous recherchez n'existe pas ou vous n'avez pas l'autorisation de le voir.</p>
          <button
            onClick={() => router.push('/crp/grossistes')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            ← Retour à la liste des grossistes
          </button>
        </div>
      </div>
    );
  }

  const currentStatusInfo = getStatusInfo(grossiste.statut);

  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header 
        user={userInfo}
        userRole="CRP"
        onMenuClick={toggleSidebar}
      />
      
      <div className="flex flex-1">
        <Sidebar 
          role="crp" 
          currentPage="grossistes"
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          links={[
            { label: 'Tableau de bord', href: '/crp/dashboard', icon: 'dashboard' },
            { label: 'Grossistes', href: '/crp/grossistes', icon: 'users' },
            { label: 'Tickets', href: '/crp/tickets', icon: 'ticket' },
            { label: 'Profil', href: '/crp/profile', icon: 'user' },
          ]}
          className={`transition-all duration-300 fixed lg:relative z-30 h-full ${
            sidebarOpen ? 'left-0' : '-left-64'
          } lg:left-0`}
        />
        
        <main className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-0' : ''
        }`}>
          {/* Header avec breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <button 
                onClick={() => router.push('/crp/dashboard')}
                className="hover:text-indigo-600 transition-colors"
              >
                Tableau de bord
              </button>
              <svg className="flex-shrink-0 mx-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <button 
                onClick={() => router.push('/crp/grossistes')}
                className="hover:text-indigo-600 transition-colors"
              >
                Grossistes
              </button>
              <svg className="flex-shrink-0 mx-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className={textClass}>
                {grossiste.nom} {grossiste.prenoms}
              </span>
            </div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center">
                <button 
                  onClick={toggleSidebar} 
                  className="mr-4 text-gray-500 lg:hidden focus:outline-none hover:text-gray-700"
                  aria-label="Menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className={`text-3xl font-bold ${textClass}`}>
                  Profil du grossiste
                </h1>
              </div>
              
              <button
                onClick={() => router.push('/crp/grossistes')}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Carte de profil principale */}
          <div className={`${cardBackgroundClass} shadow-lg rounded-xl overflow-hidden mb-8`}>
            {/* En-tête avec dégradé */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <Image 
                    src={grossiste.photo_profil} 
                    alt="Photo de profil"
                    width={120}
                    height={120}
                    className="rounded-full object-cover border-4 border-white shadow-lg"
                    style={{ objectFit: 'cover' }}
                    priority={true}
                  />
                  <div className="absolute -bottom-2 -right-2">
                    {grossiste.est_actif ? 
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      :
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-red-500 rounded-full">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span>
                    }
                  </div>
                </div>
                
                <div className="text-center sm:text-left text-white">
                  <h2 className="text-3xl font-bold mb-2">
                    {grossiste.nom} {grossiste.prenoms}
                  </h2>
                  <p className="text-lg opacity-90 mb-1">@{grossiste.pseudo}</p>
                  <p className="opacity-75">{grossiste.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {grossiste.est_actif ? 
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Compte actif
                      </span>
                      : 
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Compte bloqué
                      </span>
                    }
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Grossiste
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatusInfo.color}`}>
                      {currentStatusInfo.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informations détaillées */}
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Téléphone</p>
                    <p className={`text-lg font-semibold ${textClass}`}>{grossiste.telephone}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nom d'utilisateur</p>
                    <p className={`text-lg font-semibold ${textClass}`}>@{grossiste.pseudo}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Code CIP</p>
                    <p className={`text-lg font-semibold ${textClass}`}>{grossiste.cip || 'Non défini'}</p>
                  </div>
                </div>

                {grossiste.age && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 018 0v4m-4 6v6m-4-6h8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v2m-8 0h8" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Âge</p>
                      <p className={`text-lg font-semibold ${textClass}`}>{grossiste.age} ans</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Membre depuis</p>
                    <p className={`text-lg font-semibold ${textClass}`}>
                      {new Date(grossiste.date_creation).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Statut</p>
                    <p className={`text-lg font-semibold ${textClass}`}>{currentStatusInfo.label}</p>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setEditModal(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier les informations
                </button>

                <button
                  onClick={() => setStatusModal(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Modifier le statut
                </button>

                <button
                  onClick={handleToggleUserStatus}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors font-medium ${
                    grossiste.est_actif 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {grossiste.est_actif ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      Bloquer le compte
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Débloquer le compte
                    </>
                  )}
                </button>

                <button
                  onClick={() => openNotificationModal(grossiste.id, `${grossiste.nom} ${grossiste.prenoms}`)}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7z" />
                  </svg>
                  Envoyer une notification
                </button>

                <button
                  onClick={() => setDeleteModal(true)}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </button>
              </div>
            </div>
          </div>

          {/* Statistiques supplémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`${cardBackgroundClass} p-6 rounded-xl shadow-sm ${borderClass} border`}>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Type de compte</p>
                  <p className={`text-lg font-semibold ${textClass}`}>Grossiste</p>
                </div>
              </div>
            </div>

            <div className={`${cardBackgroundClass} p-6 rounded-xl shadow-sm ${borderClass} border`}>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Statut du compte</p>
                  <p className={`text-lg font-semibold ${grossiste.est_actif ? 'text-green-600' : 'text-red-600'}`}>
                    {grossiste.est_actif ? 'Actif' : 'Bloqué'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${cardBackgroundClass} p-6 rounded-xl shadow-sm ${borderClass} border`}>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Statut commercial</p>
                  <p className={`text-lg font-semibold ${textClass}`}>{currentStatusInfo.label}</p>
                </div>
              </div>
            </div>

          </div>
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
            {loadingRevendeurs ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Chargement des revendeurs...</span>
              </div>
            ) : (
              <>
                {activeTab === 'standard' && renderRevendeursTable(revendeursGrossiste, false)}
                {activeTab === 'vip' && renderRevendeursTable(revendeursGrossiste, true)}
              </>
            )}
        </main>
      </div>

      {/* Modal de modification des informations */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Modifier les informations du grossiste"
        size="lg"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nom de famille"
              />
            </div>

            <div>
              <label htmlFor="prenoms" className="block text-sm font-medium text-gray-700 mb-2">
                Prénoms *
              </label>
              <input
                type="text"
                id="prenoms"
                name="prenoms"
                value={formData.prenoms}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Prénoms"
              />
            </div>

            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Numéro de téléphone"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Adresse email"
              />
            </div>

            <div>
              <label htmlFor="pseudo" className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'utilisateur *
              </label>
              <input
                type="text"
                id="pseudo"
                name="pseudo"
                value={formData.pseudo}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nom d'utilisateur"
              />
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                Âge
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleFormChange}
                min="1"
                max="120"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Âge"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="cip" className="block text-sm font-medium text-gray-700 mb-2">
                Code CIP
              </label>
              <input
                type="text"
                id="cip"
                name="cip"
                value={formData.cip}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Code CIP"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => setEditModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
            >
              {formLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              )}
              Sauvegarder
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de modification du statut */}
      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title="Modifier le statut du grossiste"
        size="md"
      >
        <form onSubmit={handleSubmitStatus} className="space-y-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Statut actuel : <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${currentStatusInfo.color}`}>
                {currentStatusInfo.label}
              </span>
            </label>
            
            <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau statut *
            </label>
            <select
              id="newStatus"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {statutsDisponibles.map((statut) => (
                <option key={statut.value} value={statut.value}>
                  {statut.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Information</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Le changement de statut affectera la relation commerciale avec ce grossiste :</p>
                  <ul className="list-disc ml-5 mt-1">
                    <li><strong>Non assigné :</strong> Aucun statut particulier</li>
                    <li><strong>RP-Ancien :</strong> Ambassadeur de longue date du Rond point</li>
                    <li><strong>RP-Nouveau :</strong> Nouveau partenaire du Rond point</li>
                    <li><strong>Partenaire :</strong> Partenaire privilégié</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => setStatusModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
            >
              {formLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              )}
              Modifier le statut
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de suppression */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Supprimer le grossiste"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Attention !</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Vous êtes sur le point de supprimer définitivement le compte de{' '}
                    <strong>{grossiste.nom} {grossiste.prenoms}</strong>.
                  </p>
                  <p className="mt-2">Cette action est irréversible et entraînera :</p>
                  <ul className="list-disc ml-5 mt-1">
                    <li>La suppression de toutes les données du grossiste</li>
                    <li>La perte de l'historique des interactions</li>
                    <li>L'impossibilité de récupérer les informations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setDeleteModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={() => {
              const message = `je voudrais supprimer cet utilisateur (${grossiste.nom} ${grossiste.prenoms}, id: ${grossiste.id}). pouvez-vous m'aider ?`;
              const url = `https://wa.me/+22956549199?text=${encodeURIComponent(message)}`;
              window.open(url, '_blank');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Supprimer définitivement
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de notification */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={closeNotificationModal}
        recipientId={notificationModal.recipientId}
        recipientName={notificationModal.recipientName}
        onSend={handleNotificationSent}
      />
    </div>
  );
  
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../../components/dashboard/Header';
import Sidebar from '../../../../components/dashboard/Sidebar';
import Modal from '../../../../components/ui/Modal';
import NotificationModal from '../../../../components/ui/NotificationModal';
import { toast } from 'react-hot-toast';

export default function RevendeurDetailPage() {
  // États principaux
  const [userInfo, setUserInfo] = useState(null);
  const [revendeur, setRevendeur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // États pour les modals
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
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
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const router = useRouter();
  const params = useParams();
  const revendeurId = params.id;

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
        if (userData.user && userData.user.role_id !== 3) {
          router.push('/');
          return;
        }
        if (!userData.user.photo_profil || userData.user.photo_profil === 'NULL') {
          userData.user.photo_profil = "/bg.jpg";
        }
        setUserInfo(userData.user);

        // Charger les données du revendeur SEULEMENT si userInfo est bien défini
        if (revendeurId) {
          await loadRevendeurData(userData.user.id);
        } else {
          router.push('/grossiste/dashboard');
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

  }, [apiCall, router, revendeurId]);

  // Charger les données du revendeur
  const loadRevendeurData = async (parentId) => {
    try {
      const revendeurData = await apiCall(`/api/users/${revendeurId}`);
      if (revendeurData.parent_id !== parentId) {
        throw new Error('Accès non autorisé à ce revendeur');
      }

      if (!revendeurData.photo_profil || revendeurData.photo_profil === 'NULL') {
        revendeurData.photo_profil = "/bg.jpg";
      }
      
      setRevendeur(revendeurData);
      setFormData({
        nom: revendeurData.nom || '',
        prenoms: revendeurData.prenoms || '',
        telephone: revendeurData.telephone || '',
        email: revendeurData.email || '',
        pseudo: revendeurData.pseudo || '',
        age: revendeurData.age || '',
        cip: revendeurData.cip || ''
      });
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Impossible de charger les informations du revendeur.');
      toast.error('Impossible de charger les informations du revendeur.');
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
      await apiCall(`/api/users/${revendeurId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      toast.success('Informations du revendeur mises à jour');
      await loadRevendeurData(userInfo.id);
      setEditModal(false);
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setFormError('Impossible de mettre à jour les informations');
      toast.error('Erreur lors de la mise à jour des informations');
    } finally {
      setFormLoading(false);
    }
  };

  // Supprimer le revendeur
  const handleDeleteRevendeur = async () => {
    try {
      await apiCall(`/api/users/${revendeurId}`, {
        method: 'DELETE'
      });

      toast.success('Revendeur supprimé avec succès');
      router.push('/grossiste/revendeurs');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toast.error('Impossible de supprimer le revendeur');
    }
  };

  // Bloquer/débloquer un revendeur
  const handleToggleUserStatus = async () => {
    try {
      await apiCall(`/api/users/change-actif/${revendeurId}`, {
        method: 'PUT',
        body: JSON.stringify({ est_actif: !revendeur.est_actif })
      });
      
      toast.success(`Revendeur ${revendeur.est_actif ? 'bloqué' : 'débloqué'} avec succès`);
      await loadRevendeurData(userInfo.id);
    } catch (err) {
      console.error('Erreur lors du changement de statut:', err);
      toast.error('Impossible de modifier le statut du revendeur');
    }
  };

  // Fonctions utilitaires
  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

  if (!revendeur) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${backgroundClass}`}>
        <div className={`text-center ${textClass}`}>
          <div className="mb-8">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4">Revendeur non trouvé</h2>
          <p className="text-gray-500 mb-8">Le revendeur que vous recherchez n'existe pas ou vous n'avez pas l'autorisation de le voir.</p>
          <button
            onClick={() => router.push('/grossiste/revendeurs')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            ← Retour à la liste des revendeurs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header 
        user={userInfo}
        userRole="Grossiste"
        onMenuClick={toggleSidebar}
      />
      
      <div className="flex flex-1">
        <Sidebar 
          role="grossiste" 
          currentPage="revendeurs"
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          links={[
            { label: 'Tableau de bord', href: '/grossiste/dashboard', icon: 'dashboard' },
            { label: 'Revendeurs', href: '/grossiste/revendeurs', icon: 'users' },
            { label: 'Tickets', href: '/grossiste/tickets', icon: 'ticket' },
            { label: 'Distributions', href: '/grossiste/distributions', icon: 'share' },
            { label: 'Profil', href: '/grossiste/profile', icon: 'user' },
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
                onClick={() => router.push('/grossiste/dashboard')}
                className="hover:text-indigo-600 transition-colors"
              >
                Tableau de bord
              </button>
              <svg className="flex-shrink-0 mx-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <button 
                onClick={() => router.push('/grossiste/revendeurs')}
                className="hover:text-indigo-600 transition-colors"
              >
                Revendeurs
              </button>
              <svg className="flex-shrink-0 mx-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className={textClass}>
                {revendeur.nom} {revendeur.prenoms}
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
                  Profil du revendeur
                </h1>
              </div>
              
              <button
                onClick={() => router.push('/grossiste/revendeurs')}
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
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <Image 
                    src={revendeur.photo_profil} 
                    alt="Photo de profil"
                    width={120}
                    height={120}
                    className="rounded-full object-cover border-4 border-white shadow-lg"
                    style={{ objectFit: 'cover' }}
                    priority={true}
                  />
                  <div className="absolute -bottom-2 -right-2">
                    {revendeur.est_actif ? 
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
                    {revendeur.nom} {revendeur.prenoms}
                  </h2>
                  <p className="text-lg opacity-90 mb-1">@{revendeur.pseudo}</p>
                  <p className="opacity-75">{revendeur.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {revendeur.est_actif ? 
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
                      Revendeur
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
                    <p className={`text-lg font-semibold ${textClass}`}>{revendeur.telephone}</p>
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
                    <p className={`text-lg font-semibold ${textClass}`}>@{revendeur.pseudo}</p>
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
                    <p className="text-sm font-medium text-gray-500">Code NIP</p>
                    <p className={`text-lg font-semibold ${textClass}`}>{revendeur.cip || 'Non défini'}</p>
                  </div>
                </div>

                {revendeur.age && (
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
                      <p className={`text-lg font-semibold ${textClass}`}>{revendeur.age} ans</p>
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
                      {new Date(revendeur.date_creation).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">ID Utilisateur</p>
                    <p className={`text-lg font-semibold ${textClass}`}>#{revendeur.id}</p>
                  </div>
                </div>
              </div>

              {/* Actions principales */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setEditModal(true)}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>

                <button
                  onClick={handleToggleUserStatus}
                  className={`flex items-center px-4 py-2 ${
                    revendeur.est_actif ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  } text-white rounded-lg transition-colors font-medium`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {revendeur.est_actif ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  {revendeur.est_actif ? 'Bloquer' : 'Débloquer'}
                </button>

                <button
                  onClick={() => openNotificationModal(revendeur.id, `${revendeur.nom} ${revendeur.prenoms}`)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Envoyer notification
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
        </main>
      </div>

      {/* Modal d'édition */}
      <Modal 
        isOpen={editModal} 
        onClose={() => setEditModal(false)}
        title="Modifier les informations du revendeur"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formError}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénoms <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="prenoms"
                value={formData.prenoms}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pseudo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pseudo"
                value={formData.pseudo}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Âge
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleFormChange}
                min="18"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code CIP <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="cip"
              value={formData.cip}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setEditModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de suppression */}
      <Modal 
        isOpen={deleteModal} 
        onClose={() => setDeleteModal(false)}
        title="Supprimer le revendeur"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Êtes-vous sûr de vouloir supprimer ce revendeur ?
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Cette action est irréversible. Toutes les données associées à <strong>{revendeur.nom} {revendeur.prenoms}</strong> seront définitivement supprimées.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setDeleteModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
              const message = `je voudrais supprimer cet utilisateur (${revendeur.nom} ${revendeur.prenoms}, id: ${revendeur.id}). pouvez-vous m'aider ?`;
              const url = `https://wa.me/+22956549199?text=${encodeURIComponent(message)}`;
              window.open(url, '_blank');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
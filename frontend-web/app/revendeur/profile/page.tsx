'use client';

import { useState, useEffect, useRef  } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import Image from 'next/image';
import Modal from '../../../components/ui/Modal';
import { toast } from 'react-hot-toast';

export default function RevendeurProfile() {
  const [userInfo, setUserInfo] = useState(null);
  const [parentInfo, setParentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [passwordModal,setPasswordModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    age: '',
    email: '',
    telephone: '',
    pseudo: ''
  });
    const fileInputRef = useRef(null);
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
  
  const backgroundClass = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const background2Class = darkMode ? 'bg-gray-800' : 'bg-gray-100';
  const textClass = darkMode ? 'text-white' : 'text-gray-800';
  const cardBackgroundClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';
  const errorBgClass = darkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
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
          console.error('Échec de l\'authentification:', await response.text());
          router.push('/');
          return;
        }
        
        const data = await response.json();
        
        if (!data.user || data.user.role_id !== 4) {
          router.push('/');
          return;
        }
        if (!data.user.photo_profil || data.user.photo_profil === 'NULL')
          data.user.photo_profil = "/bg.jpg";
        setUserInfo(data.user);
        
        setFormData({
          nom: data.user.nom || '',
          prenoms: data.user.prenoms || '',
          age: data.user.age?.toString() || '',
          email: data.user.email || '',
          telephone: data.user.telephone || '',
          pseudo: data.user.pseudo || ''
        });
        
        if (data.user.parent_id) {
          loadParentInfo(data.user.parent_id, token);
        }
      } catch (err) {
        console.error('Erreur d\'authentification:', err);
        router.push('/');
      } finally {
        setLoading(false);
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

  const loadParentInfo = async (parentId, token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${parentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setParentInfo(data);
      } else {
        console.error('Erreur lors du chargement des informations du grossiste:', await response.text());
      }
    } catch (err) {
      console.error('Erreur lors du chargement des informations du grossiste:', err);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (file.size > maxSize) {
      setError('La taille du fichier ne doit pas dépasser 5MB');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setError('Seuls les fichiers JPEG, PNG et JPG sont autorisés');
      return;
    }

    setUploadingPhoto(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo_profil', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userInfo.id}/photo`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: formData
        // console.log(formData);
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de la mise à jour de la photo');
      }

      const data = await response.json();
      setUserInfo(prev => ({ ...prev, photo_profil: data.photo_profil }));
      setSuccess('Photo de profil mise à jour avec succès!');

      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        localStorage.setItem('userData', JSON.stringify({
          ...userData,
          photo_profil: data.photo_profil
        }));
      }

    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la mise à jour de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
      return;
    }

    setUploadingPhoto(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      // const formData = new FormData();
      // formData.append('photo_profil', "NULL");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          photo_profil: "NULL"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de la suppression de la photo');
      }

      setUserInfo(prev => ({ ...prev, photo_profil: null }));
      setSuccess('Photo de profil supprimée avec succès!');

      // Mettre à jour le localStorage
      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        localStorage.setItem('userData', JSON.stringify({
          ...userData,
          photo_profil: null
        }));
      }

    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la suppression de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openEditModal = () => {
  setEditModal(true);
  setFormError('');
  setError('');
  setSuccess('');
};

const openPasswordModal = () => {
  setPasswordModal(true);
  setPasswordError('');
  setError('');
  setSuccess('');
};

// Fonction pour fermer les modals et réinitialiser les erreurs
const closeEditModal = () => {
  setEditModal(false);
  setFormError('');
};

const closePasswordModal = () => {
  setPasswordModal(false);
  setPasswordError('');
};

// Mise à jour du handleSubmit pour utiliser formError
const handleSubmit = async (e) => {
  e.preventDefault();
  setUpdating(true);
  setFormError(''); // Utiliser formError au lieu de error
  setError('');
  setSuccess('');
  
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userInfo.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        ...formData,
        age: parseInt(formData.age) || userInfo.age
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Échec de la mise à jour du profil');
    }
    
    const data = await response.json();
    setUserInfo(prev => ({...prev, ...data}));
    setSuccess('Profil mis à jour avec succès!');
    setEditModal(false); // Fermer le modal en cas de succès
    
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      localStorage.setItem('userData', JSON.stringify({
        ...userData,
        nom: data.nom,
        prenoms: data.prenoms,
        pseudo: data.pseudo,
        email: data.email,
        telephone: data.telephone
      }));
    }
  } catch (err) {
    setFormError(err.message || 'Une erreur est survenue lors de la mise à jour');
  } finally {
    setUpdating(false);
  }
};

// Mise à jour du handlePasswordChange pour utiliser passwordError
const handlePasswordChange = async (e) => {
  e.preventDefault();
  setUpdating(true);
  setPasswordError(''); // Utiliser passwordError au lieu de error
  setError('');
  setSuccess('');
  
  const oldPassword = e.target.old_password.value;
  const newPassword = e.target.new_password.value;
  const confirmPassword = e.target.confirm_password.value;
  
  if (!oldPassword || !newPassword || !confirmPassword) {
    setPasswordError('Tous les champs sont requis');
    setUpdating(false);
    return;
  }
  
  if (newPassword !== confirmPassword) {
    setPasswordError('Les nouveaux mots de passe ne correspondent pas');
    setUpdating(false);
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userInfo.id}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        ancien_mot_de_passe: oldPassword,
        nouveau_mot_de_passe: newPassword,
        conf_mot_de_passe: confirmPassword
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Échec de la mise à jour du mot de passe');
    }
    
    e.target.reset();
    setSuccess('Mot de passe mis à jour avec succès!');
    setPasswordModal(false); // Fermer le modal en cas de succès
  } catch (err) {
    setPasswordError(err.message || 'Une erreur est survenue lors de la mise à jour du mot de passe');
  } finally {
    setUpdating(false);
  }
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

  return (
    <div className={`min-h-screen ${backgroundClass} flex flex-col`}>
      <Header user={userInfo} 
        userRole="Revendeur" 
        onMenuClick={toggleSidebar}
      />
      
      <div className="flex flex-1 relative">
        {sidebarOverlay}
        
        <Sidebar 
          role="revendeur" 
          currentPage="profile"
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
          {/* Header avec titre */}
          <div className="mb-8">
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
                Mon Profil
              </h1>
            </div>
          </div>

          {/* Messages d'erreur/succès globaux */}
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

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Carte de profil principale */}
          <div className={`${background2Class} shadow-lg rounded-xl overflow-hidden mb-8`}>
            {/* En-tête avec dégradé */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    {userInfo?.photo_profil ? (
                      <Image 
                        src={userInfo.photo_profil} 
                        alt="Photo de profil"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        priority={true}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 text-2xl font-semibold">
                        {userInfo?.prenoms?.charAt(0)}{userInfo?.nom?.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* Overlay pour l'upload */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                       onClick={handlePhotoClick}>
                    {uploadingPhoto ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Input file caché */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                
                <div className="text-center sm:text-left text-white">
                  <h2 className="text-3xl font-bold mb-2">
                    {userInfo?.nom} {userInfo?.prenoms}
                  </h2>
                  <p className="text-lg opacity-90 mb-1">@{userInfo?.pseudo}</p>
                  <p className="opacity-75">{userInfo?.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Revendeur Officiel Geretonevent
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
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Téléphone</p>
                    <p className={`text-lg font-semibold ${textClass}`}>{userInfo?.telephone}</p>
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
                    <p className={`text-lg font-semibold ${textClass}`}>@{userInfo?.pseudo}</p>
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
                    <p className={`text-lg font-semibold ${textClass}`}>{userInfo?.cip || 'Non défini'}</p>
                  </div>
                </div>

                {userInfo?.age && (
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
                      <p className={`text-lg font-semibold ${textClass}`}>{userInfo?.age} ans</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Membre depuis</p>
                    <p className={`text-lg font-semibold ${textClass}`}>
                      {userInfo?.date_creation ? new Date(userInfo.date_creation).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>

                {parentInfo && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Mon Grossiste</p>
                      <p className={`text-lg font-semibold ${textClass}`}>{parentInfo.prenoms} {parentInfo.nom}</p>
                      <p className="text-sm text-gray-500">{parentInfo.telephone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions principales */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openEditModal}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier mes informations
                </button>

                <button
                  onClick={openPasswordModal}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Changer le mot de passe
                </button>

                {userInfo?.photo_profil && (
                  <button
                    onClick={handleDeletePhoto}
                    disabled={uploadingPhoto}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer la photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de modification des informations */}
      <Modal 
        isOpen={editModal} 
        onClose={closeEditModal}
        title="Modifier mes informations"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
                min="18"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {updating ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de changement de mot de passe */}
      <Modal 
        isOpen={passwordModal} 
        onClose={closePasswordModal}
        title="Changer le mot de passe"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {passwordError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {passwordError}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe actuel <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="old_password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="new_password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirm_password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closePasswordModal}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {updating ? 'Mise à jour...' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

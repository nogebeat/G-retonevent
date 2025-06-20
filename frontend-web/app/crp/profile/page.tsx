'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';
import Image from 'next/image';

export default function CRPProfile() {
  const [userInfo, setUserInfo] = useState(null);
  const [parentInfo, setParentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
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
        
        if (!data.user || data.user.role_id !== 2) {
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
        console.error('Erreur lors du chargement des informations du CRP:', await response.text());
      }
    } catch (err) {
      console.error('Erreur lors du chargement des informations du CRP:', err);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
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
      setError(err.message || 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');
    
    const oldPassword = e.target.old_password.value;
    const newPassword = e.target.new_password.value;
    const confirmPassword = e.target.confirm_password.value;
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont requis');
      setUpdating(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
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
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du mot de passe');
    } finally {
      setUpdating(false);
    }
  };
  

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNotificationSent = (result) => {
  console.log('Notification envoyée:', result);
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
      <Header user={userInfo} userRole="CRP"  onMenuClick={toggleSidebar}  />
      
      <div className="flex flex-1 relative ">
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
            onClick={toggleSidebar}
          ></div>
        )}
        <Sidebar 
          role="crp" 
          currentPage="profile"
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
          className={`transition-transform duration-300 h-full z-30 
            fixed lg:sticky top-0 
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        />
        
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
            Mon Profil</h1>
          
          <div className={`${background2Class} shadow rounded-lg overflow-hidden mb-6`}>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:space-x-8">
                <div className="md:w-1/3 flex flex-col items-center mb-6 md:mb-0">
                  <div className="relative w-32 h-32 mb-4">
                    {userInfo?.photo_profil ? (
                      <Image 
                        src={userInfo.photo_profil} 
                        alt="Photo de profil"
                        fill 
                        sizes="100%"
                        className="rounded-full object-cover"
                        priority={true}
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-semibold">
                        {userInfo?.prenoms?.charAt(0)}{userInfo?.nom?.charAt(0)}
                      </div>
                    )}

                    
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
                  
                  {/* Boutons de gestion de photo */}
                  <div className="flex space-x-2 mb-4">
                    <button
                      onClick={handlePhotoClick}
                      disabled={uploadingPhoto}
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {userInfo?.photo_profil ? 'Changer' : 'Ajouter'}
                    </button>
                    {userInfo?.photo_profil && (
                      <button
                        onClick={handleDeletePhoto}
                        disabled={uploadingPhoto}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    )}

                  </div>
                  
                  <h2 className={`text-xl font-semibold ${textClass}`}>{userInfo?.pseudo}</h2>
                  <p className="text-gray-600">ID: {userInfo?.id}</p>
                  <p className="text-gray-600">CIP: {userInfo?.cip || 'Non défini'}</p>
                  <p className="text-gray-600">Super-Grossiste</p>
                  
                  {parentInfo && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">ADMIINISTRATEUR</p>
                      <p className="font-medium text-gray-800">{parentInfo.prenoms} {parentInfo.nom}</p>
                      <p className="text-sm text-gray-600">{parentInfo.telephone}</p>
                    </div>
                  )}
                </div>
                
                <div className="md:w-2/3">
                  {error && (
                    <div className={`${errorBgClass} px-4 py-3 rounded relative mb-4 sm:mb-6 border`}>
                      {error}
                    </div>
                  )}
                  
                  {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
                      {success}
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nom" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                          Nom
                        </label>
                        <input
                          type="text"
                          id="nom"
                          name="nom"
                          value={formData.nom}
                          onChange={handleChange}
                          className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="prenoms" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                          Prénoms
                        </label>
                        <input
                          type="text"
                          id="prenoms"
                          name="prenoms"
                          value={formData.prenoms}
                          onChange={handleChange}
                          className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="pseudo" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                          Pseudo
                        </label>
                        <input
                          type="text"
                          id="pseudo"
                          name="pseudo"
                          value={formData.pseudo}
                          onChange={handleChange}
                          className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="age" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                          Âge
                        </label>
                        <input
                          type="number"
                          id="age"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="telephone" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          id="telephone"
                          name="telephone"
                          value={formData.telephone}
                          onChange={handleChange}
                          className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={updating}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {updating ? 'Mise à jour...' : 'Mettre à jour le profil'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4">
              <p className="text-sm text-gray-600">
                Membre depuis le {userInfo?.date_creation ? new Date(userInfo.date_creation).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          
          {/* Section de changement de mot de passe */}
          <div className={`${background2Class} shadow rounded-lg overflow-hidden`}>
            <div className="p-6">
              <h2 className={`text-xl ${textClass} mb-4`}>Changer le mot de passe</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="old_password" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                      Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      id="old_password"
                      name="old_password"
                      className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor="new_password" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      id="new_password"
                      name="new_password"
                      className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor="confirm_password" className={`block text-xs sm:text-sm font-medium ${textClass} mb-1`}>
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      className={`w-full px-2 py-1 sm:px-3 sm:py-2 border ${borderClass} rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${textClass}`}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {updating ? 'Mise à jour...' : 'Changer le mot de passe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

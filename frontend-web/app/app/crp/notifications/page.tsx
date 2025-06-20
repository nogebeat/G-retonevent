'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/dashboard/Header';
import Sidebar from '../../../components/dashboard/Sidebar';

export default function RevendeurNotifications() {
  const [userInfo, setUserInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [markingAsRead, setMarkingAsRead] = useState(new Set());
  const [deletingNotifications, setDeletingNotifications] = useState(new Set());

  const router = useRouter();

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

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
        
        if (data.user && data.user.role_id !== 2) {
          router.push('/');
          return;
        }

        if (!data.user.photo_profil || data.user.photo_profil === 'NULL')
          data.user.photo_profil = "/bg.jpg";
        
        setUserInfo(data.user);
        loadNotifications();
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

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token non disponible');
      }

      const queryParams = new URLSearchParams({
        limit: '50',
        offset: '0',
        ...(filter === 'unread' && { non_lues_seulement: 'true' })
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications?${queryParams}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }
      
      const data = await response.json();
      setNotifications(data);
      
    } catch (err) {
      setError('Erreur lors du chargement des notifications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    setMarkingAsRead(prev => new Set([...prev, notificationId]));
    
    try {
      const token = getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${notificationId}/lue`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du marquage comme lu');
      }

      // Mettre à jour l'état local
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, lu: true, date_lecture: new Date().toISOString() }
            : notif
        )
      );

    } catch (err) {
      setError('Erreur lors du marquage de la notification: ' + err.message);
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/marquer-toutes-lues`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du marquage de toutes les notifications');
      }

      loadNotifications();

    } catch (err) {
      setError('Erreur lors du marquage de toutes les notifications: ' + err.message);
    }
  };

  const deleteNotification = async (notificationId) => {
    setDeletingNotifications(prev => new Set([...prev, notificationId]));
    
    try {
      const token = getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${notificationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

    } catch (err) {
      setError('Erreur lors de la suppression de la notification: ' + err.message);
    } finally {
      setDeletingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Aujourd\'hui';
    } else if (diffDays === 2) {
      return 'Hier';
    } else if (diffDays <= 7) {
      return `Il y a ${diffDays - 1} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'distribution_tickets':
      case 'distribution_vip':
        return (
          <div className="bg-blue-100 p-2 rounded-full">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
        );
      case 'alerte':
        return (
          <div className="bg-red-100 p-2 rounded-full">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-gray-100 p-2 rounded-full">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.lu;
    if (filter === 'read') return notif.lu;
    return true;
  });

  const unreadCount = notifications.filter(notif => !notif.lu).length;

  if (loading && !userInfo) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const backgroundClass = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = darkMode ? 'text-white' : 'text-gray-800';
  const cardBackgroundClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';
  const errorBgClass = darkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700';

  const sidebarOverlay = sidebarOpen && (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
      onClick={toggleSidebar}
    ></div>
  );

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
          role="CRP" 
          currentPage="notifications"
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
          className={`transition-all duration-300 fixed lg:relative z-30 h-full ${
            sidebarOpen ? 'left-0' : '-left-64'
          } lg:left-0`}
        />
        
        <main className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-0' : ''
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className={`text-2xl sm:text-3xl font-bold ${textClass} flex items-center`}>
              <button 
                onClick={toggleSidebar} 
                className={`mr-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'} lg:hidden focus:outline-none`}
                aria-label="Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {unreadCount}
                </span>
              )}
            </h1>
            
            <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  Tout marquer comme lu
                </button>
              )}
              <button
                onClick={loadNotifications}
                className={`px-3 py-2 rounded-md text-sm ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Actualiser
              </button>
            </div>
          </div>

          {error && (
            <div className={`${errorBgClass} px-4 py-3 rounded relative mb-4 border`}>
              {error}
            </div>
          )}

          {/* Filtres */}
          <div className={`${cardBackgroundClass} rounded-lg shadow p-4 mb-6`}>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'all' 
                    ? 'bg-indigo-500 text-white' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Toutes ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'unread' 
                    ? 'bg-indigo-500 text-white' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Non lues ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'read' 
                    ? 'bg-indigo-500 text-white' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Lues ({notifications.length - unreadCount})
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className={`${cardBackgroundClass} rounded-lg shadow p-8 text-center`}>
                <svg className={`mx-auto h-12 w-12 ${darkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {filter === 'unread' ? 'Aucune notification non lue' : 
                   filter === 'read' ? 'Aucune notification lue' : 
                   'Aucune notification'}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                  {filter === 'all' ? 'Vous recevrez ici les notifications importantes.' : ''}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${cardBackgroundClass} rounded-lg shadow p-4 ${
                    !notification.lu ? `border-l-4 ${darkMode ? 'border-blue-400' : 'border-blue-500'}` : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`text-lg font-medium ${textClass} truncate`}>
                            {notification.titre}
                          </h3>
                          {!notification.lu && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></span>
                          )}
                        </div>
                        
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs">
                            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              De: {notification.expediteur_prenoms} {notification.expediteur_nom}
                            </span>
                            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDate(notification.date_creation)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!notification.lu && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                disabled={markingAsRead.has(notification.id)}
                                className="text-blue-500 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                              >
                                {markingAsRead.has(notification.id) ? 'Marquage...' : 'Marquer comme lu'}
                              </button>
                            )}
                            
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              disabled={deletingNotifications.has(notification.id)}
                              className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                            >
                              {deletingNotifications.has(notification.id) ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
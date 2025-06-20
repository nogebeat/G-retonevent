'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const Icon = ({ name }) => {
  switch (name) {
    case 'dashboard':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
        </svg>
      );
    case 'user':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      );
    case 'users':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      );
    case 'ticket':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      );
    case 'stats':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      );
    case 'share':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
        </svg>
      );
    case 'logout':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm9.293 5.293a1 1 0 011.414 1.414L12.414 11H15a1 1 0 110 2h-2.586l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3z" clipRule="evenodd" />
        </svg>
      );
    case 'moon':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      );
    case 'sun':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      );
      case 'money':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      );
  }
};

export default function Sidebar({ 
  role = 'utilisateur', 
  currentPage = '', 
  links = [], 
  isOpen = true, 
  onClose = () => {}, 
  className = '',
  darkMode = false,
  onToggleDarkMode = () => {}
}) {
  // Hook pour gérer le thème localement si pas fourni en props
  const [localDarkMode, setLocalDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    if (savedTheme !== null) {
      setLocalDarkMode(JSON.parse(savedTheme));
    }
  }, []);

  const isDark = darkMode !== undefined ? darkMode : localDarkMode;

  const handleToggleTheme = () => {
    const newTheme = !isDark;
    if (onToggleDarkMode) {
      onToggleDarkMode(newTheme);
    } else {
      setLocalDarkMode(newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', JSON.stringify(newTheme));
      }
    }
  };

  // Classes CSS dynamiques basées sur le thème
  const sidebarClasses = isDark 
    ? 'bg-gray-900 text-white border-gray-700' 
    : 'bg-white text-gray-900 border-gray-200 shadow-lg';
  
  const headerBorderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const subtitleClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const footerBorderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const footerTextClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const closeButtonHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const linkHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const activeLinkBg = isDark ? 'bg-indigo-700' : 'bg-indigo-600';
  const inactiveLinkText = isDark ? 'text-gray-300' : 'text-gray-700';
  const themeButtonHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

  return (
    <aside className={`fixed z-40 md:relative md:translate-x-0 transform top-0 left-0 h-full w-64 transition-all duration-200 ease-in-out ${sidebarClasses} ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${className}`}>
      
      {/* Header (mobile only) */}
      <div className={`p-4 flex justify-between items-center border-b ${headerBorderClass} md:hidden`}>
        <h2 className="text-lg font-semibold">FestiChill</h2>
        <div className="flex items-center space-x-2">
          {/* Bouton de basculement du thème */}
          <button 
            onClick={handleToggleTheme}
            className={`p-2 rounded-lg transition-colors ${themeButtonHover}`}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
          {/* Bouton de fermeture */}
          <button onClick={onClose} className={`p-1 rounded ${closeButtonHover}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Header (desktop) */}
      <div className="p-4 hidden md:block">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">FestiChill</h2>
          <button 
            onClick={handleToggleTheme}
            className={`p-2 rounded-lg transition-colors ${themeButtonHover}`}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
        </div>
        <p className={`text-sm ${subtitleClass}`}>Panneau {role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4">
        <ul className="space-y-2">
          {Array.isArray(links) && links.length > 0 ? (
            links.map((link, index) => (
              <li key={index}>
                <Link 
                  href={link.href}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    currentPage === link.href.split('/').pop()
                      ? `${activeLinkBg} text-white`
                      : `${inactiveLinkText} ${linkHover}`
                  }`}
                >
                  <Icon name={link.icon} />
                  <span>{link.label}</span>
                </Link>
              </li>
            ))
          ) : (
            <li className={`${subtitleClass} text-sm p-3`}>Aucun lien disponible</li>
          )}
        </ul>
      </nav>

      {/* Footer */}
      <div className={`mt-auto p-4 border-t ${footerBorderClass} text-xs ${footerTextClass}`}>
        © {new Date().getFullYear()} FestiChill
        <div className="mt-2">
          Besoin d'aide ?
          <p className="mt-1">
            Contacte 
            <Link href="https://wa.me/+22996974557" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1"> MFG </Link>
            ou 
            <Link href="https://wa.me/+22956549199" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1"> Noge </Link>
          </p>
        </div>
      </div>
    </aside>
  );
}
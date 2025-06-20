export default function Card({ 
  title, 
  value, 
  description, 
  icon, 
  color = 'blue', 
  darkMode, 
  onToggleDarkMode = () => {},
  // Nouvelles props pour les classes personnalisées
  className = '',
  cardBackgroundClass = '',
  textClass = ''
}) {
  
  const getIconComponent = () => {
    switch (icon) {
      case 'ticket':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        );
      case 'inventory':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'money':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'user':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  const getColorClass = () => {
    const baseClasses = {
      blue: 'text-blue-600',
      green: 'text-green-600', 
      red: 'text-red-600',
      yellow: 'text-yellow-600',
      gold: 'text-yellow-600',
      purple: 'text-purple-600'
    };
    
    const bgClasses = {
      blue: darkMode ? 'bg-blue-900' : 'bg-blue-100',
      green: darkMode ? 'bg-green-900' : 'bg-green-100',
      red: darkMode ? 'bg-red-900' : 'bg-red-100', 
      yellow: darkMode ? 'bg-yellow-900' : 'bg-yellow-100',
      gold: darkMode ? 'bg-yellow-900' : 'bg-yellow-100',
      purple: darkMode ? 'bg-purple-900' : 'bg-purple-100'
    };

    return `${baseClasses[color] || baseClasses.blue} ${bgClasses[color] || bgClasses.blue}`;
  };

  // Utiliser les classes personnalisées si elles sont fournies, sinon utiliser les classes par défaut
  const backgroundClass = cardBackgroundClass || (darkMode ? 'bg-gray-800' : 'bg-white');
  const titleTextClass = textClass || (darkMode ? 'text-white' : 'text-gray-900');
  const descriptionTextClass = darkMode ? 'text-gray-400' : 'text-gray-500';
  const valueTextClass = textClass || (darkMode ? 'text-white' : 'text-gray-900');

  return (
    <div className={`${backgroundClass} p-6 rounded-lg shadow-md transition-colors duration-300 ${className}`}>
      <div className="flex items-center mb-4">
        <div className={`p-2 rounded-full ${getColorClass()} mr-4`}>
          {getIconComponent()}
        </div>
        <div>
          <h3 className={`text-lg font-medium ${titleTextClass}`}>{title}</h3>
          <p className={`text-sm ${descriptionTextClass}`}>{description}</p>
        </div>
      </div>
      <div className={`text-2xl font-bold ${valueTextClass}`}>{value}</div>
    </div>
  );
}

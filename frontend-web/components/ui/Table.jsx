import { useState } from 'react';

export default function Table({ 
  columns, 
  data, 
  emptyMessage = "Aucune donnée disponible", 
  pagination = false, 
  itemsPerPage = 10, 
  tableClassName = '',
  responsiveClassName = '', 
  responsiveView = false,
  darkMode = false,
  // Nouvelles props pour les classes personnalisées
  cardBackgroundClass = '',
  textClass = '',
  borderClass = ''
}) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = pagination ? Math.ceil(data.length / itemsPerPage) : 1;
  const paginatedData = pagination 
    ? data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : data;
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(start + 2, totalPages - 1);
      
      if (end === totalPages - 1) {
        start = Math.max(2, end - 2);
      }
      
      if (start > 2) {
        pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  // Utiliser les classes personnalisées si elles sont fournies
  const backgroundClass = cardBackgroundClass || (darkMode ? 'bg-gray-800' : 'bg-white');
  const tableBackgroundClass = cardBackgroundClass || (darkMode ? 'bg-gray-900' : 'bg-white');
  const headerBackgroundClass = darkMode ? 'bg-gray-800' : 'bg-gray-50';
  const textColorClass = textClass || (darkMode ? 'text-gray-100' : 'text-gray-900');
  const headerTextClass = darkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColorClass = borderClass || (darkMode ? 'border-gray-700' : 'border-gray-200');
  const hoverClass = darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50';

  const renderPaginationButtons = () => {
    return getPageNumbers().map((page, index) => (
      <button
        key={index}
        onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
        disabled={typeof page !== 'number'}
        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
          page === currentPage
            ? 'z-10 bg-blue-600 text-white border-blue-500' 
            : typeof page === 'number'
            ? `${backgroundClass} ${textColorClass} hover:bg-gray-50 ${darkMode ? 'hover:bg-gray-700' : ''} ${borderColorClass}`
            : `${backgroundClass} text-gray-500 cursor-default ${borderColorClass}`
        }`}
      >
        {page}
      </button>
    ));
  };

  if (data.length === 0) {
    return (
      <div className={`${backgroundClass} ${borderColorClass} border rounded-md p-6 text-center ${textColorClass}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y ${borderColorClass.replace('border-', 'divide-')}`}>
        <thead className={headerBackgroundClass}>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium ${headerTextClass} uppercase tracking-wider`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`${tableBackgroundClass} divide-y ${borderColorClass.replace('border-', 'divide-')}`}>
          {paginatedData.map((row, rowIndex) => (
            <tr key={rowIndex} className={hoverClass}>
              {columns.map((column, colIndex) => (
                <td key={colIndex} className={`px-6 py-4 whitespace-nowrap text-sm ${textColorClass}`}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {pagination && totalPages > 1 && (
        <div className={`flex items-center justify-between border-t ${borderColorClass} ${backgroundClass} px-4 py-3 sm:px-6`}>
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                currentPage === 1
                  ? `bg-gray-100 ${darkMode ? 'bg-gray-800' : ''} text-gray-400 ${darkMode ? 'text-gray-600' : ''} cursor-not-allowed`
                  : `${backgroundClass} ${textColorClass} hover:bg-gray-50 ${darkMode ? 'hover:bg-gray-700' : ''}`
              }`}
            >
              Précédent
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                currentPage === totalPages
                  ? `bg-gray-100 ${darkMode ? 'bg-gray-800' : ''} text-gray-400 ${darkMode ? 'text-gray-600' : ''} cursor-not-allowed`
                  : `${backgroundClass} ${textColorClass} hover:bg-gray-50 ${darkMode ? 'hover:bg-gray-700' : ''}`
              }`}
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className={`text-sm ${textColorClass}`}>
                Affichage de <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> à{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, data.length)}
                </span>{' '}
                sur <span className="font-medium">{data.length}</span> résultats
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                    currentPage === 1
                      ? `bg-gray-100 ${darkMode ? 'bg-gray-800' : ''} text-gray-400 ${darkMode ? 'text-gray-600' : ''} cursor-not-allowed`
                      : `${backgroundClass} text-gray-500 ${darkMode ? 'text-gray-400' : ''} hover:bg-gray-50 ${darkMode ? 'hover:bg-gray-700' : ''}`
                  }`}
                >
                  <span className="sr-only">Précédent</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {renderPaginationButtons()}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                    currentPage === totalPages
                      ? `bg-gray-100 ${darkMode ? 'bg-gray-800' : ''} text-gray-400 ${darkMode ? 'text-gray-600' : ''} cursor-not-allowed`
                      : `${backgroundClass} text-gray-500 ${darkMode ? 'text-gray-400' : ''} hover:bg-gray-50 ${darkMode ? 'hover:bg-gray-700' : ''}`
                  }`}
                >
                  <span className="sr-only">Suivant</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

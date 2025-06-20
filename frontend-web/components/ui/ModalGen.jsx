'use client';

import { useState } from 'react';


export default function ModalGen({ 
  isOpen, 
  onClose, 
  targetRoleId, 
  roleName,
  isDarkMode = false
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/gen-user/${targetRoleId}?pass_id=${encodeURIComponent(password)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Erreur lors de la génération du lien');
      }

      setGeneratedLink(data.link);
      setLinkGenerated(true);

    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const shareViaWhatsApp = () => {
    const message = `Bonjour! Vous êtes invité(e) à rejoindre Geretonevent en tant que ${roleName}. Cliquez sur ce lien pour vous inscrire: ${generatedLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setGeneratedLink('');
    setLinkGenerated(false);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isDarkMode ? 'dark' : ''}`}>
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-md`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Générer un lien d'inscription
            </h2>
            <button
              onClick={handleClose}
              className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} text-2xl`}
            >
              ×
            </button>
          </div>

          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            Créer un lien d'invitation pour un nouveau <strong>{roleName}</strong>
          </p>

          {!linkGenerated ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                  Mot de passe de confirmation
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Entrez le mot de passe de confirmation"
                />
              </div>

              {error && (
                <div className={`border px-4 py-3 rounded ${
                  isDarkMode 
                    ? 'bg-red-900 border-red-700 text-red-200' 
                    : 'bg-red-100 border-red-400 text-red-700'
                }`}>
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className={`flex-1 px-4 py-2 border rounded-md transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Génération...' : 'Générer le lien'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className={`border px-4 py-3 rounded ${
                isDarkMode 
                  ? 'bg-green-900 border-green-700 text-green-200' 
                  : 'bg-green-100 border-green-400 text-green-700'
              }`}>
                <p className="font-semibold">Lien généré avec succès !</p>
                <p className="text-sm">Le lien d'invitation est prêt à être partagé.</p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                  Lien d'invitation
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className={`flex-1 px-3 py-2 border rounded-l-md text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 border border-l-0 rounded-r-md transition-colors ${
                      copied 
                        ? 'bg-green-500 text-white border-green-500' 
                        : isDarkMode 
                          ? 'bg-gray-600 hover:bg-gray-500 text-gray-200 border-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                    }`}
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={shareViaWhatsApp}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>📱</span>
                  <span>Partager via WhatsApp</span>
                </button>

                <button
                  onClick={handleClose}
                  className={`w-full px-4 py-2 border rounded-md transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Fermer
                </button>
              </div>

              <div className={`border rounded-md p-3 ${
                isDarkMode 
                  ? 'bg-blue-900 border-blue-700' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                  <strong>Note:</strong> Ce lien expire dans 12 heures et ne peut être utilisé qu'une seule fois.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
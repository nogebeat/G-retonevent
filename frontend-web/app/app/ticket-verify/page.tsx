'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '../../components/ui/Modal';
import QRScanner from '../../components/QRScanner';

export default function TicketVerifyPage() {
  const [ticketCode, setTicketCode] = useState('');
  const [ticketInfo, setTicketInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  
  const router = useRouter();

  const verifyTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await performVerification(ticketCode);
  };

  const performVerification = async (code: string) => {
    if (!code.trim()) {
      setError('Veuillez entrer un code de ticket');
      return;
    }

    setLoading(true);
    setScanLoading(true);
    setError('');
    
    try {
      // D'abord, essayons avec les tickets standard
      let response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/verify/${code}`);
      let data = await response.json();
      
      // Si le ticket standard n'est pas trouvé, essayons avec les tickets VIP
      if (!response.ok && response.status === 404) {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vip-tickets/verify/${code}`);
        data = await response.json();
      }

      if (!response.ok && response.status === 404) {
        const adaptedData = {
          code_qr: code.slice(0, 5) + '*'.repeat(Math.max(0, code?.length - 5)),
          statut: 'non_reconnu',
          categorie_nom: 'NULL',
          date_activation: 'NULL',
          revendeur: 'NULL',
          message: 'NULL',
          status: 'NULL',
          type: 'Standard'
        };
      setTicketInfo(adaptedData);
      } else {
      // Adapter les données pour l'affichage
      const adaptedData = {
        // code_qr: ${code.slice(0, 5)}${'*'.repeat(Math.max(0, code?.length - 5))},
        code_qr: code.slice(0, 5) + '*'.repeat(Math.max(0, code?.length - 5)),
        
        statut: data.valid ? 'active' : (data.status === 'Non valide' ? 'desactive' : 'non_reconnu'),
        categorie_nom: data.type === 'VIP' ? 'VIP' : 'Standard',
        date_activation: data.activationDate,
        revendeur: data.revendeur,
        message: data.message,
        status: data.status,
        type: data.type || 'Standard'
      };
      setTicketInfo(adaptedData);
    }
      
      
      // Fermer le modal de scan si ouvert
      if (showScanModal) {
        setShowScanModal(false);
        setIsScanning(false);
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la vérification');
      setTicketInfo(null);
    } finally {
      setLoading(false);
      setScanLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'desactive':
        return 'text-red-600';
      case 'non_reconnu':
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Valide';
      case 'desactive':
        return 'Non Valide';
      case 'non_reconnu':
      default:
        return 'Non Reconnu';
    }
  };

  const handleQrScan = (result) => {
    setQrCode(result);
    setIsScanning(false);
    // Vérifier automatiquement le ticket scanné
    performVerification(result);
  };

  const openScanModal = () => {
    setShowScanModal(true);
    setIsScanning(true);
    setQrCode('');
    setError('');
  };

  const closeScanModal = () => {
    setShowScanModal(false);
    setIsScanning(false);
    setQrCode('');
  };

  const toggleScanner = () => {
    setIsScanning(!isScanning);
    if (!isScanning) {
      setQrCode('');
    }
  };

  const handleManualVerification = async (e) => {
    e.preventDefault();
    if (qrCode.trim()) {
      await performVerification(qrCode);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-800 py-12 px-4 sm:px-6 lg:px-8 " style={{ backgroundImage: "url('/bg.jpg')"}}>
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden md:max-w-2xl">
        <div className="text-center p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Vérification de Ticket Festichill
          </h1>

          {/* Section de scan QR */}
          <div className="mb-6">
            <button
              onClick={openScanModal}
              className="w-full mb-4 flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Scanner un Code QR
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>
          </div>
          
          <form onSubmit={verifyTicket} className="space-y-6">
            <div>
              <label htmlFor="ticket-code" className="sr-only">
                Code du ticket
              </label>
              <input
                id="ticket-code"
                name="ticket-code"
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-600"
                placeholder="Saisissez le code du ticket manuellement"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
              />
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Vérification...' : 'Vérifier le Ticket'}
              </button>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}
          </form>
          
          {ticketInfo && (
            <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="text-center mb-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  ticketInfo.type === 'VIP' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {ticketInfo.categorie_nom}
                </div>
                <div className="mt-2">
                  <span className={`text-2xl font-bold ${getStatusColor(ticketInfo.statut)}`}>
                    {getStatusText(ticketInfo.statut)}
                  </span>
                </div>
                {ticketInfo.message && (
                  <p className="text-sm text-gray-600 mt-2">
                    {ticketInfo.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2 text-left">
                <p className="text-gray-600">
                  <span className="font-medium">Code:</span> {ticketInfo.code_qr}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Type:</span> {ticketInfo.categorie_nom}
                </p>
                {ticketInfo.date_activation && (
                  <p className="text-gray-600">
                    <span className="font-medium">Date d&apos;activation:</span>{' '}
                    {new Date(ticketInfo.date_activation).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {ticketInfo.revendeur && (
                  <p className="text-gray-600">
                    <span className="font-medium">Revendeur:</span> {ticketInfo.revendeur}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-8">
            <button
              type="button"
              onClick={() => router.push('https://festichill-final-show.netlify.app/')}
              className="text-indigo-600 hover:text-indigo-900"
            >
              Rendez-vous Au Festichill 2025
            </button>
          </div>
        </div>
      </div>

      {/* Modal de scan QR */}
      <Modal
        isOpen={showScanModal}
        onClose={closeScanModal}
        title="Scanner un Code QR"
      >
        <div className="space-y-4">
          {isScanning ? (
            <div className="mb-4">
              <div className="w-full max-w-full overflow-hidden">
                <QRScanner onScan={handleQrScan} />
              </div>
              <button 
                type="button" 
                onClick={toggleScanner}
                className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-600 bg-white hover:bg-gray-50"
              >
                Saisir manuellement
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualVerification}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-600">
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
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-600"
                  placeholder="Entrez le code QR du ticket"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  {qrCode ? 'Code QR détecté' : 'Scannez ou saisissez le code QR du ticket à vérifier'}
                </p>
              </div>
              
              {scanLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                  <span className="ml-2 text-sm text-gray-600">Vérification en cours...</span>
                </div>
              )}
              
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={closeScanModal}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={scanLoading || !qrCode || isScanning}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {scanLoading ? 'Vérification...' : 'Vérifier'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}

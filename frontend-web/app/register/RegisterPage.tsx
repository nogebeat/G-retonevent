'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    age: '',
    pseudo: '',
    email: '',
    telephone: '',
    mot_de_passe: '',
    conf_mot_de_passe: '',
    role_id: '',
    cip: '',
    parent_id: '',
    pass_id: '',
    invitation_token: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  let par;

  // Vérifier le token d'invitation au chargement
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyInvitationToken(token);
      setFormData(prev => ({ ...prev, invitation_token: token }));
    }
  }, [searchParams]);

  const verifyInvitationToken = async (token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-invitation/${token}`);
      const data = await response.json();

      if (data.valid) {
        setTokenInfo(data);
        setIsTokenValid(true);
        setFormData(prev => ({
          ...prev,
          role_id: data.role_id.toString(),
          invitation_token: token
        }));

        par = data.parent_role_id;

      } else {
        setError(data.msg || 'Token d\'invitation invalide');
        router.push('/invalid');
      }
    } catch (err) {
      setError('Erreur lors de la vérification du token');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'mot_de_passe') {
      validateMotDePasse(value);
    }
  };

  const getRoleName = (roleId) => {
    const roles = {
      1: 'Administrateur',
      2: 'CRP',
      3: 'Grossiste',
      4: 'Revendeur'
    };
    return roles[roleId] || 'Utilisateur';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validations
    if (formData.mot_de_passe !== formData.conf_mot_de_passe) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (formData.mot_de_passe.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    // Validation de l'âge
    const age = parseInt(formData.age);
    if (isNaN(age) || age < 1 || age > 120) {
      setError('Veuillez entrer un âge valide');
      setLoading(false);
      return;
    }

    try {
        let query;
      if (par === 3)
        query = `${process.env.NEXT_PUBLIC_API_URL}/api/g/users`;
      else
        query = `${process.env.NEXT_PUBLIC_API_URL}/api/users`;
      
      const response = await fetch(`${query}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          age: parseInt(formData.age)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Erreur lors de l\'inscription');
      }

      setSuccess('Inscription réussie ! Votre compte sera activé par votre parent.');
      
      // Rediriger vers la page de login après 3 secondes
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   setFormData(prev => ({ ...prev, [name]: value }));

  //   if (name === 'mot_de_passe') {
  //     validateMotDePasse(value);
  //   }
  // };

  const validateMotDePasse = (motDePasse) => {
    const erreurs = [];

    if (motDePasse.length < 8) erreurs.push("au moins 8 caractères");
    if ((motDePasse.match(/[A-Z]/g) || []).length < 1) erreurs.push("1 majuscules");
    if ((motDePasse.match(/[a-z]/g) || []).length < 1) erreurs.push("1 minuscules");
    if ((motDePasse.match(/[0-9]/g) || []).length < 1) erreurs.push("1 chiffres");
    if ((motDePasse.match(/[^a-zA-Z0-9]/g) || []).length < 1) erreurs.push("1 caractères spécials");

    if (erreurs.length > 0) {
      setErreur(`Le mot de passe doit contenir ${erreurs.join(', ')} et doit etre obscure`);
    } else {
      setErreur('Ce mot de passe est obscure');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: "url('/bg.jpg')" }}>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Geretonevent
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isTokenValid ? 'Complétez votre inscription' : 'Créer un nouveau compte'}
          </p>
          
          {tokenInfo && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Invitation de:</strong> {tokenInfo.parent_name}
              </p>
              <p className="text-sm text-blue-600">
                <strong>Rôle:</strong> {getRoleName(tokenInfo.role_id)}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            {success}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {/* Informations personnelles */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <input
                  id="nom"
                  name="nom"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Nom"
                  value={formData.nom}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="prenoms" className="block text-sm font-medium text-gray-700">
                  Prénoms
                </label>
                <input
                  id="prenoms"
                  name="prenoms"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Prénoms"
                  value={formData.prenoms}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                Âge
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="18"
                max="120"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Âge"
                value={formData.age}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="pseudo" className="block text-sm font-medium text-gray-700">
                Pseudo
              </label>
              <input
                id="pseudo"
                name="pseudo"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Pseudo"
                value={formData.pseudo}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <input
                id="telephone"
                name="telephone"
                type="tel"
                maxLength={13}
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Téléphone"
                value={formData.telephone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="cip" className="block text-sm font-medium text-gray-700">
                NIP (Obligatoire)
              </label>
              <input
                id="cip"
                name="cip"
                type="number"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="NIP"
                value={formData.cip}
                onChange={handleChange}
              />
            </div>

            {!isTokenValid}

            {/* Mots de passe */}
            <div className="space-y-6">
              <div>
                <label htmlFor="mot_de_passe" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <input
                  id="mot_de_passe"
                  name="mot_de_passe"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Mot de passe (min. 8 caractères)"
                  value={formData.mot_de_passe}
                  onChange={handleChange}
                />
                {erreur && (
                  <p className="mt-2 text-sm text-red-600">{erreur}</p>
                )}
              </div>

              <div>
                <label htmlFor="conf_mot_de_passe" className="block text-sm font-medium text-gray-700">
                  Confirmer le mot de passe
                </label>
                <input
                  id="conf_mot_de_passe"
                  name="conf_mot_de_passe"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Confirmer le mot de passe"
                  value={formData.conf_mot_de_passe}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={
                loading ||
                erreur !== 'Ce mot de passe est obscure' ||
                formData.mot_de_passe !== formData.conf_mot_de_passe
              }
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Inscription en cours...' : 'S\'inscrire'}
            </button>
          </div>

        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous avez déjà un compte ?
            <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
              Se connecter
            </Link>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Besoin d'aide ?
            <Link href="https://wa.me/+22996974557" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
              Contacter un Administrateur
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-4">
            MFG@2025 Noge@2025
          </p>
        </div>
      </div>
    </div>
  );
}

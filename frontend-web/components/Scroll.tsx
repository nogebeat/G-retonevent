'use client';
import { useState, useEffect } from 'react';

// Hook pour les recommandations IA
const useAIRecommendations = (distributions) => {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateAdvice = async () => {
    if (!distributions.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const analysis = analyzeDistributions(distributions);
      
      const aiResponse = await fetchAIAdvice(analysis);
        setAdvice(aiResponse);
        

      
      setAdvice(aiResponse);
    } catch (err) {
      setError('Erreur lors de la génération des conseils IA');
      console.error(err);
      console.error('Erreur IA:', err.message, err.stack);
    } finally {
      setLoading(false);
    }
  };

  return { advice, generateAdvice, loading, error };
};

// Fonction d'analyse des distributions
const analyzeDistributions = (distributions) => {
  const totalTickets = distributions.reduce((sum, d) => sum + (d.tickets || 0), 0);
  const avgTickets = totalTickets / distributions.length;
  
  const topPerformer = distributions.reduce((max, d) => 
    (d.salesHistory || 0) > (max.salesHistory || 0) ? d : max, distributions[0]
  );
  
  const lowPerformers = distributions.filter(d => 
    (d.tickets || 0) < avgTickets * 0.6
  );

  return {
    totalTickets,
    avgTickets: Math.round(avgTickets),
    topPerformer: topPerformer?.name || 'N/A',
    lowPerformersCount: lowPerformers.length,
    distributionBalance: calculateBalance(distributions)
  };
};

const calculateBalance = (distributions) => {
  const tickets = distributions.map(d => d.tickets || 0);
  const max = Math.max(...tickets);
  const min = Math.min(...tickets);
  return max === 0 ? 0 : Math.round((1 - (max - min) / max) * 100);
};
const fetchAIAdvice = async (analysis) => {
  const prompt = `
Voici une analyse des ventes :
- Tickets totaux : ${analysis.totalTickets}
- Moyenne de tickets : ${analysis.avgTickets}
- Top revendeur : ${analysis.topPerformer}
- Nombre de revendeurs sous-performants : ${analysis.lowPerformersCount}
- Équilibre de distribution : ${analysis.distributionBalance}%

Donne-moi des conseils commerciaux basés sur cette analyse.
Réponds au format JSON :
{
  "mainRecommendation": "...",
  "insight": "...",
  "predictedGrowth": "...",
  "confidence": ...
}
`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "openai/gpt-3.5-turbo",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  // console.log('Response:', res);
// const data = await response.json();

  const data = await res.json();
  const content = data.choices[0].message.content;

  // Essaye d'extraire un objet JSON (parfois l'IA met du texte avant)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse IA invalide');

  return JSON.parse(jsonMatch[0]);
};


const ScrollingInfoCards = ({ 
  distributions = [], 
  autoScrollInterval = 5000,
  showControls = true,
  showIndicators = true,
  enableAI = true,
  customCards = null 
}) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const { advice, generateAdvice, loading, error } = useAIRecommendations(distributions);

  // Cartes par défaut
  const defaultInfoCards = [
    {
      id: 'distributions',
      bgColor: 'bg-purple-50',
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      titleColor: 'text-purple-800',
      textColor: 'text-purple-700',
      title: 'Distributions',
      content: `${distributions.length} distribution(s) •`,
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      padding: 'p-4'
    }
  ];

  // Cartes IA générées dynamiquement
  const generateAICards = () => {
    if (!enableAI || !advice) return [];

    return [
      {
        id: 'ai-recommendation',
        bgColor: 'bg-emerald-50 border border-emerald-200',
        iconBgColor: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        titleColor: 'text-emerald-800',
        textColor: 'text-emerald-700',
        title: '🤖 Conseil IA',
        content: advice.mainRecommendation,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
        padding: 'p-4'
      },
      {
        id: 'ai-insight',
        bgColor: 'bg-blue-50 border border-blue-200',
        iconBgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        titleColor: 'text-blue-800',
        textColor: 'text-blue-700',
        title: '💡 Insight IA',
        content: advice.insight,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
        padding: 'p-4'
      },
      {
        id: 'growth-prediction',
        bgColor: 'bg-orange-50 border border-orange-200',
        iconBgColor: 'bg-orange-100',
        iconColor: 'text-orange-600',
        titleColor: 'text-orange-800',
        textColor: 'text-orange-700',
        title: '📈 Prédiction',
        content: `Croissance estimée: ${advice.predictedGrowth} (Confiance: ${advice.confidence}%)`,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />,
        padding: 'p-4'
      }
    ];
  };

  // Carte de chargement IA
  const loadingCard = {
    id: 'ai-loading',
    bgColor: 'bg-gray-50 border border-gray-200',
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    titleColor: 'text-gray-800',
    textColor: 'text-gray-600',
    title: '🔄 Analyse IA en cours...',
    content: 'Génération de conseils personnalisés basés sur vos données',
    icon: <path className="animate-spin" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    padding: 'p-4'
  };

  // Combinaison de toutes les cartes
  const aiCards = loading ? [loadingCard] : generateAICards();
  const allCards = customCards || [...defaultInfoCards, ...aiCards];

  // Auto-génération des conseils IA
  useEffect(() => {
    if (enableAI && distributions.length > 0 && !advice && !loading) {
      generateAdvice();
    }
  }, [distributions, enableAI]);

  // Auto-défilement
  useEffect(() => {
    if (isPaused || allCards.length <= 1) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentCard((prev) => (prev + 1) % allCards.length);
        setIsVisible(true);
      }, 300);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [allCards.length, autoScrollInterval, isPaused]);

  const changeCard = (newIndex) => {
    if (newIndex === currentCard) return;
    setIsVisible(false);
    setTimeout(() => {
      setCurrentCard(newIndex);
      setIsVisible(true);
    }, 150);
  };

  if (allCards.length === 0) return null;

  const currentCardData = allCards[currentCard];

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carte principale */}
      <div className={`${currentCardData.bgColor} ${currentCardData.padding || 'p-4'} rounded-lg transition-all duration-300 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}>
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${currentCardData.iconBgColor} rounded-full p-3`}>
            <svg className={`h-6 w-6 ${currentCardData.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {currentCardData.icon}
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className={`text-lg font-medium ${currentCardData.titleColor}`}>
              {currentCardData.title}
            </h3>
            <p className={`text-sm ${currentCardData.textColor} mt-1`}>
              {currentCardData.content}
            </p>
          </div>
        </div>
      </div>

      {/* Bouton de régénération IA */}
      {enableAI && !loading && (
        <button
          onClick={generateAdvice}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
          title="Régénérer les conseils IA"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Indicateurs */}
      {showIndicators && allCards.length > 1 && (
        <div className="flex justify-center mt-3 space-x-2">
          {allCards.map((_, index) => (
            <button
              key={index}
              onClick={() => changeCard(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentCard 
                  ? 'bg-gray-600 scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* Contrôles */}
      {showControls && allCards.length > 1 && (
        <div className="flex justify-between items-center mt-2">
          <button
            onClick={() => changeCard((currentCard - 1 + allCards.length) % allCards.length)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <span className="text-xs text-gray-500">
            {currentCard + 1} / {allCards.length}
          </span>
          
          <button
            onClick={() => changeCard((currentCard + 1) % allCards.length)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Erreur IA */}
      {error && (
        <div className="mt-2 text-xs text-red-500 text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default ScrollingInfoCards;

import React, { useState } from 'react';
import { Comercio } from '../types';
import { AD_TIERS } from '../constants';
import * as api from '../apiService';

interface PromotePageProps {
  comercio: Comercio;
  onPaymentSuccess: () => void;
  onBack: () => void;
}

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const MercadoPagoIcon: React.FC = () => (
    <svg width="24" height="24" viewBox="0 0 41 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
        <path d="M38.9918 1.81567C37.0318 0.640675 34.5418 0.000675342 31.8418 0.000675342H9.8218C6.8818 0.000675342 4.2918 0.825675 2.1518 2.40068C0.841797 3.31568 0 4.54568 0 5.89568V6.12068C0 6.57068 0.360001 6.94568 0.811798 6.94568H40.1618C40.6218 6.94568 40.9718 6.57068 40.9718 6.12068V5.55068C40.9718 4.09568 40.3018 2.76067 38.9918 1.81567Z" fill="#00AEEF"/>
        <path d="M40.1618 9.99878H0.811798C0.361798 9.99878 0 10.3738 0 10.8238V21.1438C0 23.2738 1.71 24.9838 3.8418 24.9838H37.1318C39.2618 24.9838 40.9718 23.2738 40.9718 21.1438V10.8238C40.9718 10.3738 40.6118 9.99878 40.1618 9.99878Z" fill="#009EE3"/>
        <path d="M11.8151 17.5222C11.8151 17.5222 12.3301 15.3172 13.9201 14.8972C15.5101 14.4772 16.6951 15.6772 16.6951 15.6772C16.6951 15.6772 18.0601 13.6822 20.4901 13.6822C22.9201 13.6822 24.2851 15.6772 24.2851 15.6772C24.2851 15.6772 25.0201 14.4772 26.3101 14.8972C27.6001 15.3172 27.8551 17.5222 27.8551 17.5222C27.8551 17.5222 29.8501 11.2122 20.4901 11.2122C11.1301 11.2122 11.8151 17.5222 11.8151 17.5222Z" fill="white"/>
    </svg>
);

const LoadingSpinner: React.FC<{ size?: string }> = ({ size = 'h-5 w-5' }) => (
     <svg className={`animate-spin ${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PromotePage: React.FC<PromotePageProps> = ({ comercio, onPaymentSuccess, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalState, setModalState] = useState<'loading' | 'payment' | 'confirming' | 'success'>('loading');
  const [selectedTier, setSelectedTier] = useState<{ level: number; name: string; price: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitiatePayment = async (tier: (typeof AD_TIERS)[0]) => {
    setSelectedTier(tier);
    setError(null);
    setIsModalOpen(true);
    setModalState('loading');

    try {
      await api.createPaymentPreference(comercio.id, tier.level);
      // En una implementación real, aquí se usaría el ID de preferencia para redirigir
      // o abrir el checkout de Mercado Pago.
      // Para la simulación, simplemente pasamos al siguiente estado del modal.
      setModalState('payment');
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo iniciar el proceso de pago.";
      setError(message);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedTier) return;
    setModalState('confirming');
    setError(null);
    try {
      await api.confirmPayment(comercio.id, selectedTier.level);
      setModalState('success');
      // Esperamos un momento para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        setIsModalOpen(false);
        onPaymentSuccess();
      }, 2000);
    } catch (e) {
       const message = e instanceof Error ? e.message : "No se pudo confirmar el pago.";
       setError(message);
       setModalState('payment'); // Volver al estado de pago para reintentar
    }
  };
  
  const closeModal = () => {
    if (modalState !== 'confirming' && modalState !== 'success') {
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">Potenciá tu Comercio</h1>
          <p className="mt-2 text-lg text-gray-600">
            Elegí un plan para <strong className="text-indigo-600">{comercio.nombre}</strong> y llegá a más clientes.
          </p>
           <button onClick={onBack} className="mt-4 text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold">
              &larr; Volver al Panel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {AD_TIERS.filter(t => t.level > 1).map((tier) => {
              const isCurrentPlan = comercio.publicidad === tier.level;
              return (
                <div key={tier.level}
                  className={`bg-white rounded-2xl shadow-lg p-8 flex flex-col transition-all duration-300 hover:shadow-xl hover:scale-105 ${isCurrentPlan ? 'ring-4 ring-green-500' : ''}`}
                >
                  <h2 className="text-2xl font-bold text-gray-900">{tier.name}</h2>
                  <p className="text-4xl font-extrabold my-4">
                    ${tier.price.toLocaleString('es-AR')}
                    <span className="text-base font-medium text-gray-500">/pago único (30 días)</span>
                  </p>
                  
                  <ul className="space-y-3 mb-8 text-gray-600 flex-grow">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <CheckIcon />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <span className="w-full text-center bg-green-600 text-white font-bold py-3 px-4 rounded-lg cursor-not-allowed">
                      Tu Plan Actual
                    </span>
                  ) : (
                    <button
                        onClick={() => handleInitiatePayment(tier)}
                        className="w-full inline-flex items-center justify-center bg-[#009EE3] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#0081b8] transition-colors shadow-lg"
                    >
                      <MercadoPagoIcon />
                      Contratar Plan
                    </button>
                  )}
                </div>
              )
          })}
        </div>
      </div>
      
      {/* --- MODAL DE SIMULACIÓN DE PAGO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in-fast" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full transform animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 text-center">
              <MercadoPagoIcon />
              <h3 className="text-2xl font-bold text-gray-900 mt-2">Simulación de Pago</h3>
              <p className="text-gray-600 mt-2">Estás a punto de simular un pago para el plan <strong className="text-gray-800">{selectedTier?.name}</strong>.</p>
              <div className="my-6 p-4 bg-gray-100 rounded-lg">
                  <p className="text-lg">Comercio: <span className="font-semibold">{comercio.nombre}</span></p>
                  <p className="text-2xl font-bold text-indigo-600 mt-2">${selectedTier?.price.toLocaleString('es-AR')}</p>
              </div>

              {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</p>}

              {modalState === 'loading' && <LoadingSpinner size="h-10 w-10" />}
              
              {modalState === 'payment' && (
                <button 
                  onClick={handleConfirmPayment}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Simular Pago Exitoso
                </button>
              )}

              {modalState === 'confirming' && (
                <div className="w-full flex items-center justify-center bg-blue-400 text-white font-bold py-3 px-6 rounded-lg cursor-wait">
                  <LoadingSpinner size="h-5 w-5" />
                  <span className="ml-3">Confirmando pago...</span>
                </div>
              )}
              
              {modalState === 'success' && (
                <div className="text-center text-green-700">
                    <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h4 className="text-xl font-bold mt-2">¡Pago Exitoso!</h4>
                    <p>Actualizando tu plan...</p>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-6">Esto es una simulación. No se realizará ningún cobro real.</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
        @keyframes fade-in-fast {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
        @keyframes scale-in {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
      `}</style>
    </>
  );
};

export default PromotePage;
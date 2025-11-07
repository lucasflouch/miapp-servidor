

import React, { useState, useEffect } from 'react';
import { Usuario, Comercio, Banner, Pago } from '../types';

interface AccountPageProps {
  currentUser: Usuario;
  comercios: Comercio[];
  banners: Banner[];
  pagos: Pago[];
  onNavigateToDashboard: () => void;
  onUpdateUser: (userData: Pick<Usuario, 'nombre' | 'telefono'>) => Promise<void>;
}

const AccountPage: React.FC<AccountPageProps> = ({ currentUser, comercios, banners, pagos, onNavigateToDashboard, onUpdateUser }) => {

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: currentUser.nombre,
    telefono: currentUser.telefono || '',
  });
  const [errors, setErrors] = useState<{ telefono?: string }>({});

  useEffect(() => {
    // Resetear el form si el usuario cambia (por si acaso)
    setFormData({
      nombre: currentUser.nombre,
      telefono: currentUser.telefono || '',
    });
  }, [currentUser]);

  const validate = () => {
    const newErrors: { telefono?: string } = {};
    if (formData.telefono && !/^\d{8,15}$/.test(formData.telefono.replace(/\D/g, ''))) {
      newErrors.telefono = 'Debe ser un número de teléfono válido.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Si estaba editando y cancela, resetea el form.
      setFormData({
        nombre: currentUser.nombre,
        telefono: currentUser.telefono || '',
      });
       setErrors({});
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    await onUpdateUser(formData);
    setIsEditing(false);
  };

  const activeBanners = banners.filter(b => new Date(b.venceEl) > new Date());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Mi Cuenta</h1>
        <button
            onClick={onNavigateToDashboard}
            className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold"
        >
            &larr; Volver al Panel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Columna Izquierda: Datos del Usuario y Comercios */}
        <div className="md:col-span-2 space-y-8">
          {/* Datos Personales */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Datos Personales</h2>
              <button onClick={handleEditToggle} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                {isEditing ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="nombre" className="font-semibold text-gray-600 block mb-1">Nombre:</label>
                  <input 
                    type="text" 
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor="telefono" className="font-semibold text-gray-600 block mb-1">Teléfono:</label>
                  <input 
                    type="tel" 
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => {
                      setFormData({...formData, telefono: e.target.value});
                      validate();
                    }}
                    className={`w-full p-2 border ${errors.telefono ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm`}
                  />
                  {errors.telefono && <p className="text-sm text-red-600 mt-1">{errors.telefono}</p>}
                </div>
                <button 
                  onClick={handleSave}
                  className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Guardar Cambios
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-600">Nombre:</span>
                  <p className="text-gray-900">{currentUser.nombre}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Email:</span>
                  <p className="text-gray-900">{currentUser.email} (No se puede modificar)</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Teléfono:</span>
                  <p className="text-gray-900">{currentUser.telefono || 'No especificado'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Mis Comercios */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">Mis Comercios ({comercios.length})</h2>
            {comercios.length > 0 ? (
              <ul className="space-y-3">
                {comercios.map(c => (
                  <li key={c.id} className="p-3 bg-gray-50 rounded-lg flex items-center gap-4">
                     <img src={c.imagenUrl} alt={c.nombre} className="w-12 h-12 rounded-md object-cover" />
                     <div>
                        <p className="font-semibold text-gray-900">{c.nombre}</p>
                        <p className="text-sm text-gray-500">{c.ciudadNombre}, {c.provinciaNombre}</p>
                     </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Aún no has registrado ningún comercio.</p>
            )}
          </div>
        </div>

        {/* Columna Derecha: Estado de Cuenta */}
        <div className="md:col-span-1 space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">Estado de Cuenta</h2>
            
            {/* Anuncios Activos */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Anuncios Activos ({activeBanners.length})</h3>
              {activeBanners.length > 0 ? (
                 <ul className="space-y-2 text-sm">
                    {activeBanners.map(banner => {
                        const comercio = comercios.find(c => c.id === banner.comercioId);
                        return (
                            <li key={banner.id} className="text-gray-800">
                                Banner para <strong>{comercio?.nombre || 'N/A'}</strong>
                                <span className="block text-xs text-gray-500">Vence el: {formatDate(banner.venceEl)}</span>
                            </li>
                        );
                    })}
                 </ul>
              ) : (
                <p className="text-sm text-gray-500">No tenés banners activos.</p>
              )}
            </div>

             {/* Historial de Pagos */}
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Historial de Pagos ({pagos.length})</h3>
              {pagos.length > 0 ? (
                 <ul className="space-y-2 text-sm">
                    {pagos.map(pago => {
                         const comercio = comercios.find(c => c.id === pago.comercioId);
                         return (
                            <li key={pago.id} className="text-gray-800">
                                <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">${pago.monto.toLocaleString('es-AR')}</span> para <strong>{comercio?.nombre || 'N/A'}</strong>
                                <span className="block text-xs text-gray-500">Fecha: {formatDate(pago.fecha)}</span>
                            </li>
                         );
                    })}
                 </ul>
              ) : (
                <p className="text-sm text-gray-500">No se encontraron pagos.</p>
              )}
            </div>

          </div>
        </div>
      </div>
      <style>{`
            @keyframes fade-in-up {
                from { 
                    opacity: 0; 
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .animate-fade-in-up { 
                animation: fade-in-up 0.5s ease-out forwards; 
            }
        `}</style>
    </div>
  );
};

export default AccountPage;
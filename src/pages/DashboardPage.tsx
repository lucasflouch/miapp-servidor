

import React, { useState, FormEvent, useMemo, useEffect, ChangeEvent, DragEvent, useRef } from 'react';
import { Comercio, Provincia, Ciudad, Rubro, SubRubro, AnalyticsData, Usuario } from '../types';
import { AD_TIERS } from '../constants';
import * as api from '../apiService';


// --- Subcomponente para mostrar las Métricas ---
interface AnalyticsDisplayProps {
  analytics: AnalyticsData | null;
  loading: boolean;
}

const AnalyticsDisplay: React.FC<AnalyticsDisplayProps> = ({ analytics, loading }) => {
    if (loading) {
        return <div className="text-sm text-center text-gray-500 p-4">Cargando métricas...</div>;
    }

    if (!analytics) {
        return <div className="text-sm text-center text-red-500 p-4">No se pudieron cargar las métricas.</div>;
    }

    return (
        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
            <div>
                <p className="text-xs text-gray-500">Vistas (30d)</p>
                <p className="text-xl font-bold text-indigo-600">{analytics.totalViews}</p>
            </div>
             <div>
                <p className="text-xs text-gray-500">Clics WhatsApp</p>
                <p className="text-xl font-bold text-green-600">{analytics.totalWhatsappClicks}</p>
            </div>
             <div>
                <p className="text-xs text-gray-500">Clics Web</p>
                <p className="text-xl font-bold text-blue-600">{analytics.totalWebsiteClicks}</p>
            </div>
        </div>
    );
};


// --- Subcomponente para el Formulario de Edición ---
interface EditFormProps {
  comercio: Comercio;
  provincias: Provincia[];
  rubros: Rubro[];
  subRubros: SubRubro[];
  onUpdate: (comercio: Comercio) => Promise<boolean>;
  onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({ comercio, provincias, rubros, subRubros, onUpdate, onCancel }) => {
  const [formData, setFormData] = useState<Comercio>(comercio);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(comercio.imagenUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryDragging, setIsGalleryDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Comercio, string>>>({});
  
  const [availableCiudades, setAvailableCiudades] = useState<Ciudad[]>([]);
  const [loadingCiudades, setLoadingCiudades] = useState(false);
  const [availableSubRubros, setAvailableSubRubros] = useState<SubRubro[]>([]);

  const MAX_GALLERY_IMAGES = 5;

  // Lógica de validación
  const validate = (data: Comercio): Partial<Record<keyof Comercio, string>> => {
    const newErrors: Partial<Record<keyof Comercio, string>> = {};
    if (!data.nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
    if (!data.rubroId) newErrors.rubroId = "Debe seleccionar un rubro.";
    if (!data.subRubroId) newErrors.subRubroId = "Debe seleccionar un sub-rubro.";
    if (!data.provinciaId) newErrors.provinciaId = "Debe seleccionar una provincia.";
    if (!data.ciudadId) newErrors.ciudadId = "Debe seleccionar una ciudad.";
    if (!data.whatsapp.trim()) newErrors.whatsapp = "El WhatsApp es obligatorio.";
    else if (!/^\+?\d{10,15}$/.test(data.whatsapp.replace(/\D/g, ''))) newErrors.whatsapp = "Formato de teléfono inválido (ej: 5491112345678).";
    const urlRegex = /^(https?):\/\/[^\s$.?#].[^\s]*$/i;
    if (data.websiteUrl && !urlRegex.test(data.websiteUrl)) newErrors.websiteUrl = "URL inválida. Debe empezar con http:// o https://";
    if (data.googleMapsUrl && !urlRegex.test(data.googleMapsUrl)) newErrors.googleMapsUrl = "URL inválida. Debe empezar con http:// o https://";
    return newErrors;
  };

  useEffect(() => {
    setErrors(validate(formData));
  }, [formData]);

  const isFormValid = useMemo(() => Object.keys(validate(formData)).length === 0, [formData]);

  // Efecto para cargar ciudades y sub-rubros iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      if (formData.provinciaId) {
        setLoadingCiudades(true);
        try {
          const res = await fetch(`https://apis.datos.gob.ar/georef/api/v2.0/municipios?provincia=${formData.provinciaId}&campos=id,nombre&max=5000&orden=nombre`);
          const data = await res.json();
          setAvailableCiudades(data.municipios.map((loc: any) => ({ id: loc.id, nombre: loc.nombre, provinciaId: formData.provinciaId })));
        } catch (err) { console.error(err); } 
        finally { setLoadingCiudades(false); }
      }
      if (formData.rubroId) {
        setAvailableSubRubros(subRubros.filter(sr => sr.rubroId === formData.rubroId));
      }
    };
    fetchInitialData();
  }, [formData.provinciaId, formData.rubroId, subRubros]);


  const processFile = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setImagePreview(result);
            setFormData(prev => ({ ...prev, imagenUrl: result }));
        };
        reader.readAsDataURL(file);
    }
  };
  
  const handleGalleryFiles = (files: FileList | null) => {
      if (!files) return;
      if ((formData.galeriaImagenes?.length || 0) + files.length > MAX_GALLERY_IMAGES) {
          alert(`Sólo podés tener hasta ${MAX_GALLERY_IMAGES} imágenes en la galería.`);
          return;
      }
      Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const result = reader.result as string;
                  setFormData(prev => ({
                      ...prev,
                      galeriaImagenes: [...(prev.galeriaImagenes || []), result]
                  }));
              };
              reader.readAsDataURL(file);
          }
      });
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
      setFormData(prev => ({
          ...prev,
          galeriaImagenes: (prev.galeriaImagenes || []).filter((_, index) => index !== indexToRemove)
      }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    
    setFormData(prev => ({ 
        ...prev, 
        [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value 
    }));
  };
  
  const handleRubroChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRubroId = e.target.value;
    setFormData(prev => ({...prev, rubroId: newRubroId, subRubroId: ''}));
    if (newRubroId) {
        setAvailableSubRubros(subRubros.filter(sr => sr.rubroId === newRubroId));
    } else {
        setAvailableSubRubros([]);
    }
  };


  const handleProvinciaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvinciaId = e.target.value;
    const newProvincia = provincias.find(p => p.id === newProvinciaId);
    
    setFormData(prev => ({ 
      ...prev, 
      provinciaId: newProvinciaId, 
      provinciaNombre: newProvincia?.nombre || '',
      ciudadId: '',
      ciudadNombre: '',
      barrio: '',
    }));
    
    setAvailableCiudades([]);

    if (newProvinciaId) {
      setLoadingCiudades(true);
      try {
        const response = await fetch(`https://apis.datos.gob.ar/georef/api/v2.0/municipios?provincia=${newProvinciaId}&campos=id,nombre&max=5000&orden=nombre`);
        const data = await response.json();
        setAvailableCiudades(data.municipios.map((loc: any) => ({ id: loc.id, nombre: loc.nombre, provinciaId: newProvinciaId })));
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoadingCiudades(false);
      }
    }
  };

  const handleCiudadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCiudadId = e.target.value;
      const newCiudad = availableCiudades.find(c => c.id === newCiudadId);
      setFormData(prev => ({
          ...prev,
          ciudadId: newCiudadId,
          ciudadNombre: newCiudad?.nombre || ''
      }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const currentErrors = validate(formData);
    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) {
        alert("Por favor, corrija los errores del formulario.");
        return;
    }
    setIsSaving(true);
    // Si el plan es gratuito, la renovación automática no tiene sentido.
    const finalFormData = {
        ...formData,
        renovacionAutomatica: formData.publicidad > 1 ? formData.renovacionAutomatica : false,
    };
    const success = await onUpdate(finalFormData);
    setIsSaving(false);
    if (success) {
        onCancel(); // Vuelve a la lista
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in-up">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Editando: {comercio.nombre}</h2>
            <button onClick={onCancel} className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold">
                &larr; Volver a la lista
            </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre del Comercio</label>
                <input type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleChange} className={`mt-1 block w-full border ${errors.nombre ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3`} required />
                {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Imagen Principal</label>
                <div 
                  className={`mt-1 p-4 border-2 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'} border-dashed rounded-md`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0] || null); }}
                >
                  <div className="flex items-center gap-4">
                    <img src={imagePreview} alt="Vista previa" className="w-24 h-24 rounded-lg object-cover" />
                    <div className="flex-grow text-center">
                      <p className="text-gray-500 text-sm">Arrastrá una imagen o</p>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500">seleccioná un archivo</button>
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => processFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                </div>
            </div>
             {/* Galería de Imágenes */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Galería de Imágenes (Máx {MAX_GALLERY_IMAGES})</label>
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsGalleryDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsGalleryDragging(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsGalleryDragging(false); handleGalleryFiles(e.dataTransfer.files); }}
                    onClick={() => galleryFileInputRef.current?.click()}
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isGalleryDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'} border-dashed rounded-md cursor-pointer transition-colors`}
                >
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <p className="text-sm text-gray-600">Añadir más imágenes a la galería</p>
                    </div>
                     <input 
                        ref={galleryFileInputRef}
                        type="file" 
                        multiple
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => handleGalleryFiles(e.target.files)}
                        className="hidden"
                    />
                </div>
                {(formData.galeriaImagenes?.length || 0) > 0 && (
                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-4">
                        {formData.galeriaImagenes?.map((imgSrc, index) => (
                            <div key={index} className="relative group">
                                <img src={imgSrc} className="w-full h-24 object-cover rounded-md shadow" alt={`Vista previa de galería ${index + 1}`} />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveGalleryImage(index)}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label="Eliminar imagen"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rubroId" className="block text-sm font-medium text-gray-700">Rubro</label>
                  <select name="rubroId" id="rubroId" value={formData.rubroId} onChange={handleRubroChange} className={`mt-1 block w-full border ${errors.rubroId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3`} required>
                      <option value="">Seleccione un rubro...</option>
                      {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                  {errors.rubroId && <p className="mt-1 text-sm text-red-600">{errors.rubroId}</p>}
                </div>
                <div>
                  <label htmlFor="subRubroId" className="block text-sm font-medium text-gray-700">Sub-Rubro</label>
                  <select name="subRubroId" id="subRubroId" value={formData.subRubroId} onChange={handleChange} disabled={!formData.rubroId} className={`mt-1 block w-full border ${errors.subRubroId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 disabled:bg-gray-100`} required>
                    <option value="">Seleccione...</option>
                    {availableSubRubros.map(sr => <option key={sr.id} value={sr.id}>{sr.nombre}</option>)}
                  </select>
                  {errors.subRubroId && <p className="mt-1 text-sm text-red-600">{errors.subRubroId}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="provinciaId" className="block text-sm font-medium text-gray-700">Provincia</label>
                  <select id="provinciaId" name="provinciaId" value={formData.provinciaId} onChange={handleProvinciaChange} className={`mt-1 block w-full border ${errors.provinciaId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3`} required>
                    <option value="">Seleccione...</option>
                    {provincias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {errors.provinciaId && <p className="mt-1 text-sm text-red-600">{errors.provinciaId}</p>}
                </div>
                <div>
                  <label htmlFor="ciudadId" className="block text-sm font-medium text-gray-700">Ciudad</label>
                  <select name="ciudadId" id="ciudadId" value={formData.ciudadId} onChange={handleCiudadChange} disabled={loadingCiudades} className={`mt-1 block w-full border ${errors.ciudadId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 disabled:bg-gray-100`} required>
                    <option value="">{loadingCiudades ? 'Cargando...' : 'Seleccione...'}</option>
                    {availableCiudades.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  {errors.ciudadId && <p className="mt-1 text-sm text-red-600">{errors.ciudadId}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="barrio" className="block text-sm font-medium text-gray-700">Barrio (Opcional)</label>
                    <input type="text" name="barrio" id="barrio" value={formData.barrio || ''} onChange={handleChange} placeholder="Ej: Palermo" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
                <div>
                    <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección (Opcional)</label>
                    <input type="text" name="direccion" id="direccion" value={formData.direccion || ''} onChange={handleChange} placeholder="Ej: Av. Siempreviva 742" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción (Opcional)</label>
              <textarea name="description" id="description" rows={3} value={formData.description || ''} onChange={handleChange} placeholder="Contá brevemente sobre tu comercio..." className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    <input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="Ej: 5491112345678" className={`mt-1 block w-full border ${errors.whatsapp ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3`} required />
                    {errors.whatsapp && <p className="mt-1 text-sm text-red-600">{errors.whatsapp}</p>}
                </div>
                <div>
                    <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">Página Web (Opcional)</label>
                    <input type="url" name="websiteUrl" id="websiteUrl" value={formData.websiteUrl || ''} onChange={handleChange} placeholder="https://ejemplo.com" className={`mt-1 block w-full border ${errors.websiteUrl ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3`} />
                    {errors.websiteUrl && <p className="mt-1 text-sm text-red-600">{errors.websiteUrl}</p>}
                </div>
            </div>
             <div>
                <label htmlFor="googleMapsUrl" className="block text-sm font-medium text-gray-700">Link de Google Maps (Opcional)</label>
                <input type="url" name="googleMapsUrl" id="googleMapsUrl" value={formData.googleMapsUrl || ''} onChange={handleChange} placeholder="https://maps.app.goo.gl/..." className={`mt-1 block w-full border ${errors.googleMapsUrl ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3`} />
                {errors.googleMapsUrl && <p className="mt-1 text-sm text-red-600">{errors.googleMapsUrl}</p>}
            </div>

            <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700">Estado de la Publicidad</label>
                <div className="mt-2 flex items-center">
                    <input
                        id="renovacionAutomatica"
                        name="renovacionAutomatica"
                        type="checkbox"
                        checked={formData.renovacionAutomatica}
                        onChange={handleChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        disabled={formData.publicidad === 1}
                    />
                    <label htmlFor="renovacionAutomatica" className="ml-2 block text-sm text-gray-900">
                        Renovación automática activada
                    </label>
                </div>
                 {formData.publicidad > 1 && formData.vencimientoPublicidad && (
                    <p className="mt-2 text-sm text-gray-500">
                        El plan actual vence el {new Date(formData.vencimientoPublicidad).toLocaleString('es-AR')}.
                    </p>
                )}
            </div>

              <div className="pt-4 flex justify-end gap-4">
                <button type="button" onClick={onCancel} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300" disabled={isSaving || !isFormValid}>
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
        </form>
    </div>
  );
};


// --- Componente Principal del Dashboard ---
interface DashboardPageProps {
  currentUser: Usuario;
  comercios: Comercio[];
  provincias: Provincia[];
  rubros: Rubro[];
  subRubros: SubRubro[];
  onUpdate: (comercio: Comercio) => Promise<boolean>;
  onDelete: (comercioId: string) => Promise<boolean>;
  onCreateNew: () => void;
  onNavigateToAccount: () => void;
  onPreviewComercio: (comercio: Comercio) => void;
  onNavigateToPromote: (comercio: Comercio) => void;
  onNavigateToChat: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, comercios, provincias, rubros, subRubros, onUpdate, onDelete, onCreateNew, onNavigateToAccount, onPreviewComercio, onNavigateToPromote, onNavigateToChat }) => {
  const [editingComercio, setEditingComercio] = useState<Comercio | null>(null);
  const [comercioToDelete, setComercioToDelete] = useState<Comercio | null>(null);
  const [analyticsData, setAnalyticsData] = useState<Record<string, AnalyticsData | null>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState<Record<string, boolean>>({});

  useEffect(() => {
    comercios.forEach(comercio => {
        setLoadingAnalytics(prev => ({ ...prev, [comercio.id]: true }));
        api.getAnalyticsForComercio(comercio.id)
            .then(data => {
                setAnalyticsData(prev => ({ ...prev, [comercio.id]: data }));
            })
            .catch(error => {
                console.error(`Error fetching analytics for ${comercio.id}:`, error);
                setAnalyticsData(prev => ({ ...prev, [comercio.id]: null }));
            })
            .finally(() => {
                setLoadingAnalytics(prev => ({ ...prev, [comercio.id]: false }));
            });
    });
  }, [comercios]);

  const handleConfirmDelete = async () => {
    if (comercioToDelete) {
      await onDelete(comercioToDelete.id);
      setComercioToDelete(null);
    }
  };

  const getTierName = (level: number) => {
    const tier = AD_TIERS.find(t => t.level === level);
    return tier ? tier.name : 'Desconocido';
  }

  const formatDateWithTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (editingComercio) {
    return (
      <EditForm 
        comercio={editingComercio}
        provincias={provincias}
        rubros={rubros}
        subRubros={subRubros}
        onUpdate={onUpdate}
        onCancel={() => setEditingComercio(null)}
      />
    );
  }

  const unreadCount = currentUser.unreadMessageCount || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
        <h1 className="text-4xl font-extrabold text-gray-900">Tu Panel de Comercios</h1>
        <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={onNavigateToAccount} className="bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors shadow-md">
                Gestionar mi Cuenta
            </button>
            <button onClick={onNavigateToChat} className="relative bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                Bandeja de Entrada
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-6 w-6">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex items-center justify-center rounded-full h-6 w-6 bg-red-500 text-white text-xs font-bold">{unreadCount}</span>
                  </span>
                )}
            </button>
            <button onClick={onCreateNew} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md">
                + Registrar Nuevo Comercio
            </button>
        </div>
      </div>

      {comercios.length > 0 ? (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-gray-600 mb-4 text-center md:text-left">Gestioná tus comercios, editá su información o mejorá su visibilidad.</p>
          <div className="space-y-4">
            {comercios.map((comercio, index) => (
              <div 
                key={comercio.id} 
                className="p-4 border rounded-lg hover:shadow-md transition-shadow hover:bg-gray-50 animate-fade-in-up" 
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                    <div 
                      className="flex items-center gap-4 mb-4 md:mb-0 flex-grow cursor-pointer"
                      onClick={() => onPreviewComercio(comercio)}
                    >
                      <img src={comercio.imagenUrl} alt={comercio.nombre} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{comercio.nombre}</h3>
                        <p className="text-sm text-gray-600 mb-1">{[comercio.barrio, comercio.ciudadNombre].filter(Boolean).join(', ')}</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${comercio.publicidad > 1 ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                          Plan: {getTierName(comercio.publicidad)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                      <button onClick={() => onNavigateToPromote(comercio)} className="flex-1 bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600">
                        Promocionar
                      </button>
                      <button onClick={() => setEditingComercio(comercio)} className="flex-1 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700">
                        Modificar
                      </button>
                      <button onClick={() => setComercioToDelete(comercio)} className="flex-1 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600">
                        Eliminar
                      </button>
                    </div>
                </div>
                {comercio.publicidad > 1 && (
                    <div className="mt-3 pt-3 border-t border-dashed text-sm text-gray-700 space-y-1">
                        <p>
                            Tu anuncio vence el: <strong className="font-semibold text-gray-900">{formatDateWithTime(comercio.vencimientoPublicidad)}</strong>
                        </p>
                         <p>
                            Renovación automática: <span className={`font-semibold ${comercio.renovacionAutomatica ? 'text-green-700' : 'text-red-700'}`}>{comercio.renovacionAutomatica ? 'Activada' : 'Desactivada'}</span>
                        </p>
                    </div>
                )}
                 <AnalyticsDisplay analytics={analyticsData[comercio.id]} loading={loadingAnalytics[comercio.id]} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center bg-white p-12 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800">¡Bienvenido a GuíaComercial!</h2>
          <p className="text-gray-600 mt-2 mb-6">Aún no tenés ningún comercio registrado. ¡Empezá ahora!</p>
          <button onClick={onCreateNew} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors text-lg">
            Crear mi primer comercio
          </button>
        </div>
      )}

      {comercioToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 animate-fade-in-fast" aria-modal="true" role="dialog" aria-labelledby="delete-dialog-title">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center transform animate-scale-in">
                <h3 id="delete-dialog-title" className="text-2xl font-bold text-gray-900">Confirmar Eliminación</h3>
                <p className="text-gray-600 my-4">
                    ¿Estás seguro de que querés eliminar permanentemente el comercio "<strong>{comercioToDelete.nombre}</strong>"?
                    <br />
                    <span className="font-semibold text-red-600">Esta acción no se puede deshacer.</span>
                </p>
                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={() => setComercioToDelete(null)}
                        className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmDelete}
                        className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                        Sí, Eliminar
                    </button>
                </div>
            </div>
        </div>
      )}
      
      <style>{`
        @keyframes fade-in-fast {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scale-in {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default DashboardPage;
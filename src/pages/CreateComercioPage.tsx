import React, { useState, FormEvent, useMemo, ChangeEvent, DragEvent, useRef, useEffect } from 'react';
import { Provincia, Ciudad, Rubro, SubRubro, Comercio, Opinion } from '../types';
import { AD_TIERS } from '../constants';


interface CreateComercioPageProps {
  provincias: Provincia[];
  ciudades: Ciudad[];
  rubros: Rubro[];
  subRubros: SubRubro[];
  onCreate: (comercioData: Omit<Comercio, 'id' | 'usuarioId'>) => void;
}

// Omitimos los campos que se generan automáticamente o en el servidor
type FormData = Omit<Comercio, 'id' | 'usuarioId' | 'provinciaNombre' | 'ciudadNombre' | 'vencimientoPublicidad'>;
type FormErrors = Partial<Record<keyof FormData, string>>;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_GALLERY_IMAGES = 5;

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);


const CreateComercioPage: React.FC<CreateComercioPageProps> = ({ provincias, ciudades, rubros, subRubros, onCreate }) => {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    imagenUrl: '',
    rubroId: '',
    subRubroId: '',
    provinciaId: '06', // Valor por defecto: Buenos Aires
    ciudadId: '060364', // Valor por defecto: General Rodríguez
    barrio: '',
    whatsapp: '',
    direccion: '',
    googleMapsUrl: '',
    websiteUrl: '',
    description: '',
    galeriaImagenes: [],
    publicidad: 1, // El plan gratuito es el default
    renovacionAutomatica: false,
    opiniones: [],
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryDragging, setIsGalleryDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const validate = (data: FormData): FormErrors => {
    const newErrors: FormErrors = {};
    if (!data.nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
    if (!data.imagenUrl) newErrors.imagenUrl = "La imagen principal es obligatoria.";
    if (!data.rubroId) newErrors.rubroId = "Debe seleccionar un rubro.";
    if (!data.subRubroId) newErrors.subRubroId = "Debe seleccionar un sub-rubro.";
    if (!data.provinciaId) newErrors.provinciaId = "Debe seleccionar una provincia.";
    if (!data.ciudadId) newErrors.ciudadId = "Debe seleccionar una ciudad.";
    
    if (!data.whatsapp.trim()) {
        newErrors.whatsapp = "El WhatsApp es obligatorio.";
    } else if (!/^\+?\d{10,15}$/.test(data.whatsapp)) {
        newErrors.whatsapp = "Formato inválido (ej: 5491112345678).";
    }

    const urlRegex = /^(https?):\/\/[^\s$.?#].[^\s]*$/i;
    if (data.websiteUrl && !urlRegex.test(data.websiteUrl)) {
        newErrors.websiteUrl = "URL inválida. Debe empezar con http:// o https://";
    }
    if (data.googleMapsUrl && !urlRegex.test(data.googleMapsUrl)) {
        newErrors.googleMapsUrl = "URL inválida. Debe empezar con http:// o https://";
    }

    return newErrors;
  };

  const isFormValid = useMemo(() => Object.keys(errors).length === 0, [errors]);
  
  useEffect(() => {
    setErrors(validate(formData));
  }, [formData]);

  const availableCiudades = useMemo(() => {
    return ciudades.filter(c => c.provinciaId === formData.provinciaId).sort((a,b) => a.nombre.localeCompare(b.nombre));
  }, [formData.provinciaId, ciudades]);

  const availableSubRubros = useMemo(() => {
    return subRubros.filter(sr => sr.rubroId === formData.rubroId);
  }, [formData.rubroId, subRubros]);

  
  const processFile = (file: File | null) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        alert(`El archivo "${file.name}" es demasiado grande (máx 10MB).`);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Limpiar input
        return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert(`El formato del archivo "${file.name}" no es permitido. Subí JPG, PNG o WebP.`);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Limpiar input
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, imagenUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0] || null);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file || null);
  };

  const handleGalleryFiles = (files: FileList | null) => {
      if (!files) return;

      const currentImageCount = formData.galeriaImagenes?.length || 0;
      if (currentImageCount + files.length > MAX_GALLERY_IMAGES) {
          alert(`Sólo podés tener hasta ${MAX_GALLERY_IMAGES} imágenes en total en la galería.`);
          if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
          return;
      }

      const validFiles: File[] = [];
      const errorMessages: string[] = [];

      Array.from(files).forEach(file => {
          if (file.size > MAX_FILE_SIZE) {
              errorMessages.push(`- "${file.name}" es demasiado grande (máx 10MB).`);
          } else if (!ALLOWED_FILE_TYPES.includes(file.type)) {
              errorMessages.push(`- "${file.name}" tiene un formato no permitido.`);
          } else {
              validFiles.push(file);
          }
      });
      
      if (errorMessages.length > 0) {
          alert(`Algunos archivos no se pudieron subir:\n${errorMessages.join('\n')}`);
      }

      validFiles.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setFormData(prev => ({
                  ...prev,
                  galeriaImagenes: [...(prev.galeriaImagenes || []), result]
              }));
          };
          reader.readAsDataURL(file);
      });

      if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
      setFormData(prev => ({
          ...prev,
          galeriaImagenes: (prev.galeriaImagenes || []).filter((_, index) => index !== indexToRemove)
      }));
  };
  
  const handleGalleryDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsGalleryDragging(false);
    handleGalleryFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRubroChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRubroId = e.target.value;
    setFormData(prev => ({...prev, rubroId: newRubroId, subRubroId: ''}));
  };

  const handleProvinciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvinciaId = e.target.value;
    setFormData(prev => ({ ...prev, provinciaId: newProvinciaId, ciudadId: '', barrio: '' }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const currentErrors = validate(formData);
    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) {
        alert("Por favor, corrija los errores marcados en el formulario antes de continuar.");
        return;
    }
    
    const selectedProvincia = provincias.find(p => p.id === formData.provinciaId);
    const selectedCiudad = availableCiudades.find(c => c.id === formData.ciudadId);

    if (!selectedProvincia || !selectedCiudad) {
        alert('La provincia o ciudad seleccionada no es válida. Por favor, intente de nuevo.');
        return;
    }
    
    // El servidor se encargará de `vencimientoPublicidad`
    const finalData: Omit<Comercio, 'id' | 'usuarioId'> = {
        ...formData,
        provinciaNombre: selectedProvincia.nombre,
        ciudadNombre: selectedCiudad.nombre,
    };

    onCreate(finalData);
  };
  
  // Lógica mejorada para el selector de sub-rubros
  const isSubRubroDisabled = !formData.rubroId || availableSubRubros.length === 0;
  const subRubroDefaultOptionText = useMemo(() => {
      if (!formData.rubroId) {
        return 'Primero seleccione un rubro';
      }
      if (availableSubRubros.length === 0) {
        return 'No hay sub-rubros disponibles';
      }
      return 'Seleccione un sub-rubro...';
  }, [formData.rubroId, availableSubRubros.length]);


  return (
    <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900">Registrá tu Comercio</h1>
            <p className="mt-2 text-lg text-gray-600">
            Completá los datos para que miles de clientes puedan encontrarte.
            </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg space-y-8">
            
            {/* --- SECCIÓN 1: DATOS BÁSICOS --- */}
            <fieldset className="space-y-6">
                <legend className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">1. Datos del Comercio</legend>
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre del Comercio</label>
                  <input type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleChange} autoComplete="organization" className={`mt-1 block w-full border ${errors.nombre ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500`} required />
                  {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="rubroId" className="block text-sm font-medium text-gray-700">Rubro</label>
                      <select name="rubroId" id="rubroId" value={formData.rubroId} onChange={handleRubroChange} className={`mt-1 block w-full border ${errors.rubroId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500`} required>
                        <option value="">Seleccione un rubro...</option>
                        {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                       {errors.rubroId && <p className="mt-1 text-sm text-red-600">{errors.rubroId}</p>}
                    </div>
                     <div>
                      <label htmlFor="subRubroId" className="block text-sm font-medium text-gray-700">Sub-Rubro</label>
                      <select 
                        name="subRubroId" 
                        id="subRubroId" 
                        value={formData.subRubroId} 
                        onChange={handleChange} 
                        disabled={isSubRubroDisabled} 
                        className={`mt-1 block w-full border ${errors.subRubroId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100`} 
                        required
                      >
                        <option value="">{subRubroDefaultOptionText}</option>
                        {availableSubRubros.map(sr => <option key={sr.id} value={sr.id}>{sr.nombre}</option>)}
                      </select>
                       {errors.subRubroId && <p className="mt-1 text-sm text-red-600">{errors.subRubroId}</p>}
                    </div>
                </div>
            </fieldset>

            {/* --- SECCIÓN 2: UBICACIÓN --- */}
            <fieldset className="space-y-6">
                 <legend className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">2. Ubicación</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="provinciaId" className="block text-sm font-medium text-gray-700">Provincia</label>
                    <select id="provinciaId" name="provinciaId" value={formData.provinciaId} onChange={handleProvinciaChange} className={`mt-1 block w-full border ${errors.provinciaId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500`} required>
                      <option value="">Seleccione...</option>
                      {provincias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                     {errors.provinciaId && <p className="mt-1 text-sm text-red-600">{errors.provinciaId}</p>}
                  </div>
                  <div>
                    <label htmlFor="ciudadId" className="block text-sm font-medium text-gray-700">Ciudad</label>
                    <select name="ciudadId" id="ciudadId" value={formData.ciudadId} onChange={handleChange} disabled={!formData.provinciaId} className={`mt-1 block w-full border ${errors.ciudadId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100`} required>
                      <option value="">Seleccione...</option>
                      {availableCiudades.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                     {errors.ciudadId && <p className="mt-1 text-sm text-red-600">{errors.ciudadId}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="barrio" className="block text-sm font-medium text-gray-700">Barrio (Opcional)</label>
                        <input type="text" name="barrio" id="barrio" value={formData.barrio} onChange={handleChange} placeholder="Ej: Palermo" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección (Opcional)</label>
                        <input type="text" name="direccion" id="direccion" value={formData.direccion} onChange={handleChange} placeholder="Ej: Av. Siempreviva 742" autoComplete="street-address" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                </div>
            </fieldset>

            {/* --- SECCIÓN 3: IMÁGENES Y DESCRIPCIÓN --- */}
            <fieldset className="space-y-6">
                <legend className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">3. Multimedia y Detalles</legend>
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Imagen Principal</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${errors.imagenUrl ? 'border-red-500' : (isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300')} border-dashed rounded-md cursor-pointer transition-colors`}
                  >
                    <div className="space-y-1 text-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Vista previa" className="mx-auto h-24 w-24 rounded-lg object-cover" />
                      ) : (
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8l-6-6-6 6M28 8v12a4 4 0 01-4 4H12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <div className="flex text-sm text-gray-600">
                        <p className="pl-1">
                          {imagePreview ? 'Reemplazar imagen' : 'Arrastrá y soltá o hacé clic para subir una imagen'}
                        </p>
                      </div>
                       <p className="text-xs text-gray-500">PNG, JPG, WEBP hasta 10MB</p>
                    </div>
                    <input ref={fileInputRef} type="file" name="imagen" id="imagen" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} className="hidden"/>
                  </div>
                   {errors.imagenUrl && <p className="mt-1 text-sm text-red-600">{errors.imagenUrl}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Galería de Imágenes (Opcional - Máx {MAX_GALLERY_IMAGES})</label>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsGalleryDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsGalleryDragging(false); }}
                        onDrop={handleGalleryDrop}
                        onClick={() => galleryFileInputRef.current?.click()}
                        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isGalleryDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'} border-dashed rounded-md cursor-pointer transition-colors`}
                    >
                        <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            <p className="text-sm text-gray-600">Arrastrá y soltá o hacé clic para subir más imágenes</p>
                        </div>
                         <input ref={galleryFileInputRef} type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={(e) => handleGalleryFiles(e.target.files)} className="hidden" />
                    </div>
                    {(formData.galeriaImagenes?.length || 0) > 0 && (
                        <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-4">
                            {formData.galeriaImagenes?.map((imgSrc, index) => (
                                <div key={index} className="relative group">
                                    <img src={imgSrc} className="w-full h-24 object-cover rounded-md shadow" alt={`Vista previa de galería ${index + 1}`} />
                                    <button type="button" onClick={() => handleRemoveGalleryImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-white" aria-label="Eliminar imagen">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                 <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción (Opcional)</label>
                  <textarea name="description" id="description" rows={3} value={formData.description} onChange={handleChange} placeholder="Contá brevemente sobre tu comercio, qué ofrecés, tu historia, etc." className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
            </fieldset>

            {/* --- SECCIÓN 4: CONTACTO --- */}
            <fieldset className="space-y-6">
                 <legend className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">4. Datos de Contacto</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">WhatsApp</label>
                        <input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="Ej: 5491112345678" autoComplete="tel" className={`mt-1 block w-full border ${errors.whatsapp ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500`} required />
                        {errors.whatsapp && <p className="mt-1 text-sm text-red-600">{errors.whatsapp}</p>}
                    </div>
                    <div>
                        <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">Página Web (Opcional)</label>
                        <input type="url" name="websiteUrl" id="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="https://ejemplo.com" autoComplete="url" className={`mt-1 block w-full border ${errors.websiteUrl ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500`} />
                        {errors.websiteUrl && <p className="mt-1 text-sm text-red-600">{errors.websiteUrl}</p>}
                    </div>
                </div>
                <div>
                    <label htmlFor="googleMapsUrl" className="block text-sm font-medium text-gray-700">Link de Google Maps (Opcional)</label>
                    <input type="url" name="googleMapsUrl" id="googleMapsUrl" value={formData.googleMapsUrl} onChange={handleChange} placeholder="https://maps.app.goo.gl/..." autoComplete="url" className={`mt-1 block w-full border ${errors.googleMapsUrl ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500`} />
                     {errors.googleMapsUrl && <p className="mt-1 text-sm text-red-600">{errors.googleMapsUrl}</p>}
                </div>
            </fieldset>

             {/* --- SECCIÓN 5: PUBLICIDAD --- */}
            <fieldset>
                <legend className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">5. Plan de Publicidad</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AD_TIERS.map(tier => (
                         <label key={tier.level} className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition-all duration-200 ${formData.publicidad === tier.level ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-300 hover:border-indigo-400'}`}>
                            <input
                                type="radio"
                                name="publicidad"
                                value={tier.level}
                                checked={formData.publicidad === tier.level}
                                onChange={(e) => setFormData(prev => ({...prev, publicidad: parseInt(e.target.value)}))}
                                className="sr-only"
                            />
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-900">{tier.name}</span>
                                <span className="text-xl font-extrabold text-indigo-600">${tier.price.toLocaleString('es-AR')}</span>
                            </div>
                            <ul className="mt-4 space-y-2 text-sm text-gray-600 flex-grow">
                                {tier.features.slice(0, 3).map((feature, i) => (
                                    <li key={i} className="flex items-start">
                                      <CheckIcon />
                                      <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            {formData.publicidad === tier.level && <div className="absolute -top-3 -right-3 w-6 h-6 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white">✓</div>}
                        </label>
                    ))}
                </div>
                {formData.publicidad > 1 && (
                    <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                        <p className="text-sm text-indigo-800">Tu plan será válido por <strong>30 días</strong>. Se te notificará antes de su vencimiento.</p>
                    </div>
                )}
                 <div className="mt-4 flex items-center">
                    <input
                        id="renovacionAutomatica"
                        name="renovacionAutomatica"
                        type="checkbox"
                        checked={formData.renovacionAutomatica}
                        onChange={(e) => setFormData(prev => ({...prev, renovacionAutomatica: e.target.checked}))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        disabled={formData.publicidad === 1}
                    />
                    <label htmlFor="renovacionAutomatica" className="ml-2 block text-sm text-gray-900">
                        Activar renovación automática
                    </label>
                </div>
            </fieldset>

            <div>
              <button 
                type="submit" 
                className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!isFormValid}
              >
                Crear y Publicar Comercio
              </button>
            </div>
        </form>
    </div>
  );
};

export default CreateComercioPage;
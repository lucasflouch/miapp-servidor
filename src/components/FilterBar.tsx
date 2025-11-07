import React, { useState, useEffect, useMemo } from 'react';
import { Provincia, Ciudad, Rubro, SubRubro } from '../types';

interface Filters {
  provinciaId: string;
  ciudadId: string;
  rubroId: string;
  subRubroId: string;
  nombre: string;
  barrio: string; // Nuevo filtro
}

interface FilterBarProps {
  provincias: Provincia[];
  rubros: Rubro[];
  subRubros: SubRubro[];
  onSearch: (filters: Filters) => void;
  onLocationSearch: (coords: { lat: number; lon: number }) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ provincias, rubros, subRubros, onSearch, onLocationSearch }) => {
  const [selectedProvincia, setSelectedProvincia] = useState('06'); // ID por defecto para Buenos Aires
  const [selectedCiudad, setSelectedCiudad] = useState('060364'); // ID corregido para General Rodríguez
  const [selectedRubro, setSelectedRubro] = useState('');
  const [selectedSubRubro, setSelectedSubRubro] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchBarrio, setSearchBarrio] = useState(''); // Nuevo estado
  
  const [availableCiudades, setAvailableCiudades] = useState<Ciudad[]>([]);
  const [loadingCiudades, setLoadingCiudades] = useState(false);
  const [availableSubRubros, setAvailableSubRubros] = useState<SubRubro[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Efecto para cargar ciudades cuando cambia la provincia
  useEffect(() => {
    const fetchCiudades = async () => {
      if (!selectedProvincia) {
        setAvailableCiudades([]);
        setSelectedCiudad('');
        return;
      }
      
      setLoadingCiudades(true);
      setAvailableCiudades([]);
      // No reseteamos la ciudad seleccionada aquí para permitir el valor por defecto
      
      try {
        const response = await fetch(`https://apis.datos.gob.ar/georef/api/v2.0/municipios?provincia=${selectedProvincia}&campos=id,nombre&max=5000&orden=nombre`);
        if (!response.ok) throw new Error('Failed to fetch cities from API');
        const data = await response.json();
        const mappedCiudades: Ciudad[] = data.municipios.map((loc: any) => ({
          id: loc.id,
          nombre: loc.nombre,
          provinciaId: selectedProvincia,
        }));
        setAvailableCiudades(mappedCiudades);
      } catch (error) {
        console.error("Error fetching cities for filter bar:", error);
        alert("No se pudieron cargar las ciudades para la provincia seleccionada.");
      } finally {
        setLoadingCiudades(false);
      }
    };
    
    fetchCiudades();
  }, [selectedProvincia]);

  // Efecto para actualizar sub-rubros cuando cambia el rubro
  useEffect(() => {
      if (selectedRubro) {
          setAvailableSubRubros(subRubros.filter(sr => sr.rubroId === selectedRubro));
      } else {
          setAvailableSubRubros([]);
      }
      setSelectedSubRubro('');
  }, [selectedRubro, subRubros]);
  
  const handleSearch = () => {
    onSearch({
      provinciaId: selectedProvincia,
      ciudadId: selectedCiudad,
      rubroId: selectedRubro,
      subRubroId: selectedSubRubro,
      nombre: searchName,
      barrio: searchBarrio,
    });
  };

  const handleLocationSearch = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no es soportada por tu navegador.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSearch({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        alert(`Error al obtener la ubicación: ${error.message}`);
        setIsLocating(false);
      }
    );
  };
  
  const handleReset = () => {
    // Al limpiar, volvemos a los valores por defecto
    setSelectedProvincia('06');
    setSelectedCiudad('060364'); // ID corregido
    setSelectedRubro('');
    setSelectedSubRubro('');
    setSearchName('');
    setSearchBarrio('');
    onSearch({ provinciaId: '06', ciudadId: '060364', rubroId: '', subRubroId: '', nombre: '', barrio: '' });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Provincia */}
        <div>
          <label htmlFor="provincia" className="text-sm font-medium text-gray-700 mb-1 block">Provincia</label>
          <select id="provincia" value={selectedProvincia} onChange={(e) => {
              setSelectedProvincia(e.target.value);
              // Al cambiar de provincia, reseteamos la ciudad
              setSelectedCiudad('');
            }}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Todas</option>
            {provincias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        {/* Ciudad */}
        <div>
          <label htmlFor="ciudad" className="text-sm font-medium text-gray-700 mb-1 block">Ciudad</label>
          <select id="ciudad" value={selectedCiudad} onChange={(e) => setSelectedCiudad(e.target.value)}
            disabled={!selectedProvincia || loadingCiudades}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100">
            <option value="">{loadingCiudades ? 'Cargando...' : 'Todas'}</option>
            {availableCiudades.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        {/* Barrio */}
        <div>
          <label htmlFor="barrio" className="text-sm font-medium text-gray-700 mb-1 block">Barrio</label>
          <input type="text" id="barrio" value={searchBarrio} onChange={(e) => setSearchBarrio(e.target.value)}
            placeholder="Ej: Palermo"
            disabled={!selectedCiudad}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          />
        </div>
        {/* Rubro */}
        <div>
          <label htmlFor="rubro" className="text-sm font-medium text-gray-700 mb-1 block">Rubro</label>
          <select id="rubro" value={selectedRubro} onChange={(e) => setSelectedRubro(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Todos</option>
            {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        {/* Sub-Rubro */}
        <div>
          <label htmlFor="subrubro" className="text-sm font-medium text-gray-700 mb-1 block">Sub-Rubro</label>
          <select id="subrubro" value={selectedSubRubro} onChange={(e) => setSelectedSubRubro(e.target.value)}
            disabled={!selectedRubro}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100">
            <option value="">Todos</option>
            {availableSubRubros.map(sr => <option key={sr.id} value={sr.id}>{sr.nombre}</option>)}
          </select>
        </div>
        {/* Nombre */}
        <div>
            <label htmlFor="nombre" className="text-sm font-medium text-gray-700 mb-1 block">Nombre del Comercio</label>
            <input type="text" id="nombre" value={searchName} onChange={(e) => setSearchName(e.target.value)}
                placeholder="Ej: La Pizzería..."
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
      </div>
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
         <button onClick={handleSearch} className="w-full bg-indigo-600 text-white px-4 py-3 rounded-md font-semibold hover:bg-indigo-700 transition-colors">
            Buscar
          </button>
          <button onClick={handleLocationSearch} disabled={isLocating} className="w-full bg-blue-600 text-white px-4 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400">
            {isLocating ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : '📍'}
            {isLocating ? 'Buscando...' : 'Buscar Cerca de Mí'}
          </button>
          <button onClick={handleReset} className="w-full bg-gray-600 text-white px-4 py-3 rounded-md font-semibold hover:bg-gray-700 transition-colors">
            Limpiar Filtros
          </button>
       </div>
    </div>
  );
};

export default FilterBar;
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
  ciudades: Ciudad[]; // Nueva prop
  rubros: Rubro[];
  subRubros: SubRubro[];
  onSearch: (filters: Filters) => void;
  onLocationSearch: (coords: { lat: number; lon: number }) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ provincias, ciudades, rubros, subRubros, onSearch, onLocationSearch }) => {
  const [selectedProvincia, setSelectedProvincia] = useState('06'); // ID por defecto para Buenos Aires
  const [selectedCiudad, setSelectedCiudad] = useState('060364'); // ID corregido para General Rodríguez
  const [selectedRubro, setSelectedRubro] = useState('');
  const [selectedSubRubro, setSelectedSubRubro] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchBarrio, setSearchBarrio] = useState(''); // Nuevo estado
  
  const [isLocating, setIsLocating] = useState(false);

  // Deriva las ciudades disponibles desde las props, en lugar de hacer un fetch
  const availableCiudades = useMemo(() => {
    if (!selectedProvincia) {
      return [];
    }
    return ciudades.filter(c => c.provinciaId === selectedProvincia).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [selectedProvincia, ciudades]);

  const availableSubRubros = useMemo(() => {
    if (selectedRubro) {
        return subRubros.filter(sr => sr.rubroId === selectedRubro);
    }
    return [];
  }, [selectedRubro, subRubros]);
  
  // Limpia el sub-rubro cuando cambia el rubro
  useEffect(() => {
      setSelectedSubRubro('');
  }, [selectedRubro]);
  
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
            disabled={!selectedProvincia}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100">
            <option value="">Todas</option>
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
          <button 
            onClick={handleLocationSearch} 
            disabled={isLocating} 
            className="w-full bg-blue-500 text-white px-4 py-3 rounded-md font-semibold flex items-center justify-center hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLocating ? 'Buscando...' : '📍 Buscar Cerca de Mí'}
          </button>
          <button onClick={handleReset} className="w-full bg-gray-600 text-white px-4 py-3 rounded-md font-semibold hover:bg-gray-700 transition-colors">
            Limpiar Filtros
          </button>
       </div>
    </div>
  );
};

export default FilterBar;
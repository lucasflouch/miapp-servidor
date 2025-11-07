import React, { useState, useEffect, useMemo } from 'react';
import { AdminAnalyticsData, Rubro, Comercio, Usuario, Pago } from '../types';
import * as api from '../apiService';
import { AD_TIERS } from '../constants';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
);

const MarketingSection: React.FC = () => {
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSendSummary = async () => {
        setIsSending(true);
        setSendStatus(null);
        try {
            const adminUser = api.getCurrentUserFromSession();
            if (!adminUser || !api.isAdmin(adminUser.email)) {
                throw new Error("No estás autorizado para realizar esta acción.");
            }
            const result = await api.sendMonthlySummary(adminUser.email);
            setSendStatus({ type: 'success', message: result.message });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
            setSendStatus({ type: 'error', message });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Marketing por Email</h2>
            <p className="text-gray-600 mb-4">
                Enviá un resumen de rendimiento (visitas, clics) de los últimos 30 días a todos los comerciantes registrados.
                Esto es una simulación: los emails se mostrarán en la consola del servidor en lugar de enviarse.
            </p>
            <button
                onClick={handleSendSummary}
                disabled={isSending}
                className="inline-flex items-center bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-wait transition-colors"
            >
                {isSending && (
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {isSending ? 'Enviando...' : 'Enviar Resumen Mensual a Comercios'}
            </button>
            {sendStatus && (
                <div className={`mt-4 p-3 rounded-md text-sm font-semibold ${sendStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {sendStatus.message}
                </div>
            )}
        </div>
    );
};

interface AdminPageProps {
  rubros: Rubro[];
  comercios: Comercio[];
  usuarios: Usuario[];
  pagos: Pago[];
}

const AdminPage: React.FC<AdminPageProps> = ({ rubros, comercios, usuarios, pagos }) => {
    const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [sortBy, setSortBy] = useState<'vencimiento' | 'nombre'>('vencimiento');
    const [viewingHistory, setViewingHistory] = useState<Comercio | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoadingAnalytics(true);
            setError(null);
            try {
                const adminUser = api.getCurrentUserFromSession();
                if (!adminUser || !api.isAdmin(adminUser.email)) {
                    throw new Error("Acceso no autorizado.");
                }
                const data = await api.getAdminAnalytics(adminUser.email);
                setAnalytics(data);
            } catch (e) {
                const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
                setError(message);
            } finally {
                setLoadingAnalytics(false);
            }
        };

        fetchAnalytics();
    }, []);

    const getRubroIcon = (rubroId: string) => rubros.find(r => r.id === rubroId)?.icon || '❓';
    const getTierName = (level: number) => AD_TIERS.find(t => t.level === level)?.name || 'Desconocido';
    const formatDate = (isoString?: string) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const getVencimientoStatus = (isoString?: string): { label: string; color: string } | null => {
        if (!isoString) return null;
        const vencimientoDate = new Date(isoString);
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);

        if (vencimientoDate < today) {
            return { label: 'Vencido', color: 'bg-red-100 text-red-800' };
        }
        if (vencimientoDate <= sevenDaysFromNow) {
            return { label: 'Por Vencer', color: 'bg-yellow-100 text-yellow-800' };
        }
        return null;
    };

    const sortedAndEnrichedComercios = useMemo(() => {
        const enriched = comercios.map(c => ({
            ...c,
            ownerName: usuarios.find(u => u.id === c.usuarioId)?.nombre || 'Usuario no encontrado'
        }));

        enriched.sort((a, b) => {
            if (sortBy === 'vencimiento') {
                const dateA = a.vencimientoPublicidad ? new Date(a.vencimientoPublicidad).getTime() : Infinity;
                const dateB = b.vencimientoPublicidad ? new Date(b.vencimientoPublicidad).getTime() : Infinity;
                return dateA - dateB;
            }
            if (sortBy === 'nombre') {
                return a.nombre.localeCompare(b.nombre);
            }
            return 0;
        });

        return enriched;
    }, [comercios, usuarios, sortBy]);

    const commerceHistoryPayments = useMemo(() => {
        if (!viewingHistory) return [];
        return pagos.filter(p => p.comercioId === viewingHistory.id).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [viewingHistory, pagos]);

    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Panel de Administrador</h1>
            
            {loadingAnalytics && <LoadingSpinner />}
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
            
            {analytics && (
                <div className="space-y-8">
                    {/* Tarjetas de Resumen */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                            <h3 className="text-lg font-semibold text-gray-500">Visitas a Fichas (Últimos 30 días)</h3>
                            <p className="text-5xl font-bold text-indigo-600 mt-2">{analytics.totalEvents.views.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                            <h3 className="text-lg font-semibold text-gray-500">Clics en WhatsApp</h3>
                            <p className="text-5xl font-bold text-green-600 mt-2">{analytics.totalEvents.whatsappClicks.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                            <h3 className="text-lg font-semibold text-gray-500">Clics en Sitios Web</h3>
                            <p className="text-5xl font-bold text-blue-600 mt-2">{analytics.totalEvents.websiteClicks.toLocaleString('es-AR')}</p>
                        </div>
                    </div>
                    {/* Grillas de Datos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Visitas por Rubro</h2>
                            <ul className="space-y-3">
                                {analytics.visitsByRubro.map(item => (
                                    <li key={item.rubroId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-3">{getRubroIcon(item.rubroId)}</span>
                                            <span className="font-semibold text-gray-700">{item.rubroNombre}</span>
                                        </div>
                                        <span className="font-bold text-indigo-600 text-lg">{item.count.toLocaleString('es-AR')}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Top 5 Comercios Visitados</h2>
                             <ul className="space-y-3">
                                {analytics.topVisitedComercios.map((item, index) => (
                                    <li key={item.comercioId} className="flex items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="font-bold text-gray-500 w-8 text-center">{index + 1}.</span>
                                        <span className="font-semibold text-gray-700 flex-grow">{item.comercioNombre}</span>
                                        <span className="font-bold text-indigo-600 text-lg">{item.count.toLocaleString('es-AR')}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-12">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Comercios y Suscripciones</h2>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center mb-4">
                        <label htmlFor="sort-by" className="text-sm font-medium text-gray-700 mr-2">Ordenar por:</label>
                        <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'vencimiento' | 'nombre')} className="p-2 border border-gray-300 rounded-md shadow-sm text-sm">
                            <option value="vencimiento">Fecha de Vencimiento</option>
                            <option value="nombre">Nombre (A-Z)</option>
                        </select>
                        <span className="ml-auto text-sm font-semibold text-gray-600">Total: {comercios.length} comercios</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comercio</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propietario</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Actual</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Renov. Auto.</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedAndEnrichedComercios.map(c => {
                                    const status = getVencimientoStatus(c.vencimientoPublicidad);
                                    return (
                                        <tr key={c.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-md object-cover" src={c.imagenUrl} alt={c.nombre} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{c.nombre}</div>
                                                        <div className="text-sm text-gray-500">{c.ciudadNombre}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.ownerName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${c.publicidad > 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {getTierName(c.publicidad)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {formatDate(c.vencimientoPublicidad)}
                                                {status && <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                <span className={`font-semibold ${c.renovacionAutomatica ? 'text-green-700' : 'text-red-700'}`}>{c.renovacionAutomatica ? 'Sí' : 'No'}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button onClick={() => setViewingHistory(c)} className="text-indigo-600 hover:text-indigo-900">Ver Historial</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {viewingHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={() => setViewingHistory(null)}>
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Historial de Pagos para: {viewingHistory.nombre}</h3>
                        {commerceHistoryPayments.length > 0 ? (
                            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto pr-2">
                                {commerceHistoryPayments.map(p => (
                                    <li key={p.id} className="py-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-gray-800">${p.monto.toLocaleString('es-AR')}</p>
                                                <p className="text-sm text-gray-500">{new Date(p.fecha).toLocaleString('es-AR')}</p>
                                            </div>
                                            <p className="text-xs text-gray-400 font-mono">ID Transacción: {p.mercadoPagoId}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-600 text-center py-8">No se encontraron pagos para este comercio.</p>
                        )}
                        <div className="text-right mt-6">
                            <button onClick={() => setViewingHistory(null)} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {!loadingAnalytics && !error && <div className="mt-8"><MarketingSection /></div>}
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AdminPage;
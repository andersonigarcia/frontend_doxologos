import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
    FileText, CheckCircle2, Clock, AlertTriangle, RefreshCw,
    Send, ChevronLeft, Calendar, DollarSign, Loader2, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_NFSE = {
    issued: { label: 'Emitida', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
    pending: { label: 'Pendente', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
    failed: { label: 'Falha', color: 'text-red-600 bg-red-50', icon: AlertTriangle },
    queued: { label: 'Na fila', color: 'text-blue-600 bg-blue-50', icon: Clock },
};

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function getMonthRange(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // último dia do mês
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}

export default function FaturamentoMensalPage() {
    const navigate = useNavigate();
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [bookings, setBookings] = useState([]);
    const [nfseMap, setNfseMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchResult, setBatchResult] = useState(null);
    const [professionalId, setProfessionalId] = useState(null);

    // Buscar professional_id do usuário logado
    useEffect(() => {
        async function loadProfessional() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('professionals')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
            if (data) setProfessionalId(data.id);
        }
        loadProfessional();
    }, []);

    const loadData = useCallback(async () => {
        if (!professionalId) return;
        setLoading(true);
        setBatchResult(null);
        try {
            const { start, end } = getMonthRange(selectedYear, selectedMonth);

            // Buscar bookings confirmados do período
            const { data: bData, error: bErr } = await supabase
                .from('bookings')
                .select('id, booking_date, booking_time, patient_name, patient_email, services(name, price)')
                .eq('professional_id', professionalId)
                .eq('status', 'confirmed')
                .gte('booking_date', start)
                .lte('booking_date', end)
                .order('booking_date', { ascending: true });

            if (bErr) throw bErr;

            setBookings(bData || []);

            if (bData && bData.length > 0) {
                // Buscar NFSe correspondentes
                const ids = bData.map(b => b.id);
                const { data: nfData } = await supabase
                    .from('nfse_emissions')
                    .select('booking_id, status, nfse_number, error_message')
                    .in('booking_id', ids);

                const map = {};
                (nfData || []).forEach(n => { map[n.booking_id] = n; });
                setNfseMap(map);
            } else {
                setNfseMap({});
            }
        } catch (err) {
            console.error('Erro ao carregar faturamento:', err);
        } finally {
            setLoading(false);
        }
    }, [professionalId, selectedYear, selectedMonth]);

    useEffect(() => { loadData(); }, [loadData]);

    // Calcular totais
    const totalFaturado = bookings.reduce((acc, b) => acc + (parseFloat(b.services?.price) || 0), 0);
    const pendentes = bookings.filter(b => !nfseMap[b.id] || nfseMap[b.id]?.status === 'failed');
    const emitidas = bookings.filter(b => nfseMap[b.id]?.status === 'issued');
    const naFila = bookings.filter(b => nfseMap[b.id]?.status === 'pending' || nfseMap[b.id]?.status === 'queued');

    const handleBatchEmit = async () => {
        if (pendentes.length === 0) return;
        setBatchLoading(true);
        setBatchResult(null);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            if (!token) throw new Error('Sessão expirada');

            const { data, error } = await supabase.functions.invoke('batch-emit-nfse', {
                body: { booking_ids: pendentes.map(b => b.id) },
                headers: { Authorization: `Bearer ${token}` },
            });

            if (error) throw error;
            setBatchResult(data);
            // Recarregar dados para refletir o status 'queued'
            await loadData();
        } catch (err) {
            setBatchResult({ error: err.message || 'Erro ao enfileirar NFSe' });
        } finally {
            setBatchLoading(false);
        }
    };

    const getNfseStatus = (bookingId) => {
        const nf = nfseMap[bookingId];
        if (!nf) return { label: 'Pendente', color: 'text-yellow-600 bg-yellow-50', Icon: Clock };
        const s = STATUS_NFSE[nf.status] || STATUS_NFSE.pending;
        return { label: s.label, color: s.color, Icon: s.icon };
    };

    const MONTHS = [
        'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
    ];
    const YEARS = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    aria-label="Voltar"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-indigo-600" />
                        Faturamento Mensal & NFSe
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Gerencie a emissão de notas fiscais das suas consultas confirmadas.
                    </p>
                </div>
            </div>

            {/* Filtros de período */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-4 items-center">
                <Calendar className="w-5 h-5 text-indigo-500 shrink-0" />
                <div className="flex gap-3 flex-wrap">
                    <select
                        id="select-month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        id="select-year"
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button
                    id="btn-refresh-faturamento"
                    onClick={loadData}
                    disabled={loading}
                    className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            {/* Cards de totais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Faturado', value: formatCurrency(totalFaturado), Icon: DollarSign, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Consultas', value: bookings.length, Icon: FileText, color: 'text-gray-600 bg-gray-50' },
                    { label: 'NFSe Emitidas', value: emitidas.length, Icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                    { label: 'Pendentes', value: pendentes.length, Icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
                ].map(({ label, value, Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-lg font-bold text-gray-900">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Resultado do batch */}
            {batchResult && (
                <div className={`mb-5 p-4 rounded-xl border text-sm flex items-start gap-3 ${batchResult.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        {batchResult.error
                            ? <p><strong>Erro:</strong> {batchResult.error}</p>
                            : <>
                                <p className="font-semibold">{batchResult.message}</p>
                                <p className="mt-1 text-xs opacity-80">
                                    {batchResult.already_emitted > 0 && `${batchResult.already_emitted} já emitida(s). `}
                                    {batchResult.skipped > 0 && `${batchResult.skipped} ignorada(s) (não elegíveis).`}
                                </p>
                            </>
                        }
                    </div>
                </div>
            )}

            {/* Botão de emissão em lote */}
            {pendentes.length > 0 && (
                <div className="mb-5">
                    <button
                        id="btn-batch-emit-nfse"
                        onClick={handleBatchEmit}
                        disabled={batchLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {batchLoading
                            ? <><Loader2 className="w-5 h-5 animate-spin" /> Enfileirando...</>
                            : <><Send className="w-5 h-5" /> Emitir NFSe em Lote ({pendentes.length} pendentes)</>
                        }
                    </button>
                    <p className="text-xs text-gray-400 mt-2 ml-1">
                        As notas serão processadas automaticamente em segundo plano, respeitando os limites da prefeitura.
                    </p>
                </div>
            )}

            {/* Tabela de consultas */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Carregando consultas...</span>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                        <FileText className="w-12 h-12 opacity-30" />
                        <p>Nenhuma consulta confirmada neste período.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Data</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Paciente</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Serviço</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600">Valor</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-600">NFSe</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-600">Número</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bookings.map(b => {
                                const { label, color, Icon } = getNfseStatus(b.id);
                                const nf = nfseMap[b.id];
                                return (
                                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-700">
                                            {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            <span className="text-gray-400 ml-2 text-xs">{b.booking_time}</span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {b.patient_name}
                                            <p className="text-xs text-gray-400 font-normal">{b.patient_email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{b.services?.name || '—'}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                            {formatCurrency(b.services?.price)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                                {label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                            {nf?.nfse_number || '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700">Total do período</td>
                                <td className="px-4 py-3 text-right font-bold text-indigo-700">{formatCurrency(totalFaturado)}</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>

            {/* Nota informativa */}
            {naFila.length > 0 && (
                <p className="text-xs text-blue-600 mt-3 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    {naFila.length} NFSe(s) na fila de processamento. O status será atualizado automaticamente.
                </p>
            )}
        </div>
    );
}

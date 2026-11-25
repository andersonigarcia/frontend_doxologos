import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Filter,
  Search
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fetchReconciliationSnapshot, EXCEPTION_TYPES } from '@/services/reconciliationService';

const SEVERITY_BADGES = {
  critical: 'bg-rose-100 text-rose-800 border-rose-200',
  high: 'bg-amber-100 text-amber-800 border-amber-200',
  medium: 'bg-sky-100 text-sky-800 border-sky-200'
};

const SEVERITY_LABELS = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média'
};

export function ReconciliationPanel({ onNavigateTab, onSelectSubTab }) {
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState({
    exceptions: [],
    summary: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      totalAmountAtRisk: 0,
      checkedBookings: 0,
      checkedPayments: 0,
      checkedLedgerEntries: 0
    }
  });
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReconciliationSnapshot({ days });
      setSnapshot(result);
    } catch (err) {
      setError(err?.message || 'Não foi possível executar a conciliação.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const formatBrl = (val) =>
    (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredExceptions = useMemo(() => {
    return (snapshot.exceptions || []).filter((ex) => {
      if (typeFilter !== 'all' && ex.code !== typeFilter) return false;
      if (severityFilter !== 'all' && ex.severity !== severityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = `${ex.title} ${ex.subtitle} ${ex.label} ${ex.referenceId}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [snapshot.exceptions, typeFilter, severityFilter, search]);

  const handleAction = (ex) => {
    if (ex.targetTab === 'livro-caixa' && onSelectSubTab) {
      onSelectSubTab('ledger');
      return;
    }
    onNavigateTab?.(ex.targetTab);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Header & Controles */}
      <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Conciliação por Exceção (4 Pontas)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruzamento automático: Agendamentos × Mercado Pago × Livro Caixa (Ledger) × NFS-e × Repasses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Janela de conciliação"
            className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 min-h-[38px]"
          >
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={180}>Últimos 180 dias</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={loadSnapshot}
            disabled={loading}
            className="rounded-xl text-xs h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Reconciliar
          </Button>
        </div>
      </Card>

      {error && (
        <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs">
          <strong>Erro na conciliação:</strong> {error}
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Exceções Abertas</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{snapshot.summary.total}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {snapshot.summary.checkedBookings} consultas · {snapshot.summary.checkedPayments} pgtos
          </p>
        </Card>

        <Card className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">Críticas (Caixa/Ledger)</span>
          <p className="text-2xl font-extrabold text-rose-900 mt-1 tabular-nums">{snapshot.summary.critical}</p>
          <p className="text-[11px] text-rose-700 mt-0.5">Exigem ação imediata</p>
        </Card>

        <Card className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase">Altas / Médias</span>
          <p className="text-2xl font-extrabold text-amber-900 mt-1 tabular-nums">
            {snapshot.summary.high + snapshot.summary.medium}
          </p>
          <p className="text-[11px] text-amber-800 mt-0.5">NFS-e e repasses pendentes</p>
        </Card>

        <Card className="p-4 bg-slate-900 text-white border border-slate-800 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-300 uppercase">Volume em Divergência</span>
          <p className="text-2xl font-extrabold text-white mt-1 tabular-nums">
            {formatBrl(snapshot.summary.totalAmountAtRisk)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Soma dos itens sinalizados</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente, profissional, ID..."
            className="pl-9 text-xs h-9 rounded-xl bg-white"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          aria-label="Filtrar por severidade"
          className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 h-9"
        >
          <option value="all">Todas as severidades</option>
          <option value="critical">Crítica</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filtrar por tipo de exceção"
          className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 h-9"
        >
          <option value="all">Todos os tipos</option>
          {Object.values(EXCEPTION_TYPES).map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Exceções */}
      {loading ? (
        <Card className="p-8 text-center text-xs text-slate-500">
          Executando cruzamento entre Agendamentos, Mercado Pago, Ledger e NFS-e...
        </Card>
      ) : filteredExceptions.length === 0 ? (
        <Card className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-emerald-950">Nenhuma divergência encontrada</p>
          <p className="text-xs text-emerald-800 mt-1">
            Todos os registros analisados na janela de {days} dias estão conciliados.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredExceptions.map((ex) => (
            <Card
              key={ex.id}
              className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] font-bold ${SEVERITY_BADGES[ex.severity] || ''}`}>
                    {SEVERITY_LABELS[ex.severity] || ex.severity}
                  </Badge>
                  <span className="text-xs font-bold text-slate-900">{ex.label}</span>
                  {ex.date && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {String(ex.date).slice(0, 10)}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {ex.title} <span className="font-normal text-slate-500">— {ex.subtitle}</span>
                </p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                  {ex.detail}
                </p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {formatBrl(ex.amount)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(ex)}
                  className="rounded-xl text-xs h-8"
                >
                  {ex.actionLabel}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReconciliationPanel;


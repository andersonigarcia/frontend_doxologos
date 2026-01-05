import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingOverlay';
import { secureLog } from '@/lib/secureLogger';
import { Ticket, RefreshCcw, Search, Filter, Calendar as CalendarIcon, Users, Pencil, Trash2, UserCircle } from 'lucide-react';

const REGISTRATION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente', badge: 'bg-amber-100 text-amber-800 border border-amber-200' },
  { value: 'confirmed', label: 'Confirmado', badge: 'bg-green-100 text-green-800 border border-green-200' },
  { value: 'cancelled', label: 'Cancelado', badge: 'bg-red-100 text-red-700 border border-red-200' }
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pagamento Pendente', badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  { value: 'approved', label: 'Pago', badge: 'bg-blue-100 text-blue-800 border border-blue-200' },
  { value: 'refunded', label: 'Estornado', badge: 'bg-purple-100 text-purple-800 border border-purple-200' }
];

const statusLabel = (value) => REGISTRATION_STATUS_OPTIONS.find((opt) => opt.value === value)?.label || value;
const paymentStatusLabel = (value) => PAYMENT_STATUS_OPTIONS.find((opt) => opt.value === value)?.label || value;
const formatCurrency = (value) => {
  const numberValue = Number(value) || 0;
  return numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const formatDate = (date) => (date ? new Date(date).toLocaleDateString('pt-BR') : '—');
const formatDateTime = (date) => (date ? new Date(date).toLocaleString('pt-BR') : '—');

const EventRegistrationsDashboard = ({ events = [], userRole }) => {
  const isAdmin = userRole === 'admin';
  const { toast } = useToast();

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    eventId: '',
    status: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('registration_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });
  const [confirmDialogState, setConfirmDialogState] = useState({ isOpen: false, registration: null });
  const [rowLoading, setRowLoading] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const setRowBusy = (id, type, value) => {
    setRowLoading((prev) => ({ ...prev, [`${id}-${type}`]: value }));
  };

  const isRowBusy = (id, type) => Boolean(rowLoading[`${id}-${type}`]);

  const handleSort = (field) => {
    setSortOrder((prevOrder) => {
      const isSameField = sortField === field;
      if (!isSameField) return 'desc';
      return prevOrder === 'asc' ? 'desc' : 'asc';
    });
    setSortField(field);
  };

  const fetchRegistrations = useCallback(async () => {
    if (!isAdmin) {
      setRegistrations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('inscricoes_eventos')
      .select(`
        *,
        eventos:eventos (
          id,
          titulo,
          data_inicio,
          data_fim,
          valor,
          tipo_evento,
          link_slug,
          professional:professionals(name)
        )
      `)
      .order('data_inscricao', { ascending: false, nullsLast: true });

    if (error) {
      secureLog.error('Erro ao buscar inscrições de eventos', error?.message || error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar inscrições',
        description: 'Tente novamente em instantes.'
      });
      setRegistrations([]);
    } else {
      setRegistrations(data || []);
    }
    setLoading(false);
  }, [isAdmin, toast]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  useEffect(() => {
    setPage(1);
  }, [filters, sortField, sortOrder]);

  const metrics = useMemo(() => {
    return registrations.reduce(
      (acc, registration) => {
        const rawValue = Number(registration.valor_pago ?? registration.eventos?.valor ?? 0) || 0;
        const isPaid = registration.payment_status === 'approved' || (registration.eventos?.valor === 0 && registration.status === 'confirmed');
        const isPending = registration.payment_status === 'pending' || registration.status === 'pending';

        acc.totalValue += rawValue;
        if (isPaid) acc.receivedValue += rawValue;
        if (isPending) acc.pendingValue += rawValue;
        acc.totalCount += 1;
        if (registration.status === 'confirmed') acc.confirmedCount += 1;
        if (registration.status === 'pending') acc.waitingCount += 1;
        return acc;
      },
      { totalValue: 0, receivedValue: 0, pendingValue: 0, totalCount: 0, confirmedCount: 0, waitingCount: 0 }
    );
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((registration) => {
      const { search, eventId, status, paymentStatus, dateFrom, dateTo } = filters;
      const event = registration.eventos;

      if (eventId && String(event?.id) !== eventId) return false;
      if (status && registration.status !== status) return false;
      if (paymentStatus && registration.payment_status !== paymentStatus) return false;

      if (search) {
        const query = search.toLowerCase();
        const haystack = [
          registration.patient_name,
          registration.patient_email,
          registration.patient_phone,
          event?.titulo
        ]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (dateFrom || dateTo) {
        const eventDate = event?.data_inicio ? new Date(event.data_inicio) : null;
        if (eventDate) {
          if (dateFrom && eventDate < new Date(`${dateFrom}T00:00:00`)) return false;
          if (dateTo && eventDate > new Date(`${dateTo}T23:59:59`)) return false;
        }
      }

      return true;
    });
  }, [filters, registrations]);

  const sortedRegistrations = useMemo(() => {
    const sorted = [...filteredRegistrations];
    sorted.sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'event_date') {
        const dateA = new Date(a.eventos?.data_inicio || a.created_at).getTime();
        const dateB = new Date(b.eventos?.data_inicio || b.created_at).getTime();
        return dateA === dateB ? 0 : dateA > dateB ? direction : -direction;
      }

      if (sortField === 'registration_date') {
        const dateA = new Date(a.created_at || a.data_inscricao || a.inserted_at || 0).getTime();
        const dateB = new Date(b.created_at || b.data_inscricao || b.inserted_at || 0).getTime();
        return dateA === dateB ? 0 : dateA > dateB ? direction : -direction;
      }

      if (sortField === 'valor_pago') {
        const valueA = Number(a.valor_pago ?? a.eventos?.valor ?? 0) || 0;
        const valueB = Number(b.valor_pago ?? b.eventos?.valor ?? 0) || 0;
        return valueA === valueB ? 0 : valueA > valueB ? direction : -direction;
      }

      const valueA = (a[sortField] || '').toString();
      const valueB = (b[sortField] || '').toString();
      if (valueA === valueB) return 0;
      return valueA > valueB ? direction : -direction;
    });
    return sorted;
  }, [filteredRegistrations, sortField, sortOrder]);

  const paginatedRegistrations = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return sortedRegistrations.slice(start, end);
  }, [page, perPage, sortedRegistrations]);

  const totalPages = Math.max(Math.ceil(sortedRegistrations.length / perPage), 1);

  const handleStatusChange = async (registration, newStatus) => {
    if (registration.status === newStatus) return;
    setRowBusy(registration.id, 'status', true);
    const { error } = await supabase
      .from('inscricoes_eventos')
      .update({ status: newStatus })
      .eq('id', registration.id);

    if (error) {
      secureLog.error('Erro ao atualizar status de inscrição', error?.message || error);
      toast({ variant: 'destructive', title: 'Erro ao atualizar status' });
    } else {
      toast({ title: 'Status atualizado' });
      setRegistrations((prev) => prev.map((item) => (item.id === registration.id ? { ...item, status: newStatus } : item)));
    }
    setRowBusy(registration.id, 'status', false);
  };

  const handlePaymentStatusChange = async (registration, newStatus) => {
    if (registration.payment_status === newStatus) return;
    setRowBusy(registration.id, 'payment', true);
    const payload = { payment_status: newStatus };
    if (newStatus === 'approved' && !registration.payment_date) {
      payload.payment_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('inscricoes_eventos')
      .update(payload)
      .eq('id', registration.id);

    if (error) {
      secureLog.error('Erro ao atualizar pagamento de inscrição', error?.message || error);
      toast({ variant: 'destructive', title: 'Erro ao atualizar pagamento' });
    } else {
      toast({ title: 'Pagamento atualizado' });
      setRegistrations((prev) => prev.map((item) => (item.id === registration.id ? { ...item, ...payload } : item)));
    }
    setRowBusy(registration.id, 'payment', false);
  };

  const openEditModal = (registration) => {
    setEditModal({
      isOpen: true,
      data: {
        id: registration.id,
        patient_name: registration.patient_name || '',
        patient_email: registration.patient_email || '',
        patient_phone: registration.patient_phone || '',
        status: registration.status,
        payment_status: registration.payment_status,
        valor_pago: registration.valor_pago ?? registration.eventos?.valor ?? 0
      }
    });
  };

  const closeEditModal = () => setEditModal({ isOpen: false, data: null });

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editModal.data) return;
    setSavingEdit(true);
    const { id, valor_pago, ...rest } = editModal.data;
    const parsedValor = Number(valor_pago) || 0;

    const { error } = await supabase
      .from('inscricoes_eventos')
      .update({ ...rest, valor_pago: parsedValor })
      .eq('id', id);

    if (error) {
      secureLog.error('Erro ao salvar inscrição', error?.message || error);
      toast({ variant: 'destructive', title: 'Erro ao salvar inscrição' });
    } else {
      toast({ title: 'Inscrição atualizada' });
      setRegistrations((prev) => prev.map((item) => (item.id === id ? { ...item, ...rest, valor_pago: parsedValor } : item)));
      closeEditModal();
    }
    setSavingEdit(false);
  };

  const handleDelete = async () => {
    const target = confirmDialogState.registration;
    if (!target) return;

    const { error } = await supabase
      .from('inscricoes_eventos')
      .delete()
      .eq('id', target.id);

    if (error) {
      secureLog.error('Erro ao excluir inscrição', error?.message || error);
      toast({ variant: 'destructive', title: 'Erro ao excluir inscrição' });
    } else {
      toast({ title: 'Inscrição removida' });
      setRegistrations((prev) => prev.filter((item) => item.id !== target.id));
    }
    setConfirmDialogState({ isOpen: false, registration: null });
  };

  const clearFilters = () => {
    setFilters({ search: '', eventId: '', status: '', paymentStatus: '', dateFrom: '', dateTo: '' });
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Ticket className="w-12 h-12 mx-auto text-[#2d8659] mb-4" />
        <p className="text-gray-600">
          Apenas administradores conseguem gerenciar inscrições em eventos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Ticket className="w-6 h-6 mr-2 text-[#2d8659]" />
            Inscrições em Eventos
            <span className="ml-2 text-lg text-gray-500">({filteredRegistrations.length}/{registrations.length})</span>
          </h2>
          <p className="text-sm text-gray-500">Controle completo das inscrições, pagamentos e status de participação.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
            <Filter className="w-4 h-4 mr-1" />
            {showFilters ? 'Ocultar filtros' : 'Filtros'}
          </Button>
          <Button onClick={fetchRegistrations} disabled={loading} className="bg-[#2d8659] hover:bg-[#236b47]">
            {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gradient-to-r from-sky-50 to-sky-100 p-4 rounded-lg border border-sky-200">
          <p className="text-xs uppercase text-sky-600 font-semibold">Total inscrito</p>
          <p className="text-2xl font-bold text-sky-900 mt-1">{metrics.totalCount}</p>
        </div>
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
          <p className="text-xs uppercase text-emerald-600 font-semibold">Confirmados</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{metrics.confirmedCount}</p>
        </div>
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
          <p className="text-xs uppercase text-amber-600 font-semibold">Aguardando</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{metrics.waitingCount}</p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <p className="text-xs uppercase text-green-600 font-semibold">Recebido</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(metrics.receivedValue)}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <p className="text-xs uppercase text-blue-600 font-semibold">Previsto</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(metrics.totalValue)}</p>
        </div>
        <div className="bg-gradient-to-r from-fuchsia-50 to-fuchsia-100 p-4 rounded-lg border border-fuchsia-200">
          <p className="text-xs uppercase text-fuchsia-600 font-semibold">Pendências</p>
          <p className="text-2xl font-bold text-fuchsia-900 mt-1">{formatCurrency(metrics.pendingValue)}</p>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Busca</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full input pl-9"
                  placeholder="Nome, email ou evento"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Evento</label>
              <select
                value={filters.eventId}
                onChange={(e) => setFilters((prev) => ({ ...prev, eventId: e.target.value }))}
                className="w-full input"
              >
                <option value="">Todos</option>
                {events.map((event) => (
                  <option key={event.id} value={String(event.id)}>{event.titulo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status da inscrição</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full input"
              >
                <option value="">Todos</option>
                {REGISTRATION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status do pagamento</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                className="w-full input"
              >
                <option value="">Todos</option>
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data inicial</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data final</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="w-full input"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4 text-sm">
            <div className="text-gray-500">{filteredRegistrations.length} inscrição(ões) encontradas</div>
            <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-between text-sm mb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className={sortField === 'registration_date' ? 'bg-[#2d8659] text-white hover:bg-[#236b47] border-[#2d8659]' : ''}
            onClick={() => handleSort('registration_date')}
          >
            📥 Data da inscrição {sortField === 'registration_date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={sortField === 'event_date' ? 'bg-[#2d8659] text-white hover:bg-[#236b47] border-[#2d8659]' : ''}
            onClick={() => handleSort('event_date')}
          >
            📆 Data do evento {sortField === 'event_date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={sortField === 'valor_pago' ? 'bg-[#2d8659] text-white hover:bg-[#236b47] border-[#2d8659]' : ''}
            onClick={() => handleSort('valor_pago')}
          >
            💰 Valor {sortField === 'valor_pago' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="input text-sm w-24">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <span>por página</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <LoadingSpinner className="text-[#2d8659] mb-3" />
          Carregando inscrições...
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Nenhuma inscrição encontrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedRegistrations.map((registration) => {
            const event = registration.eventos;
            const eventValue = registration.valor_pago ?? event?.valor ?? 0;
            const isFree = (event?.valor ?? 0) === 0;
            return (
              <div key={registration.id} className="border rounded-lg p-5 hover:shadow-md transition bg-white">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{registration.patient_name || 'Participante sem nome'}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${REGISTRATION_STATUS_OPTIONS.find((opt) => opt.value === registration.status)?.badge || 'bg-gray-100 text-gray-700 border'}`}>
                        {statusLabel(registration.status)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PAYMENT_STATUS_OPTIONS.find((opt) => opt.value === registration.payment_status)?.badge || 'bg-gray-100 text-gray-700 border'}`}>
                        {paymentStatusLabel(registration.payment_status)}
                      </span>
                      {isFree && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                          Evento gratuito
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Evento</p>
                        <p className="font-medium text-gray-900">{event?.titulo || '—'}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {event?.data_inicio ? `${formatDate(event.data_inicio)} • ${new Date(event.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Data não definida'}
                        </p>
                        {event?.professional?.name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <UserCircle className="w-4 h-4" />
                            Facilitador: {event.professional.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-500">Contato</p>
                        <p className="font-medium text-gray-900">{registration.patient_email || '—'}</p>
                        <p className="text-gray-600">{registration.patient_phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Financeiro</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(eventValue)}</p>
                        <p className="text-xs text-gray-500">Pagamento: {paymentStatusLabel(registration.payment_status)}</p>
                        {registration.payment_id && (
                          <p className="text-xs text-gray-400">ID pagamento: {registration.payment_id}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 w-full lg:w-64">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Atualizar status</label>
                      <select
                        value={registration.status}
                        onChange={(e) => handleStatusChange(registration, e.target.value)}
                        disabled={isRowBusy(registration.id, 'status')}
                        className="w-full input text-sm"
                      >
                        {REGISTRATION_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Atualizar pagamento</label>
                      <select
                        value={registration.payment_status || 'pending'}
                        onChange={(e) => handlePaymentStatusChange(registration, e.target.value)}
                        disabled={isRowBusy(registration.id, 'payment')}
                        className="w-full input text-sm"
                      >
                        {PAYMENT_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => openEditModal(registration)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmDialogState({ isOpen: true, registration })}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                    {event?.link_slug && (
                      <a
                        href={`/evento/${event.link_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center text-sm text-[#2d8659] underline"
                      >
                        Ver página do evento ↗
                      </a>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
                  <div>
                    <p className="font-semibold text-gray-600">Criado em</p>
                    <p>{formatDateTime(registration.created_at || registration.data_inscricao)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Atualizado em</p>
                    <p>{formatDateTime(registration.updated_at)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Usuário ID</p>
                    <p>{registration.user_id || '—'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredRegistrations.length > 0 && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
          <div>
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <Dialog open={editModal.isOpen} onOpenChange={(open) => { if (!open) closeEditModal(); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar inscrição</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={editModal.data?.patient_name || ''}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, data: { ...prev.data, patient_name: e.target.value } }))}
                  className="w-full input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editModal.data?.patient_email || ''}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, data: { ...prev.data, patient_email: e.target.value } }))}
                  className="w-full input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  type="tel"
                  value={editModal.data?.patient_phone || ''}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, data: { ...prev.data, patient_phone: e.target.value } }))}
                  className="w-full input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor pago</label>
                <input
                  type="number"
                  step="0.01"
                  value={editModal.data?.valor_pago ?? 0}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, data: { ...prev.data, valor_pago: e.target.value } }))}
                  className="w-full input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editModal.data?.status || 'pending'}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, data: { ...prev.data, status: e.target.value } }))}
                  className="w-full input"
                >
                  {REGISTRATION_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pagamento</label>
                <select
                  value={editModal.data?.payment_status || 'pending'}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, data: { ...prev.data, payment_status: e.target.value } }))}
                  className="w-full input"
                >
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit} className="bg-[#2d8659] hover:bg-[#236b47]">
                {savingEdit ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        title="Excluir inscrição"
        message="Tem certeza que deseja remover esta inscrição?"
        warningMessage="Esta ação não pode ser desfeita e remove permanentemente o registro."
        confirmText="Excluir"
        onClose={() => setConfirmDialogState({ isOpen: false, registration: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default EventRegistrationsDashboard;

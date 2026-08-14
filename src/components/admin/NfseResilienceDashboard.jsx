import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Edit3,
  Send,
  CheckSquare,
  XCircle,
  ShieldAlert,
  Loader2,
  Info,
  ChevronRight,
  UserCheck,
  DollarSign,
  Building2,
  HelpCircle
} from 'lucide-react';

export default function NfseResilienceDashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modal de Avaliação & Correção
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('diagnosis'); // 'diagnosis' | 'edit' | 'history'
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Form State para Override de Payload
  const [formData, setFormData] = useState({
    tomador_nome: '',
    tomador_cpf_cnpj: '',
    tomador_email: '',
    valor_servico: '',
    discriminacao: '',
    manual_nfse_number: '',
    correction_notes: ''
  });

  useEffect(() => {
    fetchNfseEmissions();
  }, [statusFilter, categoryFilter]);

  const fetchNfseEmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('nfse_emissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('error_category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar emissões de NFS-e:', error);
      } else {
        setRecords(data || []);
      }
    } catch (err) {
      console.error('Exceção ao buscar NFS-e:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNfseEmissions();
  };

  const openCorrectionModal = (record) => {
    setSelectedRecord(record);
    setFormData({
      tomador_nome: record.tomador_nome || '',
      tomador_cpf_cnpj: record.tomador_cpf_cnpj || '',
      tomador_email: record.tomador_email || '',
      valor_servico: record.valor_servico ? String(record.valor_servico) : '',
      discriminacao: record.discriminacao || '',
      manual_nfse_number: '',
      correction_notes: record.correction_notes || ''
    });
    setModalTab('diagnosis');
    setActionMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (actionLoading) return;
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  // Reenviar com Payload Corrigido (update_and_retry)
  const handleUpdateAndRetry = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      const { data: userAuth } = await supabase.auth.getUser();
      const userId = userAuth?.user?.id;

      const { data, error } = await supabase.functions.invoke('emit-nfse', {
        body: {
          nfse_id: selectedRecord.id,
          action: 'update_and_retry',
          override_data: {
            tomador_nome: formData.tomador_nome,
            tomador_cpf_cnpj: formData.tomador_cpf_cnpj,
            tomador_email: formData.tomador_email,
            valor_servico: formData.valor_servico,
            discriminacao: formData.discriminacao,
          },
          correction_notes: formData.correction_notes,
          corrected_by: userId,
        }
      });

      if (error || data?.error) {
        const errMsg = error?.message || data?.error || 'Falha ao reprocessar NFS-e';
        setActionMessage({ type: 'error', text: `❌ Erro: ${errMsg}` });
      } else {
        setActionMessage({ type: 'success', text: `✅ NFS-e #${data?.nfse?.nfse_number || 'emitida'} processada com sucesso!` });
        setTimeout(() => {
          closeModal();
          fetchNfseEmissions();
        }, 1800);
      }
    } catch (err) {
      console.error('Erro na re-emissão:', err);
      setActionMessage({ type: 'error', text: `Exceção: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Retentativa Simples (retry)
  const handleSimpleRetry = async () => {
    if (!selectedRecord) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('emit-nfse', {
        body: {
          nfse_id: selectedRecord.id,
          action: 'retry'
        }
      });

      if (error || data?.error) {
        const errMsg = error?.message || data?.error || 'Re-tentativa rejeitada';
        setActionMessage({ type: 'error', text: `❌ Erro: ${errMsg}` });
      } else {
        setActionMessage({ type: 'success', text: '✅ Re-tentativa disparada com sucesso!' });
        setTimeout(() => {
          closeModal();
          fetchNfseEmissions();
        }, 1800);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: `Exceção: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Marcar como Resolvido Manualmente (mark_manual_resolved)
  const handleMarkManualResolved = async () => {
    if (!selectedRecord) return;
    if (!formData.manual_nfse_number.trim()) {
      setActionMessage({ type: 'error', text: 'Por favor, informe o número da NFS-e emitida manualmente na PBH.' });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    try {
      const { data: userAuth } = await supabase.auth.getUser();
      const userId = userAuth?.user?.id;

      const { data, error } = await supabase.functions.invoke('emit-nfse', {
        body: {
          nfse_id: selectedRecord.id,
          action: 'mark_manual_resolved',
          manual_nfse_number: formData.manual_nfse_number.trim(),
          correction_notes: formData.correction_notes || 'Emitida manualmente no portal da PBH BHISS Digital.',
          corrected_by: userId
        }
      });

      if (error || data?.error) {
        setActionMessage({ type: 'error', text: `❌ Erro: ${error?.message || data?.error}` });
      } else {
        setActionMessage({ type: 'success', text: '✅ Registro marcado como resolvida manualmente!' });
        setTimeout(() => {
          closeModal();
          fetchNfseEmissions();
        }, 1800);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: `Exceção: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Cálculos de Métricas KPIs
  const totalCount = records.length;
  const issuedCount = records.filter(r => r.status === 'issued' || r.status === 'manual_resolved').length;
  const validationErrorCount = records.filter(r => r.status === 'error' && r.error_category === 'VALIDATION_ERROR').length;
  const offlineErrorCount = records.filter(r => r.status === 'error' && (r.error_category === 'PREFEITURA_OFFLINE' || r.error_category === 'SYSTEM_ERROR')).length;
  const totalFailedAmount = records
    .filter(r => r.status === 'error')
    .reduce((sum, r) => sum + (Number(r.valor_servico) || 0), 0);

  // Filtragem de Busca no Client
  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.tomador_nome && r.tomador_nome.toLowerCase().includes(term)) ||
      (r.tomador_cpf_cnpj && r.tomador_cpf_cnpj.toLowerCase().includes(term)) ||
      (r.nfse_number && r.nfse_number.toLowerCase().includes(term)) ||
      (r.booking_id && r.booking_id.toLowerCase().includes(term)) ||
      (r.error_message && r.error_message.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Ações Globais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-800">Central de Resiliência Fiscal (NFS-e PBH)</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitoramento, avaliação, correção de dados do tomador e re-emissão de Notas Fiscais Eletrônicas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total NFS-e</p>
            <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Emitidas</p>
            <p className="text-2xl font-bold text-slate-800">{issuedCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Erro Dados/CPF</p>
            <p className="text-2xl font-bold text-amber-700">{validationErrorCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Prefeitura Offline</p>
            <p className="text-2xl font-bold text-rose-700">{offlineErrorCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor Retido</p>
            <p className="text-xl font-bold text-slate-800">
              R$ {totalFailedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Nome, CPF, NFS-e ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="error">Atenção / Erro ⚠️</option>
              <option value="issued">Emitidas 🟢</option>
              <option value="manual_resolved">Resolvida Manual 📝</option>
              <option value="processing">Processando ⏳</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
            <span>Categoria:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas</option>
              <option value="VALIDATION_ERROR">CPF / Dados (Validação)</option>
              <option value="PREFEITURA_OFFLINE">Prefeitura / WebService (Offline)</option>
              <option value="AUTH_ERROR">Autenticação</option>
              <option value="SYSTEM_ERROR">Sistema</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Principal de Emissões NFS-e */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            <p className="text-sm">Carregando dados fiscais da NFS-e...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300" />
            <p className="text-base font-semibold text-slate-600">Nenhum registro de NFS-e encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de pesquisa para visualizar outros registros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Data / Transação</th>
                  <th className="py-3.5 px-4">Tomador do Serviço</th>
                  <th className="py-3.5 px-4">Valor (R$)</th>
                  <th className="py-3.5 px-4">Status & Categoria</th>
                  <th className="py-3.5 px-4">Tentativas</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((record) => {
                  const isIssued = record.status === 'issued' || record.status === 'manual_resolved';
                  const isError = record.status === 'error';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Data & Transação */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {record.created_at ? new Date(record.created_at).toLocaleDateString('pt-BR') : '-'}
                          <span className="text-xs text-slate-400 font-normal ml-1">
                            {record.created_at ? new Date(record.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          ID: {record.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Tomador */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{record.tomador_nome || 'Paciente Doxologos'}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {record.tomador_cpf_cnpj ? `Doc: ${record.tomador_cpf_cnpj}` : <span className="text-rose-500 font-semibold">⚠️ CPF/CNPJ Ausente</span>}
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        R$ {Number(record.valor_servico || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status & Categoria */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {/* Badge de Status */}
                          {record.status === 'issued' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> NFS-e #{record.nfse_number}
                            </span>
                          )}

                          {record.status === 'manual_resolved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              <CheckSquare className="w-3 h-3" /> Resolvido Manual
                            </span>
                          )}

                          {record.status === 'error' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Rejeitado / Erro
                            </span>
                          )}

                          {record.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Clock className="w-3 h-3 animate-spin" /> Processando...
                            </span>
                          )}

                          {/* Badge de Categoria do Erro */}
                          {isError && (
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                              record.error_category === 'VALIDATION_ERROR' 
                                ? 'bg-amber-100 text-amber-800' 
                                : record.error_category === 'PREFEITURA_OFFLINE'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {record.error_category === 'VALIDATION_ERROR' ? '⚠️ CPF/Dados Incompletos' : 
                               record.error_category === 'PREFEITURA_OFFLINE' ? '📡 Instabilidade WebService PBH' : 
                               'Erro Interno'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tentativas */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {record.retry_count || 0} tentativa(s)
                        {record.last_retry_at && (
                          <div className="text-[11px] text-slate-400">
                            Última: {new Date(record.last_retry_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openCorrectionModal(record)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isError
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isError ? (
                            <>
                              <Edit3 className="w-3.5 h-3.5" /> Avaliar & Corrigir
                            </>
                          ) : (
                            <>
                              <Info className="w-3.5 h-3.5" /> Ver Detalhes
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Avaliação, Correção e Reenvio */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecalho do Modal */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold">Avaliação e Resiliência de NFS-e</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  ID: <span className="font-mono text-slate-300">{selectedRecord.id}</span> | Status: <span className="font-semibold uppercase text-emerald-400">{selectedRecord.status}</span>
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Alerta de Retorno da Ação */}
            {actionMessage && (
              <div className={`p-4 text-sm font-medium flex items-center gap-2 ${
                actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
              }`}>
                {actionMessage.text}
              </div>
            )}

            {/* Navegação de Abas do Modal */}
            <div className="flex border-b border-slate-100 bg-slate-50 px-6">
              <button
                onClick={() => setModalTab('diagnosis')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  modalTab === 'diagnosis'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>1. Diagnóstico do Erro</span>
              </button>

              <button
                onClick={() => setModalTab('edit')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  modalTab === 'edit'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Edit3 className="w-4 h-4 text-blue-500" />
                <span>2. Corrigir Dados do Tomador</span>
              </button>

              <button
                onClick={() => setModalTab('history')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  modalTab === 'history'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <span>3. Trilha de Auditoria</span>
              </button>
            </div>

            {/* Conteúdo do Modal por Aba */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* ABA 1: DIAGNÓSTICO DO ERRO */}
              {modalTab === 'diagnosis' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Motivo da Rejeição / Falha</h4>
                        <p className="text-sm text-amber-800 mt-1 font-medium">
                          {selectedRecord.error_message || 'Nenhuma mensagem detalhada capturada.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block font-medium">Categoria do Erro</span>
                      <span className="font-semibold text-slate-800 text-sm">{selectedRecord.error_category || 'SYSTEM_ERROR'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block font-medium">Tentativas Realizadas</span>
                      <span className="font-semibold text-slate-800 text-sm">{selectedRecord.retry_count || 0} tentativa(s)</span>
                    </div>
                  </div>

                  {/* Detalhes Técnicos RAW Response */}
                  {selectedRecord.raw_response && (
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Resposta RAW do WebService Prefeitura (Auditoria SOAP/JSON)
                      </span>
                      <pre className="p-3 bg-slate-900 text-emerald-400 text-xs font-mono rounded-xl overflow-x-auto max-h-40">
                        {JSON.stringify(selectedRecord.raw_response, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: EDITAR E CORRIGIR PAYLOAD */}
              {modalTab === 'edit' && (
                <form onSubmit={handleUpdateAndRetry} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Tomador / Paciente *</label>
                      <input
                        type="text"
                        required
                        value={formData.tomador_nome}
                        onChange={(e) => setFormData({ ...formData, tomador_nome: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">CPF / CNPJ do Tomador *</label>
                      <input
                        type="text"
                        required
                        placeholder="Somente números (11 para CPF, 14 para CNPJ)"
                        value={formData.tomador_cpf_cnpj}
                        onChange={(e) => setFormData({ ...formData, tomador_cpf_cnpj: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail do Tomador</label>
                      <input
                        type="email"
                        value={formData.tomador_email}
                        onChange={(e) => setFormData({ ...formData, tomador_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Valor do Serviço (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.valor_servico}
                        onChange={(e) => setFormData({ ...formData, valor_servico: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Discriminação dos Serviços (Texto Fiscal)</label>
                    <textarea
                      rows={3}
                      value={formData.discriminacao}
                      onChange={(e) => setFormData({ ...formData, discriminacao: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Justificativa da Correção (Audit Log)</label>
                    <input
                      type="text"
                      placeholder="Ex: CPF corrigido conforme documento oficial enviado pelo paciente."
                      value={formData.correction_notes}
                      onChange={(e) => setFormData({ ...formData, correction_notes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </form>
              )}

              {/* ABA 3: TRILHA DE AUDITORIA */}
              {modalTab === 'history' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-700 block">Criado em:</span>
                    <span className="text-slate-600">{new Date(selectedRecord.created_at).toLocaleString('pt-BR')}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-700 block">Última Atualização:</span>
                    <span className="text-slate-600">{new Date(selectedRecord.updated_at).toLocaleString('pt-BR')}</span>
                  </div>

                  {selectedRecord.correction_notes && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="font-semibold text-blue-900 block">Notas de Correção do Operador:</span>
                      <span className="text-blue-800">{selectedRecord.correction_notes}</span>
                    </div>
                  )}

                  {/* Resolução Manual Form */}
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <h5 className="font-bold text-slate-800 text-sm">Resolução Manual no Portal PBH</h5>
                    <p className="text-slate-500">
                      Se você já gerou a NFS-e manualmente no portal da prefeitura (`bhissdigital.pbh.gov.br`), digite o número da nota para finalizar este registro.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Número da Nota PBH (ex: 2026000123)"
                        value={formData.manual_nfse_number}
                        onChange={(e) => setFormData({ ...formData, manual_nfse_number: e.target.value })}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleMarkManualResolved}
                        disabled={actionLoading}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs transition-colors"
                      >
                        Marcar como Resolvido
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé e Ações do Modal */}
            <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Fechar
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSimpleRetry}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Re-tentar Envio Direto</span>
                </button>

                <button
                  type="button"
                  onClick={handleUpdateAndRetry}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-200 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Salvar & Reenviar à Prefeitura</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

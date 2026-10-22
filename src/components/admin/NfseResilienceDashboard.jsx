import React, { useState, useEffect } from 'react';
import {
  listNfseEmissions,
  listPendingNfseTransactions,
  emitSingleNfse,
  batchEmitNfse,
  retryNfseEmission,
  updateAndRetryNfseEmission,
  markNfseManualResolved,
  updateTomadorFiscalData,
  DEFAULT_NFSE_DISCRIMINACAO
} from '@/services/nfseService';
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
  HelpCircle,
  Zap,
  Check
} from 'lucide-react';

export default function NfseResilienceDashboard() {
  // Aba Ativa: 'pending' (Pendentes de Envio) ou 'history' (Histórico & Falhas PBH)
  const [activeTab, setActiveTab] = useState('pending');

  // Histórico de Emissões gravadas
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Transações Pendentes (Confirmadas/Completadas sem NFS-e)
  const [pendingRecords, setPendingRecords] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [selectedPendingIds, setSelectedPendingIds] = useState([]);
  const [emittingRowId, setEmittingRowId] = useState(null);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState(null);
  
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

  // Modal de Disparo Avulso (para transações históricas não capturadas)
  const [isManualEmitOpen, setIsManualEmitOpen] = useState(false);
  const [manualEmitData, setManualEmitData] = useState({ booking_id: '', package_id: '', payment_id: '' });
  const [manualEmitLoading, setManualEmitLoading] = useState(false);
  const [manualEmitMessage, setManualEmitMessage] = useState(null);

  useEffect(() => {
    fetchNfseEmissions();
    fetchPendingTransactions();
  }, [statusFilter, categoryFilter]);

  const fetchNfseEmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await listNfseEmissions({
        status: statusFilter,
        errorCategory: categoryFilter,
        pageSize: 200
      });

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

  const fetchPendingTransactions = async () => {
    setLoadingPending(true);
    try {
      const { data, error } = await listPendingNfseTransactions({ limit: 200 });
      if (error) {
        console.error('Erro ao buscar transações pendentes de NFS-e:', error);
      } else {
        setPendingRecords(data || []);
      }
    } catch (err) {
      console.error('Exceção ao buscar pendentes:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNfseEmissions();
    fetchPendingTransactions();
  };

  // Disparar NFS-e avulsa (para transações históricas não capturadas pelos bugs corrigidos)
  const handleManualEmit = async (e) => {
    e.preventDefault();
    setManualEmitLoading(true);
    setManualEmitMessage(null);
    try {
      const result = await emitSingleNfse(manualEmitData);
      if (!result.success) {
        setManualEmitMessage({ type: 'error', text: `❌ ${result.error}` });
      } else if (result.idempotent) {
        setManualEmitMessage({ type: 'success', text: `ℹ️ NFS-e já existia: #${result.nfse?.nfse_number || ''}` });
        setTimeout(() => { setIsManualEmitOpen(false); fetchNfseEmissions(); }, 2000);
      } else {
        setManualEmitMessage({ type: 'success', text: `✅ NFS-e ${result.nfse?.nfse_number || 'criada'} com sucesso!` });
        setTimeout(() => { setIsManualEmitOpen(false); fetchNfseEmissions(); }, 2000);
      }
    } catch (err) {
      setManualEmitMessage({ type: 'error', text: `Exceção: ${err.message}` });
    } finally {
      setManualEmitLoading(false);
    }
  };

  const formatCpfCnpj = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return digits
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
  };

  const openCorrectionModal = (record, isPending = false) => {
    setSelectedRecord({
      ...record,
      isPending
    });

    const doc = isPending
      ? (record.tomadorDocument && record.tomadorDocument !== 'Não informado' ? record.tomadorDocument : '')
      : (record.tomador_cpf_cnpj || '');

    const cleanDoc = doc.replace(/\D/g, '');
    const docType = cleanDoc.length === 14 ? 'CNPJ' : 'CPF';

    setFormData({
      tomador_id: isPending ? record.tomadorId : (record.tomador_id || record.professional_id || null),
      tomador_nome: isPending ? record.tomadorNome : (record.tomador_nome || ''),
      tomador_cpf_cnpj: doc ? formatCpfCnpj(doc) : '',
      tomador_doc_type: docType,
      tomador_email: isPending ? (record.tomadorEmail || '') : (record.tomador_email || ''),
      valor_servico: isPending ? String(record.valorServico) : (record.valor_servico ? String(record.valor_servico) : ''),
      valor_consulta: isPending ? String(record.valorConsulta) : '',
      discriminacao: isPending ? DEFAULT_NFSE_DISCRIMINACAO : (record.discriminacao || DEFAULT_NFSE_DISCRIMINACAO),
      manual_nfse_number: '',
      correction_notes: record.correction_notes || '',
      save_to_professional_profile: true
    });

    // Se for pendente, já abre direto na aba de edição. Se for erro da PBH, abre no diagnóstico.
    setModalTab(isPending ? 'edit' : 'diagnosis');
    setActionMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (actionLoading) return;
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  // Salvar apenas dados cadastrais do tomador na tabela professionals
  const handleSaveTomadorOnly = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedRecord) return;

    const cleanDoc = formData.tomador_cpf_cnpj.replace(/\D/g, '');
    if (!cleanDoc || (cleanDoc.length !== 11 && cleanDoc.length !== 14)) {
      setActionMessage({
        type: 'error',
        text: `Documento incompleto (${cleanDoc.length} dígitos). Digite 11 dígitos para CPF ou 14 para CNPJ.`
      });
      return;
    }

    const profId = formData.tomador_id || selectedRecord.tomadorId;
    if (!profId) {
      setActionMessage({ type: 'error', text: 'Identificador do profissional não encontrado.' });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await updateTomadorFiscalData({
        professionalId: profId,
        cpf: cleanDoc.length === 11 ? cleanDoc : null,
        cnpj: cleanDoc.length === 14 ? cleanDoc : null,
        name: formData.tomador_nome,
        email: formData.tomador_email
      });

      if (!res.success) {
        setActionMessage({ type: 'error', text: `❌ ${res.error}` });
      } else {
        setActionMessage({
          type: 'success',
          text: `✅ Dados do profissional ${formData.tomador_nome} salvos com sucesso! Todas as consultas deste psicólogo foram validadas.`
        });
        setTimeout(() => {
          closeModal();
          fetchPendingTransactions();
          fetchNfseEmissions();
        }, 1800);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: `Exceção: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Salvar cadastro e emitir NFS-e imediatamente para o item pendente
  const handleSaveAndEmitPending = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedRecord) return;

    const cleanDoc = formData.tomador_cpf_cnpj.replace(/\D/g, '');
    if (!cleanDoc || (cleanDoc.length !== 11 && cleanDoc.length !== 14)) {
      setActionMessage({
        type: 'error',
        text: `Documento incompleto (${cleanDoc.length} dígitos). Digite 11 dígitos para CPF ou 14 para CNPJ.`
      });
      return;
    }

    const profId = formData.tomador_id || selectedRecord.tomadorId;

    setActionLoading(true);
    setActionMessage(null);

    try {
      // 1. Atualizar cadastro do profissional se solicitado
      if (profId && formData.save_to_professional_profile) {
        const saveRes = await updateTomadorFiscalData({
          professionalId: profId,
          cpf: cleanDoc.length === 11 ? cleanDoc : null,
          cnpj: cleanDoc.length === 14 ? cleanDoc : null,
          name: formData.tomador_nome,
          email: formData.tomador_email
        });

        if (!saveRes.success) {
          setActionMessage({ type: 'error', text: `Falha ao salvar no cadastro: ${saveRes.error}` });
          setActionLoading(false);
          return;
        }
      }

      // 2. Disparar emissão com override_data
      const overrideData = {
        tomador_nome: formData.tomador_nome,
        tomador_cpf_cnpj: cleanDoc,
        tomador_email: formData.tomador_email,
        valor_servico: formData.valor_servico,
        discriminacao: formData.discriminacao
      };

      const emitRes = await emitSingleNfse({
        booking_id: selectedRecord.booking_id || selectedRecord.id,
        override_data: overrideData
      });

      if (!emitRes.success) {
        setActionMessage({ type: 'error', text: `❌ Rejeição na emissão da NFS-e: ${emitRes.error}` });
      } else {
        setActionMessage({
          type: 'success',
          text: `✅ NFS-e #${emitRes.nfse?.nfse_number || 'emitida'} processada com sucesso perante a prefeitura!`
        });
        setTimeout(() => {
          closeModal();
          fetchPendingTransactions();
          fetchNfseEmissions();
        }, 1800);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: `Exceção: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Reenviar com Payload Corrigido (update_and_retry)
  const handleUpdateAndRetry = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    const cleanDoc = formData.tomador_cpf_cnpj.replace(/\D/g, '');
    setActionLoading(true);
    setActionMessage(null);

    try {
      const profId = formData.tomador_id || selectedRecord.tomadorId;
      if (profId && formData.save_to_professional_profile && cleanDoc) {
        await updateTomadorFiscalData({
          professionalId: profId,
          cpf: cleanDoc.length === 11 ? cleanDoc : null,
          cnpj: cleanDoc.length === 14 ? cleanDoc : null,
          name: formData.tomador_nome,
          email: formData.tomador_email
        }).catch(err => console.warn('Aviso: erro ao sincronizar perfil:', err));
      }

      const overrideData = {
        tomador_nome: formData.tomador_nome,
        tomador_cpf_cnpj: cleanDoc || formData.tomador_cpf_cnpj,
        tomador_email: formData.tomador_email,
        valor_servico: formData.valor_servico,
        discriminacao: formData.discriminacao,
      };

      const result = await updateAndRetryNfseEmission(
        selectedRecord.id,
        overrideData,
        formData.correction_notes
      );

      if (!result.success) {
        setActionMessage({ type: 'error', text: `❌ Erro: ${result.error}` });
      } else {
        setActionMessage({ type: 'success', text: `✅ NFS-e #${result.nfse?.nfse_number || 'emitida'} processada com sucesso!` });
        setTimeout(() => {
          closeModal();
          fetchPendingTransactions();
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
      const result = await retryNfseEmission(selectedRecord.id);

      if (!result.success) {
        setActionMessage({ type: 'error', text: `❌ Erro: ${result.error}` });
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
      const result = await markNfseManualResolved(
        selectedRecord.id,
        formData.manual_nfse_number,
        formData.correction_notes
      );

      if (!result.success) {
        setActionMessage({ type: 'error', text: `❌ Erro: ${result.error}` });
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

  const pendingCount = pendingRecords.length;
  const pendingTotalAmount = pendingRecords.reduce((sum, p) => sum + (Number(p.valorServico) || 0), 0);
  const pendingWithValidDoc = pendingRecords.filter(p => p.hasValidDoc).length;

  // Helper: resolve origem do registro (booking / pacote / evento)
  const getOrigem = (record) => {
    if (record.package_id) return { label: 'Pacote', color: 'bg-violet-50 text-violet-700' };
    if (record.booking_id) return { label: 'Agendamento', color: 'bg-blue-50 text-blue-700' };
    if (record.inscricao_id) return { label: 'Evento', color: 'bg-orange-50 text-orange-700' };
    return { label: 'Avulso', color: 'bg-slate-100 text-slate-600' };
  };

  // Helper: badge de modo de emissão
  const getEmissionModeBadge = (mode) => {
    if (mode === 'production') return { label: '🟢 Produção', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    if (mode === 'manual') return { label: '✏️ Manual', color: 'bg-teal-50 text-teal-700 border border-teal-200' };
    return { label: '🔵 Sandbox', color: 'bg-blue-50 text-blue-600 border border-blue-200' };
  };

  // Filtragem de Busca no Client (Histórico)
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

  // Filtragem de Busca no Client (Pendentes)
  const filteredPending = pendingRecords.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.pacienteNome.toLowerCase().includes(term) ||
      p.tomadorNome.toLowerCase().includes(term) ||
      p.tomadorDocument.toLowerCase().includes(term) ||
      p.data.includes(term)
    );
  });

  // Emissão individual de item pendente
  const handleEmitSinglePending = async (item) => {
    if (!item.hasValidDoc) {
      openCorrectionModal(item, true);
      setActionMessage({
        type: 'error',
        text: `⚠️ O profissional ${item.tomadorNome} não possui CPF ou CNPJ cadastrado. Informe o documento para prosseguir com a emissão.`
      });
      return;
    }

    setEmittingRowId(item.id);
    setBatchFeedback(null);
    try {
      const res = await emitSingleNfse({ booking_id: item.id });
      if (!res.success) {
        setBatchFeedback({ type: 'error', text: `❌ Falha na emissão da NFS-e: ${res.error}` });
      } else {
        setBatchFeedback({
          type: 'success',
          text: res.idempotent
            ? `ℹ️ NFS-e já constava no histórico: #${res.nfse?.nfse_number || ''}`
            : `✅ NFS-e #${res.nfse?.nfse_number || ''} emitida com sucesso perante a prefeitura!`
        });
        fetchPendingTransactions();
        fetchNfseEmissions();
      }
    } catch (err) {
      setBatchFeedback({ type: 'error', text: `Exceção: ${err.message}` });
    } finally {
      setEmittingRowId(null);
    }
  };

  // Emissão em lote de itens pendentes com proteção para documentos ausentes
  const handleBatchEmitPending = async (emitAll = false) => {
    const targetList = emitAll ? pendingRecords : pendingRecords.filter(p => selectedPendingIds.includes(p.id));
    const validItems = targetList.filter(p => p.hasValidDoc);
    const missingCount = targetList.length - validItems.length;

    if (validItems.length === 0) {
      setBatchFeedback({
        type: 'error',
        text: '⚠️ Nenhum dos agendamentos selecionados possui CPF/CNPJ cadastrado. Clique no botão "Corrigir" na linha do profissional para preencher o documento.'
      });
      return;
    }

    if (missingCount > 0) {
      const confirmMsg = `Atenção: ${missingCount} das ${targetList.length} consultas selecionadas não possuem CPF/CNPJ e não podem ser emitidas. Deseja emitir agora as ${validItems.length} consultas que possuem documento válido?`;
      if (!window.confirm(confirmMsg)) return;
    }

    const ids = validItems.map(p => p.id);
    setBatchActionLoading(true);
    setBatchFeedback(null);
    try {
      const res = await batchEmitNfse(ids);
      if (!res.success) {
        setBatchFeedback({ type: 'error', text: `❌ Erro ao enfileirar lote: ${res.error}` });
      } else {
        setBatchFeedback({
          type: 'success',
          text: `✅ ${ids.length} notas com documento válido enfileiradas com sucesso! Processamento seguro em segundo plano.`
        });
        setSelectedPendingIds([]);
        setTimeout(() => {
          fetchPendingTransactions();
          fetchNfseEmissions();
        }, 1500);
      }
    } catch (err) {
      setBatchFeedback({ type: 'error', text: `Exceção: ${err.message}` });
    } finally {
      setBatchActionLoading(false);
    }
  };

  const toggleSelectAllPending = () => {
    if (selectedPendingIds.length === filteredPending.length) {
      setSelectedPendingIds([]);
    } else {
      setSelectedPendingIds(filteredPending.map(p => p.id));
    }
  };

  const toggleSelectPending = (id) => {
    setSelectedPendingIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
            Gestão completa de notas fiscais: envie pendências em lote, visualize histórico e corrija rejeições da prefeitura.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsManualEmitOpen(true); setManualEmitMessage(null); setManualEmitData({ booking_id: '', package_id: '', payment_id: '' }); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
          >
            <Send className="w-4 h-4 text-emerald-600" />
            <span>Disparar Avulsa (ID)</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-emerald-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Pendentes de Envio */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center gap-4 ${
            activeTab === 'pending'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pendentes de Envio</p>
            <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{pendingWithValidDoc} com documento OK</p>
          </div>
        </div>

        {/* Card 2: Emitidas PBH */}
        <div
          onClick={() => { setActiveTab('history'); setStatusFilter('issued'); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center gap-4 ${
            activeTab === 'history' && statusFilter === 'issued'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/30'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Emitidas (PBH)</p>
            <p className="text-2xl font-bold text-slate-800">{issuedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Homologadas</p>
          </div>
        </div>

        {/* Card 3: Erro Dados/CPF */}
        <div
          onClick={() => { setActiveTab('history'); setStatusFilter('error'); setCategoryFilter('VALIDATION_ERROR'); }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-200 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Erro Dados/CPF</p>
            <p className="text-2xl font-bold text-rose-700">{validationErrorCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Requer correção</p>
          </div>
        </div>

        {/* Card 4: Prefeitura Offline */}
        <div
          onClick={() => { setActiveTab('history'); setStatusFilter('error'); setCategoryFilter('PREFEITURA_OFFLINE'); }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-200 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Prefeitura Offline</p>
            <p className="text-2xl font-bold text-purple-700">{offlineErrorCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Retentativas ativas</p>
          </div>
        </div>

        {/* Card 5: Valor a Emitir */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor a Emitir</p>
            <p className="text-xl font-bold text-slate-800">
              R$ {pendingTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Taxa de plataforma</p>
          </div>
        </div>
      </div>

      {/* Banner de Feedback de Lote / Ação */}
      {batchFeedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm animate-in fade-in ${
          batchFeedback.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {batchFeedback.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            <span className="font-medium">{batchFeedback.text}</span>
          </div>
          <button
            onClick={() => setBatchFeedback(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Navegação por Abas: Pendentes vs Histórico */}
      <div className="flex border-b border-slate-200 gap-4 pt-2">
        <button
          type="button"
          onClick={() => { setActiveTab('pending'); setSearchTerm(''); }}
          className={`pb-3.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>1. Pendentes de Envio (Aguardando Emissão)</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('history'); setSearchTerm(''); }}
          className={`pb-3.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. Histórico & Falhas Registradas (PBH)</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {records.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: PENDENTES DE ENVIO (O QUE AINDA NÃO FOI ENVIADO)          */}
      {/* ============================================================== */}
      {activeTab === 'pending' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Barra de Ações em Lote e Busca das Pendentes */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por Paciente, Profissional, CPF ou Data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {pendingCount - pendingWithValidDoc > 0 && (
                <div className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{pendingCount - pendingWithValidDoc} com documento ausente</span>
                </div>
              )}

              {selectedPendingIds.length > 0 && (
                <button
                  onClick={() => handleBatchEmitPending(false)}
                  disabled={batchActionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {batchActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Emitir Selecionadas ({selectedPendingIds.length})</span>
                </button>
              )}

              {filteredPending.length > 0 && (
                <button
                  onClick={() => {
                    if (pendingWithValidDoc === 0) {
                      alert('Nenhum profissional possui CPF/CNPJ cadastrado. Clique em "Corrigir" para cadastrar os documentos antes de emitir em lote.');
                      return;
                    }
                    if (window.confirm(`Deseja enfileirar a emissão de NFS-e para as ${pendingWithValidDoc} transações que possuem documento válido?`)) {
                      handleBatchEmitPending(true);
                    }
                  }}
                  disabled={batchActionLoading || pendingWithValidDoc === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-emerald-200 transition-all disabled:opacity-50"
                >
                  {batchActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Emitir Validadas em Lote ({pendingWithValidDoc})</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Transações Pendentes */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingPending ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
                <p className="text-sm">Buscando transações confirmadas sem nota fiscal...</p>
              </div>
            ) : filteredPending.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500 stroke-1" />
                <p className="text-base font-semibold text-slate-700">Tudo em dia! Nenhuma transação pendente de NFS-e.</p>
                <p className="text-xs text-slate-400 mt-1">Todos os agendamentos confirmados já possuem nota emitida ou em processamento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedPendingIds.length > 0 && selectedPendingIds.length === filteredPending.length}
                          onChange={toggleSelectAllPending}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Data / Horário</th>
                      <th className="py-3 px-4">Tomador (Profissional)</th>
                      <th className="py-3 px-4">Paciente Atendido</th>
                      <th className="py-3 px-4 text-right">Consulta</th>
                      <th className="py-3 px-4 text-right">Taxa NFS-e</th>
                      <th className="py-3 px-4 text-center">Status Fiscal</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredPending.map(item => {
                      const isSelected = selectedPendingIds.includes(item.id);
                      const isEmittingThis = emittingRowId === item.id;

                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                          {/* Checkbox */}
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectPending(item.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* Data / Horário */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-slate-400">
                              {item.hora || 'Horário agendado'} • {item.tipoLabel}
                            </div>
                          </td>

                          {/* Tomador (Profissional) */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{item.tomadorNome}</div>
                            <div className="text-xs mt-1">
                              {item.hasValidDoc ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-emerald-700 font-mono flex items-center gap-1 font-semibold">
                                    <Check className="w-3 h-3 text-emerald-600" /> Doc: {item.tomadorDocument}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openCorrectionModal(item, true)}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                    title="Editar dados fiscais do tomador"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openCorrectionModal(item, true)}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer group shadow-sm shadow-rose-100"
                                  title="Clique aqui para cadastrar o CPF/CNPJ do profissional"
                                >
                                  <span>⚠️ CPF/CNPJ Ausente</span>
                                  <Edit3 className="w-3 h-3 text-rose-500 group-hover:scale-110 transition-transform" />
                                  <span className="text-[10px] text-rose-600 underline font-normal">Corrigir</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Paciente */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{item.pacienteNome}</div>
                            <div className="text-xs text-slate-400">{item.pacienteEmail || item.servicoNome}</div>
                          </td>

                          {/* Valor da Consulta */}
                          <td className="py-3 px-4 text-right font-medium text-slate-600">
                            R$ {Number(item.valorConsulta).toFixed(2)}
                          </td>

                          {/* Taxa da Plataforma (Valor da NFS-e) */}
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            R$ {Number(item.valorServico).toFixed(2)}
                          </td>

                          {/* Status Fiscal */}
                          <td className="py-3 px-4 text-center">
                            {item.statusFiscal === 'error' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" /> Falha Anterior
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" /> Não Emitida
                              </span>
                            )}
                          </td>

                          {/* Ações: Corrigir / Emitir NFS-e */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCorrectionModal(item, true)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                  !item.hasValidDoc
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Corrigir ou editar dados cadastrais do tomador"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{!item.hasValidDoc ? 'Corrigir' : 'Editar'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEmitSinglePending(item)}
                                disabled={isEmittingThis || batchActionLoading}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                                  !item.hasValidDoc
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-400 border border-slate-200 cursor-pointer'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200'
                                }`}
                                title={!item.hasValidDoc ? 'Clique para preencher o CPF/CNPJ antes de emitir' : 'Emitir NFS-e perante a PBH'}
                              >
                                {isEmittingThis ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Emitindo...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" /> Emitir NFS-e
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: HISTÓRICO & FALHAS REGISTRADAS (PBH)                      */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
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

          {/* Tabela de Emissões NFS-e (Histórico) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
                <p className="text-sm">Carregando dados fiscais da NFS-e...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300" />
                <p className="text-base font-semibold text-slate-600">Nenhum registro de NFS-e encontrado no histórico</p>
                <p className="text-xs text-slate-400 mt-1">
                  Selecione a aba <strong>"1. Pendentes de Envio"</strong> para disparar as primeiras notas das consultas confirmadas.
                </p>
              </div>
            ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Data / Transação</th>
                  <th className="py-3.5 px-4">Tomador (Profissional)</th>
                  <th className="py-3.5 px-4">Valor (R$)</th>
                  <th className="py-3.5 px-4">Status & Categoria</th>
                  <th className="py-3.5 px-4">Origem / Modo</th>
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
                        <div className="font-medium text-slate-900">{record.tomador_nome || 'Profissional Não Identificado'}</div>
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
                               record.error_category === 'AUTH_ERROR' ? '🔒 Erro de Autenticação PBH' :
                               'Erro Interno'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Origem & Modo de Emissão — coluna adicionada */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const origem = getOrigem(record);
                          const modoBadge = getEmissionModeBadge(record.emission_mode);
                          return (
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${origem.color}`}>
                                {origem.label}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${modoBadge.color}`}>
                                {modoBadge.label}
                              </span>
                            </div>
                          );
                        })()}
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
    </div>
  )}

  {/* Modal de Avaliação, Correção e Reenvio */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecalho do Modal */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold">
                    {selectedRecord.isPending
                      ? 'Preenchimento & Correção Fiscal do Tomador'
                      : 'Avaliação e Resiliência de NFS-e'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedRecord.isPending ? (
                    <>
                      Consulta em <span className="text-slate-200 font-semibold">{selectedRecord.data}</span> ({selectedRecord.hora}) • Paciente: <span className="text-slate-200">{selectedRecord.pacienteNome}</span> • Taxa: <span className="text-emerald-400 font-bold">R$ {Number(selectedRecord.valorServico).toFixed(2)}</span>
                    </>
                  ) : (
                    <>
                      ID: <span className="font-mono text-slate-300">{selectedRecord.id}</span> | Status: <span className="font-semibold uppercase text-emerald-400">{selectedRecord.status}</span>
                    </>
                  )}
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
              {selectedRecord.isPending ? (
                <>
                  <button
                    onClick={() => setModalTab('edit')}
                    className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                      modalTab === 'edit'
                        ? 'border-emerald-600 text-emerald-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 text-blue-500" />
                    <span>1. Dados Fiscais do Tomador</span>
                  </button>

                  <button
                    onClick={() => setModalTab('diagnosis')}
                    className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                      modalTab === 'diagnosis'
                        ? 'border-emerald-600 text-emerald-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Info className="w-4 h-4 text-emerald-600" />
                    <span>2. Orientações Fiscais</span>
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Conteúdo do Modal por Aba */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* ABA DIAGNÓSTICO / ORIENTAÇÕES */}
              {modalTab === 'diagnosis' && (
                <div className="space-y-4">
                  {selectedRecord.isPending ? (
                    <>
                      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-blue-900">Modelo Fiscal Doxologos (Opção B)</h4>
                            <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                              A Doxologos atua como intermediadora de tecnologia. A nota fiscal municipal (NFS-e PBH) refere-se à taxa de intermediação retida pela plataforma, tendo o <strong>psicólogo como tomador do serviço</strong>.
                              O paciente recebe o recibo de atendimento clínico diretamente do profissional.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block font-medium">Situação do Documento</span>
                          <span className="font-semibold text-slate-800 text-sm">
                            {selectedRecord.hasValidDoc ? '✓ Documento Válido' : '⚠️ CPF/CNPJ Ausente'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block font-medium">Taxa da Plataforma (Base da Nota)</span>
                          <span className="font-semibold text-emerald-700 text-sm">
                            R$ {Number(selectedRecord.valorServico).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}

              {/* ABA EDITAR E CORRIGIR PAYLOAD */}
              {modalTab === 'edit' && (
                <div className="space-y-4">
                  {selectedRecord.isPending && !selectedRecord.hasValidDoc && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900">
                        <span className="font-bold">CPF ou CNPJ ausente para este profissional.</span>
                        <p className="text-amber-800 mt-0.5">
                          A Prefeitura de Belo Horizonte (BHISS) exige documento válido do tomador para emitir o RPS/NFS-e. Preencha o CPF ou CNPJ abaixo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Seletor Tipo de Documento */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700">Tipo de Documento:</span>
                    <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tomador_doc_type: 'CPF' }))}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          formData.tomador_doc_type === 'CPF'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        CPF (Pessoa Física)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tomador_doc_type: 'CNPJ' }))}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          formData.tomador_doc_type === 'CNPJ'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        CNPJ (Pessoa Jurídica)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Profissional / Tomador *</label>
                      <input
                        type="text"
                        required
                        value={formData.tomador_nome}
                        onChange={(e) => setFormData({ ...formData, tomador_nome: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          {formData.tomador_doc_type === 'CNPJ' ? 'CNPJ do Profissional *' : 'CPF do Profissional *'}
                        </label>
                        {(() => {
                          const clean = (formData.tomador_cpf_cnpj || '').replace(/\D/g, '');
                          if (clean.length === 11) {
                            return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">✓ 11 dígitos (CPF)</span>;
                          }
                          if (clean.length === 14) {
                            return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">✓ 14 dígitos (CNPJ)</span>;
                          }
                          if (clean.length > 0) {
                            return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">⚠️ Incompleto ({clean.length} dígitos)</span>;
                          }
                          return <span className="text-[11px] text-rose-600 font-semibold">Obrigatório</span>;
                        })()}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder={formData.tomador_doc_type === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                        value={formData.tomador_cpf_cnpj}
                        onChange={(e) => setFormData({ ...formData, tomador_cpf_cnpj: formatCpfCnpj(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail do Profissional</label>
                      <input
                        type="email"
                        placeholder="contato@psicologo.com.br"
                        value={formData.tomador_email}
                        onChange={(e) => setFormData({ ...formData, tomador_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da Taxa da Plataforma (NFS-e R$) *</label>
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

                  {/* Checkbox de sincronização com cadastro do profissional */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.save_to_professional_profile)}
                        onChange={(e) => setFormData({ ...formData, save_to_professional_profile: e.target.checked })}
                        className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-emerald-950">Salvar no cadastro permanente do profissional (Recomendado)</span>
                        <p className="text-slate-600 mt-0.5">
                          Grava o CPF/CNPJ de <strong>{formData.tomador_nome || 'este profissional'}</strong> na tabela de psicólogos. Todas as consultas dele serão validadas e atualizadas no painel de uma só vez!
                        </p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Discriminação dos Serviços (Texto Fiscal)</label>
                    <textarea
                      rows={2}
                      value={formData.discriminacao}
                      onChange={(e) => setFormData({ ...formData, discriminacao: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      🔒 Sigilo Clínico: Jamais inclua nomes de diagnósticos, CIDs ou dados de prontuário neste campo.
                    </p>
                  </div>

                  {!selectedRecord.isPending && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Justificativa da Correção (Audit Log)</label>
                      <input
                        type="text"
                        placeholder="Ex: CPF corrigido conforme documento oficial enviado pelo profissional."
                        value={formData.correction_notes}
                        onChange={(e) => setFormData({ ...formData, correction_notes: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ABA TRILHA DE AUDITORIA */}
              {modalTab === 'history' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-700 block">Criado em:</span>
                    <span className="text-slate-600">{new Date(selectedRecord.created_at || Date.now()).toLocaleString('pt-BR')}</span>
                  </div>

                  {selectedRecord.updated_at && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-semibold text-slate-700 block">Última Atualização:</span>
                      <span className="text-slate-600">{new Date(selectedRecord.updated_at).toLocaleString('pt-BR')}</span>
                    </div>
                  )}

                  {selectedRecord.correction_notes && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="font-semibold text-blue-900 block">Notas de Correção do Operador:</span>
                      <span className="text-blue-800">{selectedRecord.correction_notes}</span>
                    </div>
                  )}

                  {/* Resolução Manual Form para registros com erro */}
                  {!selectedRecord.isPending && (
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
                  )}
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
                Cancelar
              </button>

              {selectedRecord.isPending ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveTomadorOnly}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                    <span>Salvar no Cadastro</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndEmitPending}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-200 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Salvar & Emitir NFS-e Agora</span>
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Disparo Avulso — reprocessar transações históricas */}
      {isManualEmitOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Disparar NFS-e Avulsa</h3>
              </div>
              <button onClick={() => setIsManualEmitOpen(false)} disabled={manualEmitLoading}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm">✕</button>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-500 mb-4">
                Use para reprocessar transações históricas que não tiveram NFS-e gerada automaticamente. Informe ao menos um identificador.
              </p>

              {manualEmitMessage && (
                <div className={`p-3 rounded-xl text-sm font-medium mb-4 ${
                  manualEmitMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>{manualEmitMessage.text}</div>
              )}

              <form onSubmit={handleManualEmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Booking ID (UUID)</label>
                  <input type="text" value={manualEmitData.booking_id} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    onChange={e => setManualEmitData({ ...manualEmitData, booking_id: e.target.value.trim() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Package ID (UUID)</label>
                  <input type="text" value={manualEmitData.package_id} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    onChange={e => setManualEmitData({ ...manualEmitData, package_id: e.target.value.trim() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment ID (UUID)</label>
                  <input type="text" value={manualEmitData.payment_id} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    onChange={e => setManualEmitData({ ...manualEmitData, payment_id: e.target.value.trim() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button type="button" onClick={() => setIsManualEmitOpen(false)} disabled={manualEmitLoading}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={manualEmitLoading}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                    {manualEmitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Disparar NFS-e
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

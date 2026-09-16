import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Download,
  RefreshCw,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchAssessmentLeads,
  updateAssessmentLeadStatus,
  generateWhatsAppLeadLink,
  exportLeadsToCsv,
} from '@/lib/assessmentService';

const getSeverityBadge = (severity) => {
  switch (severity) {
    case 'severe':
      return { label: 'Severa', bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' };
    case 'moderate':
      return { label: 'Moderada', bg: 'bg-amber-100 text-amber-900 border-amber-200', dot: 'bg-amber-500' };
    case 'mild':
      return { label: 'Leve', bg: 'bg-sky-100 text-sky-800 border-sky-200', dot: 'bg-sky-500' };
    case 'minimal':
      return { label: 'Mínima', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
    default:
      return { label: 'Outro', bg: 'bg-gray-100 text-gray-800 border-gray-200', dot: 'bg-gray-400' };
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'novo':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'contatado':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'agendou':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'descartado':
    case 'sem_interesse':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const AssessmentLeadsSection = ({ currentUserId }) => {
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isUpdating, setIsUpdating] = useState(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAssessmentLeads({
        status: selectedStatus,
        severity: selectedSeverity,
        searchTerm,
      });

      if (res.success) {
        setLeads(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar leads',
        description: 'Não foi possível carregar a lista de leads.',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedSeverity, searchTerm, toast]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = leads.length;
    const severe = leads.filter((l) => l.severity === 'severe').length;
    const moderate = leads.filter((l) => l.severity === 'moderate').length;
    const novos = leads.filter((l) => l.status === 'novo' || !l.status).length;
    const agendados = leads.filter((l) => l.status === 'agendou').length;

    return { total, severe, moderate, novos, agendados };
  }, [leads]);

  const handleStatusChange = async (leadId, newStatus) => {
    setIsUpdating(leadId);
    try {
      const res = await updateAssessmentLeadStatus({
        leadId,
        status: newStatus,
        userId: currentUserId,
      });

      if (res.success) {
        setLeads((prev) =>
          prev.map((item) => (item.id === leadId ? { ...item, status: newStatus } : item))
        );
        toast({
          title: 'Status atualizado',
          description: `Lead marcado como "${newStatus}".`,
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status.',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleExport = () => {
    if (leads.length === 0) {
      toast({
        title: 'Nenhum lead para exportar',
        description: 'Ajuste os filtros ou aguarde novas respostas.',
      });
      return;
    }
    exportLeadsToCsv(leads);
    toast({
      title: 'Exportação iniciada',
      description: 'O arquivo CSV foi baixado com sucesso.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#2d8659]" />
            <span>Leads & Autoavaliações Psicométricas</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Acompanhe usuários que realizaram testes clínicos, priorize acolhimento para casos severos e acione via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLeads}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 border-emerald-200 hover:bg-emerald-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas em Linha */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Total de Leads</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 shadow-xs">
          <div className="text-xs font-bold text-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Casos Severos
          </div>
          <div className="text-2xl font-extrabold text-rose-900 mt-1">{stats.severe}</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-xs">
          <div className="text-xs font-bold text-amber-800">Casos Moderados</div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">{stats.moderate}</div>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 shadow-xs">
          <div className="text-xs font-bold text-blue-800">Novos (A Fazer)</div>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">{stats.novos}</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs font-bold text-emerald-800 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Agendaram
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 mt-1">{stats.agendados}</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#2d8659]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-[#2d8659]"
          >
            <option value="all">Todas as Gravidades</option>
            <option value="severe">🚨 Gravidade Severa / Crítica</option>
            <option value="moderate">⚠️ Gravidade Moderada</option>
            <option value="mild">Gravidade Leve</option>
            <option value="minimal">Mínima / Saudável</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-[#2d8659]"
          >
            <option value="all">Todos os Status</option>
            <option value="novo">Novo</option>
            <option value="contatado">Contatado</option>
            <option value="agendou">Agendou</option>
            <option value="descartado">Descartado</option>
          </select>
        </div>
      </div>


      {/* Tabela de Leads */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#2d8659]" />
            <span>Carregando leads psicométricos...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700">Nenhum lead encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Ajuste os filtros de busca acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4">Avaliação / Score</th>
                  <th className="py-3 px-4">Gravidade</th>
                  <th className="py-3 px-4">Status / CRM</th>
                  <th className="py-3 px-4 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => {
                  const severityBadge = getSeverityBadge(lead.severity);
                  const waLink = generateWhatsAppLeadLink({
                    patientName: lead.patient_name,
                    patientPhone: lead.patient_phone,
                    severity: lead.severity,
                    assessmentTitle: lead.assessment_title,
                    score: lead.score,
                  });

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Data */}
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>

                      {/* Paciente */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{lead.patient_name || 'Anônimo'}</div>
                        {lead.patient_email && (
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>{lead.patient_email}</span>
                          </div>
                        )}
                      </td>

                      {/* Contato Telefone */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {lead.patient_phone ? (
                          <span className="font-medium text-gray-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {lead.patient_phone}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Não informado</span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">{lead.assessment_id?.toUpperCase() || 'GAD-7'}</div>
                        <div className="text-xs text-gray-500">
                          Pontuação: <strong className="text-gray-900">{lead.score}</strong>/{lead.max_score || 21}
                        </div>
                      </td>

                      {/* Gravidade */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${severityBadge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${severityBadge.dot}`} />
                          {severityBadge.label}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={lead.status || 'novo'}
                          disabled={isUpdating === lead.id}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getStatusBadge(lead.status)}`}
                        >
                          <option value="novo">Novo</option>
                          <option value="contatado">Contatado</option>
                          <option value="agendou">Agendou</option>
                          <option value="sem_interesse">Sem Interesse</option>
                          <option value="descartado">Descartado</option>
                        </select>
                      </td>

                      {/* Ação WhatsApp 1-Click */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (lead.status === 'novo') {
                                handleStatusChange(lead.id, 'contatado');
                              }
                            }}
                            className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
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
  );
};

export default AssessmentLeadsSection;

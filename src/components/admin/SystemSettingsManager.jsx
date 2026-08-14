import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  DollarSign,
  Clock,
  AlertTriangle,
  Check,
  RotateCcw,
  ShieldCheck,
  Save,
  Bell,
  Building2,
  FileText,
  AlertOctagon,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { auditLogger, AuditAction, LogLevel } from '@/lib/auditLogger';

export const DEFAULT_SYSTEM_PARAMETERS = {
  // 1. Políticas Financeiras
  platform_default_retention_pct: 40,
  mp_estimated_gateway_fee_pct: 2.99,
  nfse_estimated_tax_rate_pct: 6.00,

  // 2. Cancelamentos e Multas
  cancellation_min_hours_notice: 24,
  cancellation_late_patient_retention_pct: 20,
  reschedule_min_hours_notice: 12,

  // 3. Matriz SLA de Expiração PIX
  express_booking_tolerance_minutes: 15,
  nextday_booking_tolerance_minutes: 30,
  standard_booking_tolerance_minutes: 60,

  // 4. Operação e Comunicação
  default_appointment_duration_minutes: 50,
  professional_monthly_capacity_slots: 80,
  whatsapp_reminders_enabled: true
};

// Dicionário de Metadados de Impacto e Nível de Risco por Parâmetro
export const PARAMETER_METADATA = {
  platform_default_retention_pct: {
    label: 'Taxa de Retenção Padrão Doxologos',
    category: 'Financeiro',
    flows: 'Cálculo de repasse aos psicólogos em novos serviços e projeção de receita líquida da clínica.',
    risk: 'CRITICAL',
    riskLabel: 'Alto / Crítico',
    unit: '%'
  },
  mp_estimated_gateway_fee_pct: {
    label: 'Taxa Gateway (Mercado Pago)',
    category: 'Financeiro',
    flows: 'DRE Gerencial e estimativa de deduções de taxas de cartão/PIX.',
    risk: 'MEDIUM',
    riskLabel: 'Médio',
    unit: '%'
  },
  nfse_estimated_tax_rate_pct: {
    label: 'Provisão Fiscal (NFS-e / Simples)',
    category: 'Financeiro',
    flows: 'DRE Gerencial e cálculo de margem operacional após impostos.',
    risk: 'MEDIUM',
    riskLabel: 'Médio',
    unit: '%'
  },
  cancellation_min_hours_notice: {
    label: 'Antecedência Mínima p/ Cancelamento Integral',
    category: 'Políticas de Cancelamento',
    flows: 'Validação de crédito/reembolso ao paciente durante solicitações de cancelamento.',
    risk: 'HIGH',
    riskLabel: 'Alto',
    unit: 'horas'
  },
  cancellation_late_patient_retention_pct: {
    label: 'Retenção por Cancelamento Tardio',
    category: 'Políticas de Cancelamento',
    flows: 'Percentual cobrado/retido do paciente em solicitações tardias (< 24h).',
    risk: 'HIGH',
    riskLabel: 'Alto',
    unit: '%'
  },
  reschedule_min_hours_notice: {
    label: 'Antecedência p/ Reagendamento Sem Custo',
    category: 'Políticas de Cancelamento',
    flows: 'Trava do botão de alteração de horário na área do paciente.',
    risk: 'MEDIUM',
    riskLabel: 'Médio',
    unit: 'horas'
  },
  express_booking_tolerance_minutes: {
    label: 'SLA Expiração PIX Express (< 3h)',
    category: 'SLA Checkout PIX',
    flows: 'Contador regressivo e descarte on-the-fly de reservas urgentes na agenda do psicólogo.',
    risk: 'HIGH',
    riskLabel: 'Alto',
    unit: 'minutos'
  },
  nextday_booking_tolerance_minutes: {
    label: 'SLA Expiração PIX Próximo Dia (3h-24h)',
    category: 'SLA Checkout PIX',
    flows: 'Tempo de expiração do QR Code PIX Mercado Pago e retenção provisória da agenda.',
    risk: 'MEDIUM',
    riskLabel: 'Médio',
    unit: 'minutos'
  },
  standard_booking_tolerance_minutes: {
    label: 'SLA Expiração PIX Padrão (> 24h)',
    category: 'SLA Checkout PIX',
    flows: 'Janela de pagamento de consultas agendadas com antecedência.',
    risk: 'LOW',
    riskLabel: 'Baixo',
    unit: 'minutos'
  },
  default_appointment_duration_minutes: {
    label: 'Duração Padrão da Consulta',
    category: 'Operação',
    flows: 'Duração sugerida no cadastro de novos serviços de psicologia.',
    risk: 'LOW',
    riskLabel: 'Baixo',
    unit: 'minutos'
  },
  professional_monthly_capacity_slots: {
    label: 'Capacidade Estimada Vagas/Mês',
    category: 'Operação',
    flows: 'Cálculo de taxa de ocupação das agendas no Cockpit Executivo.',
    risk: 'LOW',
    riskLabel: 'Baixo',
    unit: 'vagas/mês'
  },
  whatsapp_reminders_enabled: {
    label: 'Lembretes WhatsApp',
    category: 'Comunicação',
    flows: 'Disparo automático de mensagens de confirmação e alerta aos pacientes.',
    risk: 'MEDIUM',
    riskLabel: 'Médio',
    unit: ''
  }
};

export function SystemSettingsManager({ userRole = 'admin' }) {
  const { settings, updateSetting, loading } = useSystemSettings();
  const { toast } = useToast();

  // Rascunho local para salvamento intencional (Sem auto-save no blur)
  const [draftSettings, setDraftSettings] = useState({});
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar rascunho quando as configurações do banco forem carregadas
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      const merged = { ...DEFAULT_SYSTEM_PARAMETERS, ...settings };
      setDraftSettings(merged);
    }
  }, [settings]);

  // Identificar lista de parâmetros alterados
  const changedParameters = useMemo(() => {
    const changes = [];
    Object.keys(DEFAULT_SYSTEM_PARAMETERS).forEach(key => {
      const dbValue = settings[key] !== undefined ? settings[key] : DEFAULT_SYSTEM_PARAMETERS[key];
      const draftValue = draftSettings[key] !== undefined ? draftSettings[key] : DEFAULT_SYSTEM_PARAMETERS[key];

      if (String(dbValue) !== String(draftValue)) {
        const meta = PARAMETER_METADATA[key] || {
          label: key,
          category: 'Geral',
          flows: 'Alteração em parâmetro do sistema.',
          risk: 'MEDIUM',
          riskLabel: 'Médio',
          unit: ''
        };

        changes.push({
          key,
          oldValue: dbValue,
          newValue: draftValue,
          meta
        });
      }
    });
    return changes;
  }, [settings, draftSettings]);

  const hasChanges = changedParameters.length > 0;

  // Atualizar rascunho local sem disparar salva automática
  const handleDraftChange = (key, value) => {
    setDraftSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Cancelar rascunho e restaurar valores do banco
  const handleDiscardChanges = () => {
    const merged = { ...DEFAULT_SYSTEM_PARAMETERS, ...settings };
    setDraftSettings(merged);
    toast({ title: 'Rascunho descartado', description: 'Os parâmetros retornaram aos valores atuais registrados.' });
  };

  // Gravação Intencional após confirmação no Modal de Impacto
  const handleConfirmAndSaveAll = async () => {
    if (userRole !== 'admin') {
      toast({ variant: 'destructive', title: 'Acesso negado', description: 'Apenas administradores podem alterar parâmetros.' });
      return;
    }

    if (changedParameters.length === 0) return;

    setIsSaving(true);
    try {
      for (const item of changedParameters) {
        const { error } = await updateSetting(item.key, item.newValue);
        if (error) throw error;

        // Inserir Log de Auditoria Crítica para cada parâmetro intencionalmente gravado
        await auditLogger.log(AuditAction.ADMIN_SETTINGS_CHANGE, {
          level: LogLevel.CRITICAL,
          resourceType: 'system_setting',
          resourceId: item.key,
          details: {
            setting_label: item.meta.label,
            key: item.key,
            old_value: item.oldValue,
            new_value: item.newValue,
            risk_level: item.meta.risk,
            impact_flows: item.meta.flows,
            timestamp: new Date().toISOString()
          }
        });
      }

      toast({
        title: '🎉 Parâmetros Gravados com Sucesso!',
        description: `${changedParameters.length} parâmetro(s) atualizados com confirmação intencional e salvos no log de auditoria.`,
      });

      setIsImpactModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar parâmetros intencionais:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao Gravar',
        description: err.message || 'Não foi possível gravar os parâmetros.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d8659]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#2d8659]/10 text-[#2d8659] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Central de Parâmetros Globais (Gravação Intencional)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Configurações & Regras da Plataforma
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ajuste rascunhos de taxas, regras de cancelamento e SLA PIX. As alterações exigem **avaliação de impacto e confirmação intencional com auditoria**.
          </p>
        </div>

        {hasChanges && (
          <Button
            onClick={() => setIsImpactModalOpen(true)}
            className="bg-[#2d8659] hover:bg-[#236b47] text-white font-bold shadow-md transition-all text-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Avaliar Impacto & Gravar ({changedParameters.length})
          </Button>
        )}
      </div>

      {/* BLOCO 1: POLÍTICAS FINANCEIRAS E RETENÇÃO */}
      <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#2d8659] flex items-center justify-center font-bold">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">1. Políticas Financeiras & DRE</h3>
            <p className="text-xs text-slate-500">Taxas de retenção padrão da plataforma e provisões de custos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Item 1: Retenção Padrão Doxologos */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Retenção Padrão Doxologos</label>
              <p className="text-[11px] text-slate-500">Taxa da clínica quando não houver repasse customizado (Repasse Psicólogo = {100 - Number(draftSettings.platform_default_retention_pct || 40)}%).</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={draftSettings.platform_default_retention_pct ?? 40}
                onChange={(e) => handleDraftChange('platform_default_retention_pct', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-sm font-bold text-slate-600">%</span>
            </div>
          </div>

          {/* Item 2: Taxa Estimada Mercado Pago */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Taxa Gateway (Mercado Pago)</label>
              <p className="text-[11px] text-slate-500">Custo estimado de processamento de cartão/PIX para relatórios de DRE.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="20"
                step="0.01"
                value={draftSettings.mp_estimated_gateway_fee_pct ?? 2.99}
                onChange={(e) => handleDraftChange('mp_estimated_gateway_fee_pct', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-sm font-bold text-slate-600">%</span>
            </div>
          </div>

          {/* Item 3: Provisão Impostos NFS-e */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Provisão Fiscal (Simples/NFS-e)</label>
              <p className="text-[11px] text-slate-500">Alíquota estimada de imposto de renda/NFS-e aplicada na DRE.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={draftSettings.nfse_estimated_tax_rate_pct ?? 6.00}
                onChange={(e) => handleDraftChange('nfse_estimated_tax_rate_pct', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-sm font-bold text-slate-600">%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* BLOCO 2: CANCELAMENTOS, REAGENDAMENTOS E MULTAS */}
      <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">2. Cancelamentos, Reagendamentos & Multas</h3>
            <p className="text-xs text-slate-500">Regras de antecedência mínima e retenção por cancelamento tardio.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Item 1: Antecedência Mínima p/ Cancelar c/ Crédito */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Antecedência Mínima p/ Reembolso</label>
              <p className="text-[11px] text-slate-500">Prazo em horas antes da consulta para o paciente ter direito a 100% de crédito.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="168"
                value={draftSettings.cancellation_min_hours_notice ?? 24}
                onChange={(e) => handleDraftChange('cancellation_min_hours_notice', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-xs font-bold text-slate-600">horas</span>
            </div>
          </div>

          {/* Item 2: Multa p/ Cancelamento Tardio Paciente */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Retenção por Cancelamento Tardio</label>
              <p className="text-[11px] text-slate-500">Multa retida pela plataforma em cancelamentos em cima da hora pelo paciente.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={draftSettings.cancellation_late_patient_retention_pct ?? 20}
                onChange={(e) => handleDraftChange('cancellation_late_patient_retention_pct', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-sm font-bold text-slate-600">%</span>
            </div>
          </div>

          {/* Item 3: Antecedência Mínima p/ Reagendar */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Antecedência p/ Reagendamento</label>
              <p className="text-[11px] text-slate-500">Prazo mínimo em horas para alterar a data da consulta sem penalidade.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="72"
                value={draftSettings.reschedule_min_hours_notice ?? 12}
                onChange={(e) => handleDraftChange('reschedule_min_hours_notice', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-xs font-bold text-slate-600">horas</span>
            </div>
          </div>
        </div>
      </Card>

      {/* BLOCO 3: MATRIZ DE TOLERÂNCIA E EXPIRAÇÃO PIX (SLA) */}
      <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">3. Matriz SLA de Expiração de Pagamentos PIX</h3>
            <p className="text-xs text-slate-500">Tempo limite de retenção provisória de vaga na agenda durante o checkout.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Item 1: Express (<3h) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Consulta Express (&lt; 3h)</label>
              <p className="text-[11px] text-slate-500">Tempo para concluir o PIX quando a consulta ocorre hoje.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="5"
                max="60"
                value={draftSettings.express_booking_tolerance_minutes ?? 15}
                onChange={(e) => handleDraftChange('express_booking_tolerance_minutes', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-xs font-bold text-slate-600">minutos</span>
            </div>
          </div>

          {/* Item 2: Próximo Dia (3h-24h) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Consulta Próximo Dia (3h-24h)</label>
              <p className="text-[11px] text-slate-500">Tempo para concluir o PIX em agendamentos p/ o mesmo dia ou amanhã.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="10"
                max="120"
                value={draftSettings.nextday_booking_tolerance_minutes ?? 30}
                onChange={(e) => handleDraftChange('nextday_booking_tolerance_minutes', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-xs font-bold text-slate-600">minutos</span>
            </div>
          </div>

          {/* Item 3: Padrão (>24h) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Consulta Padrão (&gt; 24h)</label>
              <p className="text-[11px] text-slate-500">Tempo de tolerância PIX para agendamentos com antecedência.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="15"
                max="1440"
                value={draftSettings.standard_booking_tolerance_minutes ?? 60}
                onChange={(e) => handleDraftChange('standard_booking_tolerance_minutes', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-xs font-bold text-slate-600">minutos</span>
            </div>
          </div>
        </div>
      </Card>

      {/* BLOCO 4: OPERAÇÃO DA CLÍNICA & COMUNICAÇÃO */}
      <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">4. Operação da Clínica & Comunicação</h3>
            <p className="text-xs text-slate-500">Duração padrão de sessão e integrações de mensagens.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Item 1: Duração Padrão da Sessão */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Duração Padrão da Consulta</label>
              <p className="text-[11px] text-slate-500">Tempo em minutos preenchido ao cadastrar novos serviços.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="15"
                max="180"
                value={draftSettings.default_appointment_duration_minutes ?? 50}
                onChange={(e) => handleDraftChange('default_appointment_duration_minutes', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-xs font-bold text-slate-600">minutos</span>
            </div>
          </div>

          {/* Item 2: Capacidade Estimada p/ Ocupação */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800">Capacidade Média Vagas/Mês</label>
              <p className="text-[11px] text-slate-500">Baseline de slots por psicólogo para o cálculo da Taxa de Ocupação.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="10"
                max="300"
                value={draftSettings.professional_monthly_capacity_slots ?? 80}
                onChange={(e) => handleDraftChange('professional_monthly_capacity_slots', Number(e.target.value))}
                className="bg-white text-sm font-bold text-slate-900"
              />
              <span className="text-xs font-bold text-slate-600">vagas/mês</span>
            </div>
          </div>

          {/* Item 3: Lembretes WhatsApp */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-800">Lembretes WhatsApp</label>
              <p className="text-[11px] text-slate-500">Envio automático de alertas pré-consulta aos pacientes.</p>
            </div>
            <Switch
              checked={Boolean(draftSettings.whatsapp_reminders_enabled)}
              onCheckedChange={(checked) => handleDraftChange('whatsapp_reminders_enabled', checked)}
            />
          </div>
        </div>
      </Card>

      {/* BARRA FLUTUANTE DE SALVAMENTO INTENCIONAL (STICKY SAVE BAR) */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-6 max-w-2xl w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <div className="text-xs">
              <p className="font-bold text-slate-100">{changedParameters.length} parâmetro(s) alterados em rascunho</p>
              <p className="text-[11px] text-slate-400">Nenhuma mudança entra em vigor até a gravação intencional.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={() => setIsImpactModalOpen(true)}
              className="bg-[#2d8659] hover:bg-[#236b47] text-white font-bold text-xs shadow-md"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Avaliar Impacto & Salvar
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE IMPACTO & AVALIAÇÃO DE RISCO */}
      <Dialog open={isImpactModalOpen} onOpenChange={setIsImpactModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-[#2d8659]">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Avaliação de Impacto e Gravação Intencional
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Revise os fluxos e riscos dos parâmetros alterados antes de confirmar a atualização auditada.
            </DialogDescription>
          </DialogHeader>

          {/* TABELA DE DIFF DE ALTERAÇÕES & FLUXOS */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Parâmetro</th>
                  <th className="p-3 text-center">Valor Atual &rarr; Novo</th>
                  <th className="p-3">Fluxos Afetados & Risco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {changedParameters.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{item.meta.label}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{item.key}</span>
                    </td>

                    <td className="p-3 text-center font-mono">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-slate-500 line-through">{String(item.oldValue)}{item.meta.unit}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-[#2d8659] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {String(item.newValue)}{item.meta.unit}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      <p className="text-[11px] text-slate-700 mb-1">{item.meta.flows}</p>
                      <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.meta.risk === 'CRITICAL' || item.meta.risk === 'HIGH'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : item.meta.risk === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        Risco: {item.meta.riskLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gravação Intencional com Trilha de Auditoria Imutável</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Ao confirmar, estas configurações passarão a valer imediatamente no Supabase e uma entrada de log com nível **CRITICAL** será gravada em `audit_logs` associada à sua conta de Administrador.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="text-xs">
                Cancelar e Voltar ao Rascunho
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={handleConfirmAndSaveAll}
              disabled={isSaving}
              className="bg-[#2d8659] hover:bg-[#236b47] text-white font-bold text-xs shadow-md"
            >
              {isSaving ? 'Gravando Parâmetros...' : 'Confirmar e Gravar Parâmetros Auditados'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SystemSettingsManager;

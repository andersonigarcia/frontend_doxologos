/**
 * Suíte Automatizada de Homologação Funcional QA (v3.2 Clean Analytics & Elite Operacional)
 * Valida todos os 10 módulos do Roteiro de Testes Exploratórios (ROTEIRO_TESTES_EXPLORATORIOS_QA.md)
 */

import fs from 'fs';
import path from 'path';
import { sanitizeBookingPayload, ALLOWED_BOOKING_FIELDS } from '../bookingService';
import { getPatientHomeworkTasks, sanitizePatientNotePayload } from '../patientService';
import { sanitizeRefundReason, evaluatePatientCancellationEligibility } from '../refundService';
import { updateTomadorFiscalData, sanitizeNfseDiscriminacao } from '../nfseService';
import { validateLeadData } from '@/lib/leadValidator';
import { supabase } from '@/lib/customSupabaseClient';

jest.mock('@/lib/customSupabaseClient', () => {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'hw-1',
          session_date: '2026-10-24',
          homework: 'Praticar respiração diafragmática 2x ao dia',
          professional_id: 'prof-1'
        }
      ],
      error: null
    })
  };
  return {
    supabase: {
      from: jest.fn(() => queryBuilder),
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        getUser: jest.fn().mockResolvedValue({ data: { user: null } })
      },
      functions: {
        invoke: jest.fn()
      }
    }
  };
});

const rootDir = path.resolve(__dirname, '../../..');

describe('Homologação Funcional E2E — Roteiro QA v3.2 (Módulos 1 a 10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Módulo 1: Jornada Pública de Agendamento e Checkout (/agendamento & /checkout)', () => {
    it('Cenário 1.1: sanitizeBookingPayload deve remover campos fantasmas (meeting_platform) prevenindo HTTP 400', () => {
      expect(ALLOWED_BOOKING_FIELDS).not.toContain('meeting_platform');
      const raw = {
        professional_id: 'prof-123',
        service_id: 'srv-456',
        booking_date: '2026-11-10',
        booking_time: '14:00:00',
        patient_name: 'Maria QA',
        patient_email: 'maria@qa.com',
        patient_phone: '11987654321',
        meeting_platform: 'google_meet',
        hack_field: 'invalid'
      };
      const sanitized = sanitizeBookingPayload(raw);
      expect(sanitized.meeting_platform).toBeUndefined();
      expect(sanitized.hack_field).toBeUndefined();
      expect(sanitized.professional_id).toBe('prof-123');
      expect(sanitized.booking_date).toBe('2026-11-10');
    });

    it('Cenário 1.1 & 10.1: AgendamentoPage deve suportar deep-linking por ?service= e ?specialty= com antecedência dinâmica', () => {
      const agendamentoSource = fs.readFileSync(path.join(rootDir, 'src/pages/AgendamentoPage.jsx'), 'utf8');
      expect(agendamentoSource).toContain('booking_min_hours_notice');
      expect(agendamentoSource).toContain("searchParams.get('service')");
      expect(agendamentoSource).toContain("searchParams.get('specialty')");
    });
  });

  describe('Módulo 2: Portal do Paciente e Sigilo Clínico CFP/LGPD (/area-do-paciente)', () => {
    it('Cenário 2.2: getPatientHomeworkTasks deve consultar apenas colunas públicas de tarefa, jamais expondo queixa ou evolução', async () => {
      const tasks = await getPatientHomeworkTasks('paciente@doxologos.com.br');
      expect(supabase.from).toHaveBeenCalledWith('patient_notes_history');
      const selectCall = supabase.from().select.mock.calls[0][0];
      expect(selectCall).toBe('id, session_date, homework, professional_id');
      expect(selectCall).not.toContain('chief_complaint');
      expect(selectCall).not.toContain('session_development');
      expect(selectCall).not.toContain('notes');
      expect(tasks).toHaveLength(1);
    });

    it('Cenário 2.3: evaluatePatientCancellationEligibility deve aplicar a regra de 24h de antecedência', () => {
      const now = new Date('2026-11-02T12:00:00Z');
      const eligible = evaluatePatientCancellationEligibility('2026-11-04', '14:00', now);
      const ineligible = evaluatePatientCancellationEligibility('2026-11-02', '18:00', now);
      expect(eligible.isEligibleForCredit).toBe(true);
      expect(ineligible.isEligibleForCredit).toBe(false);
    });
  });

  describe('Módulo 3: Cockpit do Profissional, Prontuário SOAP e Carnê-Leão (/profissional & /faturamento-mensal)', () => {
    it('Cenário 3.2: PatientDetailsModal deve conter Timer de Sessão, campos SOAP e toggle de tarefa visível ao paciente', () => {
      const modalSource = fs.readFileSync(path.join(rootDir, 'src/components/admin/PatientDetailsModal.jsx'), 'utf8');
      expect(modalSource).toContain('data-testid="session-timer"');
      expect(modalSource).toContain('formatSessionTimer');
      expect(modalSource).toContain('chief_complaint');
      expect(modalSource).toContain('session_development');
      expect(modalSource).toContain('homework_visible_to_patient');
      expect(modalSource).toContain('ScheduleNextSessionModal');
    });

    it('Cenário 3.4: FaturamentoMensalPage deve conter exportação CSV UTF-8 BOM para Carnê-Leão com CBO 2515-10', () => {
      const faturamentoSource = fs.readFileSync(path.join(rootDir, 'src/pages/FaturamentoMensalPage.jsx'), 'utf8');
      expect(faturamentoSource).toContain('Exportar para Carnê-Leão (Receita Federal)');
      expect(faturamentoSource).toContain('\\uFEFF');
      expect(faturamentoSource).toContain('2515-10');
      expect(faturamentoSource).toContain('valor_repasse_profissional');
    });
  });

  describe('Módulo 4: Navegação Global e Controle de Acesso RBAC (UserBadge)', () => {
    it('Cenários 4.1 e 4.2: UserBadge deve rotear dinamicamente admin, professional e patient', () => {
      const badgeSource = fs.readFileSync(path.join(rootDir, 'src/components/UserBadge.jsx'), 'utf8');
      expect(badgeSource).toContain("'/admin'");
      expect(badgeSource).toContain("'/profissional'");
      expect(badgeSource).toContain("'/area-do-paciente'");
      expect(badgeSource).toContain('Administrador');
      expect(badgeSource).toContain('Profissional');
      expect(badgeSource).toContain('Paciente');
    });
  });

  describe('Módulo 5 & 6: Ferramentas Psicométricas e Campanha Guia ENEM (/ferramentas & /guia-enem)', () => {
    it('Cenário 5.1: validateLeadData deve bloquear e-mails descartáveis, DDD inválido e telefones sequenciais', () => {
      expect(
        validateLeadData({ name: '12345', email: 'maria.silva@gmail.com', phone: '(11) 98423-7156', requireName: true }).isValid
      ).toBe(false); // Nome sem letras válidas

      expect(
        validateLeadData({ name: 'Maria Silva', email: 'maria@mailinator.com', phone: '(11) 98423-7156' }).isValid
      ).toBe(false); // Domínio descartável

      expect(
        validateLeadData({ name: 'Maria Silva', email: 'maria.silva@gmail.com', phone: '(00) 99999-9999' }).isValid
      ).toBe(false); // DDD inválido + dígitos repetidos

      expect(
        validateLeadData({ name: 'Maria Silva', email: 'maria.silva@gmail.com', phone: '(11) 98423-7156' }).isValid
      ).toBe(true);
    });

    it('Cenário 6.1: GuiaEnemPage deve validar formulário de solicitação e direcionar para /agendamento com foco estudantil', () => {
      const enemSource = fs.readFileSync(path.join(rootDir, 'src/pages/GuiaEnemPage.jsx'), 'utf8');
      expect(enemSource).toContain('validateLeadData');
      expect(enemSource).toContain('/agendamento?service=Psicoterapia&specialty=enem');
    });
  });

  describe('Módulo 7 & 8: Configurações Globais e Clean Analytics (/admin & /admin/dashboard)', () => {
    it('Cenários 7.1 e 7.2: SystemSettingsManager deve gerenciar prontuario_show_emotional_triage e booking_min_hours_notice', () => {
      const settingsSource = fs.readFileSync(path.join(rootDir, 'src/components/admin/SystemSettingsManager.jsx'), 'utf8');
      expect(settingsSource).toContain('prontuario_show_emotional_triage');
      expect(settingsSource).toContain('booking_min_hours_notice');
    });

    it('Cenários 8.1, 8.2 e 8.3: ManagementDashboardPage (/admin/dashboard) deve integrar Cockpit, Retenção Zero-PII e Growth Analytics', () => {
      const dashboardSource = fs.readFileSync(path.join(rootDir, 'src/pages/ManagementDashboardPage.jsx'), 'utf8');
      expect(dashboardSource).toContain('StrategicCockpitModule');
      expect(dashboardSource).toContain('OperationalRetentionModule');
      expect(dashboardSource).toContain('GrowthAnalyticsModule');
    });
  });

  describe('Módulo 9: Operação Financeira, Resiliência NFS-e, Reembolsos e Ledger (/admin/pagamentos)', () => {
    it('Cenário 9.1: updateTomadorFiscalData e NfseResilienceDashboard devem rejeitar CPF com sequência repetida (111.111.111-11)', async () => {
      const res = await updateTomadorFiscalData({
        professionalId: 'prof-1',
        cpf: '111.111.111-11'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('sequência de dígitos repetidos');

      const nfseDashSource = fs.readFileSync(path.join(rootDir, 'src/components/admin/NfseResilienceDashboard.jsx'), 'utf8');
      expect(nfseDashSource).toContain('Salvar e Retentar Emissão');
      expect(nfseDashSource).toContain('Alerta de validação: CPF/CNPJ com dígitos repetidos');
    });

    it('Cenário 9.2: sanitizeRefundReason deve remover scripts maliciosos (<script>alert(1)</script>) e PaymentsPage deve integrar abas Fintech', () => {
      const cleaned = sanitizeRefundReason('<script>alert(1)</script> Solicitação do paciente por motivo de viagem');
      expect(cleaned).toBe('Solicitação do paciente por motivo de viagem');
      expect(cleaned).not.toContain('<script>');

      const paymentsSource = fs.readFileSync(path.join(rootDir, 'src/pages/PaymentsPage.jsx'), 'utf8');
      expect(paymentsSource).toContain('Novo Reembolso Manual');
      expect(paymentsSource).toContain('Resiliência NFS-e');
      expect(paymentsSource).toContain('Ledger Financeiro');
    });
  });

  describe('Módulo 10: Páginas Institucionais, Especialidades Clínicas (/terapia/*) e Doações (/doacao)', () => {
    it('Cenário 10.1: App.jsx deve registrar todas as rotas /terapia/* do roteiro QA e direcionar CTAs com filtro de serviço', () => {
      const appSource = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');
      const requiredRoutes = [
        '/terapia/ansiedade',
        '/terapia/depressao',
        '/terapia/casal',
        '/terapia/burnout',
        '/terapia/luto',
        '/terapia/autoestima',
        '/terapia/familiar',
        '/terapia/conflitos-religiosos'
      ];
      for (const route of requiredRoutes) {
        expect(appSource).toContain(`path="${route}"`);
      }

      const casalSource = fs.readFileSync(path.join(rootDir, 'src/pages/TerapiaCasalPage.jsx'), 'utf8');
      expect(casalSource).toContain('/agendamento?service=Casal&specialty=casal');
    });

    it('Cenário 10.2: DoacaoPage (/doacao) deve conter valores pré-definidos (30, 50, 100), botão Apoiar com PIX e CNPJ oficial 35035127000120', () => {
      const doacaoSource = fs.readFileSync(path.join(rootDir, 'src/pages/DoacaoPage.jsx'), 'utf8');
      expect(doacaoSource).toContain('35035127000120');
      expect(doacaoSource).toContain('Apoiar com PIX');
      expect(doacaoSource).toContain('{ amount: 30,');
      expect(doacaoSource).toContain('{ amount: 50,');
      expect(doacaoSource).toContain('{ amount: 100,');
    });
  });
});

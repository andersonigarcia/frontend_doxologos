import {
  ALLOWED_NFSE_FIELDS,
  VALID_NFSE_STATUSES,
  VALID_ERROR_CATEGORIES,
  DEFAULT_NFSE_DISCRIMINACAO,
  normalizeNfseStatus,
  sanitizeNfseDiscriminacao,
  sanitizeNfsePayload,
  listNfseEmissions,
  getNfseById,
  getNfseMapByBookingIds,
  emitSingleNfse,
  batchEmitNfse,
  retryNfseEmission,
  updateAndRetryNfseEmission,
  markNfseManualResolved,
  calculateNfseSummary,
  listPendingNfseTransactions,
  updateTomadorFiscalData
} from '../nfseService';
import { supabase } from '@/lib/customSupabaseClient';
import { updateProfessional } from '../professionalService';

jest.mock('../professionalService', () => ({
  updateProfessional: jest.fn()
}));

jest.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn()
    },
    functions: {
      invoke: jest.fn()
    }
  }
}));

describe('Serviço Canônico de NFS-e (nfseService.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Constantes e Integridade de Schema', () => {
    it('ALLOWED_NFSE_FIELDS deve conter os campos canônicos do banco sem campos fantasmas', () => {
      expect(ALLOWED_NFSE_FIELDS).toContain('id');
      expect(ALLOWED_NFSE_FIELDS).toContain('booking_id');
      expect(ALLOWED_NFSE_FIELDS).toContain('package_id');
      expect(ALLOWED_NFSE_FIELDS).toContain('status');
      expect(ALLOWED_NFSE_FIELDS).toContain('nfse_number');
      expect(ALLOWED_NFSE_FIELDS).toContain('valor_servico');
      expect(ALLOWED_NFSE_FIELDS).toContain('discriminacao');
      expect(ALLOWED_NFSE_FIELDS).toContain('error_category');
      expect(ALLOWED_NFSE_FIELDS).not.toContain('client_password');
      expect(ALLOWED_NFSE_FIELDS).not.toContain('patient_diagnosis');
    });

    it('VALID_NFSE_STATUSES deve conter os status permitidos pelo PostgreSQL check', () => {
      expect(VALID_NFSE_STATUSES).toEqual([
        'pending',
        'processing',
        'issued',
        'error',
        'cancelled',
        'manual_resolved'
      ]);
    });

    it('VALID_ERROR_CATEGORIES deve conter as categorias de resiliência', () => {
      expect(VALID_ERROR_CATEGORIES).toContain('PREFEITURA_OFFLINE');
      expect(VALID_ERROR_CATEGORIES).toContain('VALIDATION_ERROR');
      expect(VALID_ERROR_CATEGORIES).toContain('SYSTEM_ERROR');
      expect(VALID_ERROR_CATEGORIES).toContain('MANUAL_RESOLVED');
    });
  });

  describe('2. Normalização de Status e Sigilo Clínico (CFP / LGPD)', () => {
    it('normalizeNfseStatus deve mapear "failed" para "error" e "queued" para "pending"', () => {
      expect(normalizeNfseStatus('failed')).toBe('error');
      expect(normalizeNfseStatus('FAILED')).toBe('error');
      expect(normalizeNfseStatus('queued')).toBe('pending');
      expect(normalizeNfseStatus('QUEUED')).toBe('pending');
      expect(normalizeNfseStatus('issued')).toBe('issued');
      expect(normalizeNfseStatus('manual_resolved')).toBe('manual_resolved');
      expect(normalizeNfseStatus('desconhecido')).toBe('pending');
      expect(normalizeNfseStatus(null)).toBe('pending');
    });

    it('sanitizeNfseDiscriminacao deve purgar termos clínicos sensíveis e aplicar texto seguro', () => {
      const sensitiveText = 'Sessão de psicoterapia tratando crise de pânico e depressão grave';
      const sanitized = sanitizeNfseDiscriminacao(sensitiveText);

      expect(sanitized).toBe(DEFAULT_NFSE_DISCRIMINACAO);
      expect(sanitized).not.toContain('pânico');
      expect(sanitized).not.toContain('depressão');
    });

    it('sanitizeNfseDiscriminacao deve manter discriminações genéricas e neutras de licenciamento', () => {
      const genericText = 'Licença de uso de software de agendamento online - Ref 2026-10-21';
      const sanitized = sanitizeNfseDiscriminacao(genericText);

      expect(sanitized).toBe(genericText);
    });

    it('sanitizeNfsePayload deve filtrar apenas colunas permitidas e sanitizar status e discriminação', () => {
      const rawPayload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        valor_servico: 150.00,
        status: 'failed',
        discriminacao: 'Consulta com sintomas de ansiedade e cid F32',
        campo_inexistente_fantasma: 'hack_invalido'
      };

      const sanitized = sanitizeNfsePayload(rawPayload);

      expect(sanitized.id).toBe(rawPayload.id);
      expect(sanitized.valor_servico).toBe(150.00);
      expect(sanitized.status).toBe('error');
      expect(sanitized.discriminacao).toBe(DEFAULT_NFSE_DISCRIMINACAO);
      expect(sanitized.campo_inexistente_fantasma).toBeUndefined();
    });
  });

  describe('3. Consultas e Listagens', () => {
    it('listNfseEmissions deve aplicar filtros e paginação corretamente', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [{ id: 'nf-1', status: 'issued', valor_servico: 50 }],
          count: 1,
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await listNfseEmissions({
        status: 'error',
        errorCategory: 'PREFEITURA_OFFLINE',
        page: 1,
        pageSize: 10
      });

      expect(supabase.from).toHaveBeenCalledWith('nfse_emissions');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'error');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('error_category', 'PREFEITURA_OFFLINE');
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('getNfseById deve buscar uma emissão específica', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'nf-10', nfse_number: '2026001' },
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQueryBuilder);

      const { data, error } = await getNfseById('nf-10');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'nf-10');
      expect(data.nfse_number).toBe('2026001');
      expect(error).toBeNull();
    });

    it('getNfseMapByBookingIds deve retornar mapa indexado com status normalizado', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { booking_id: 'b-1', status: 'issued', nfse_number: '101' },
            { booking_id: 'b-2', status: 'failed', nfse_number: null }
          ],
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQueryBuilder);

      const { map } = await getNfseMapByBookingIds(['b-1', 'b-2']);

      expect(map['b-1'].status).toBe('issued');
      expect(map['b-1'].nfse_number).toBe('101');
      expect(map['b-2'].status).toBe('error'); // Normalizado de 'failed' para 'error'
    });

    it('getNfseMapByBookingIds com array vazio deve retornar objeto vazio sem chamar banco', async () => {
      const { map } = await getNfseMapByBookingIds([]);
      expect(map).toEqual({});
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('listPendingNfseTransactions deve cruzar agendamentos confirmados e filtrar os sem NFS-e emitida', async () => {
      const mockBookingsQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'b-pending-1',
              booking_date: '2026-10-21',
              booking_time: '14:00',
              patient_name: 'Ana Silva',
              status: 'confirmed',
              valor_consulta: 150,
              valor_repasse_profissional: 90,
              professional: { id: 'p1', name: 'Dr. Roberto', cpf: '12345678901' },
              services: { id: 's1', name: 'Psicoterapia', price: 150 }
            },
            {
              id: 'b-already-emitted',
              booking_date: '2026-10-20',
              status: 'confirmed',
              valor_consulta: 150,
              professional: { id: 'p2', name: 'Dra. Luiza' }
            }
          ],
          error: null
        })
      };

      const mockEmissionsQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'em-1', booking_id: 'b-already-emitted', status: 'issued', nfse_number: '5544' }
          ],
          error: null
        })
      };

      supabase.from
        .mockReturnValueOnce(mockBookingsQuery)
        .mockReturnValueOnce(mockEmissionsQuery);

      const result = await listPendingNfseTransactions();

      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(supabase.from).toHaveBeenCalledWith('nfse_emissions');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('b-pending-1');
      expect(result.data[0].valorServico).toBe(60); // 150 - 90 = 60
      expect(result.data[0].hasValidDoc).toBe(true);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('4. Emissões e Operações de Resiliência', () => {
    it('emitSingleNfse deve invocar a Edge Function emit-nfse com sucesso', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { nfse: { id: 'nf-123', nfse_number: '9988' }, idempotent: false },
        error: null
      });

      const res = await emitSingleNfse({ booking_id: 'book-1' });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('emit-nfse', {
        body: { booking_id: 'book-1' }
      });
      expect(res.success).toBe(true);
      expect(res.nfse.nfse_number).toBe('9988');
      expect(res.idempotent).toBe(false);
    });

    it('emitSingleNfse deve retornar erro amigável se nenhum ID for passado', async () => {
      const res = await emitSingleNfse({});
      expect(res.success).toBe(false);
      expect(res.error).toContain('Informe ao menos um identificador');
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('batchEmitNfse deve passar os booking_ids e o token de autenticação', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'fake-jwt-token' } }
      });

      supabase.functions.invoke.mockResolvedValue({
        data: { message: '5 NFS-e enfileiradas com sucesso', enqueued: 5 },
        error: null
      });

      const res = await batchEmitNfse(['b1', 'b2']);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('batch-emit-nfse', {
        body: { booking_ids: ['b1', 'b2'] },
        headers: { Authorization: 'Bearer fake-jwt-token' }
      });
      expect(res.success).toBe(true);
      expect(res.data.enqueued).toBe(5);
    });

    it('retryNfseEmission deve disparar ação "retry"', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const res = await retryNfseEmission('nf-abc');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('emit-nfse', {
        body: { nfse_id: 'nf-abc', action: 'retry' }
      });
      expect(res.success).toBe(true);
    });

    it('updateAndRetryNfseEmission deve sanitizar discriminacao antes de reenviar', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } }
      });

      supabase.functions.invoke.mockResolvedValue({
        data: { nfse: { id: 'nf-abc', status: 'issued', nfse_number: '12345' } },
        error: null
      });

      const res = await updateAndRetryNfseEmission(
        'nf-abc',
        {
          tomador_nome: 'Dra. Maria Psicologia',
          tomador_cpf_cnpj: '12345678901',
          discriminacao: 'Atendimento de pânico' // Deve ser sanitizado!
        },
        'Corrigido CPF'
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith('emit-nfse', {
        body: {
          nfse_id: 'nf-abc',
          action: 'update_and_retry',
          override_data: {
            tomador_nome: 'Dra. Maria Psicologia',
            tomador_cpf_cnpj: '12345678901',
            discriminacao: DEFAULT_NFSE_DISCRIMINACAO
          },
          correction_notes: 'Corrigido CPF',
          corrected_by: 'admin-user-id'
        }
      });
      expect(res.success).toBe(true);
      expect(res.nfse.nfse_number).toBe('12345');
    });

    it('markNfseManualResolved deve registrar número oficial da PBH', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } }
      });

      supabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const res = await markNfseManualResolved(
        'nf-abc',
        '2026999',
        'Emitida no portal BHISS Digital'
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith('emit-nfse', {
        body: {
          nfse_id: 'nf-abc',
          action: 'mark_manual_resolved',
          manual_nfse_number: '2026999',
          correction_notes: 'Emitida no portal BHISS Digital',
          corrected_by: 'admin-user-id'
        }
      });
      expect(res.success).toBe(true);
    });
  });

  describe('5. Agregação de Métricas (calculateNfseSummary)', () => {
    it('deve calcular totais, erros, offline e receita faturada corretamente', () => {
      const sampleRecords = [
        { status: 'issued', valor_servico: 50 },
        { status: 'manual_resolved', valor_servico: 30 },
        { status: 'error', error_category: 'PREFEITURA_OFFLINE', valor_servico: 40 },
        { status: 'failed', error_category: 'VALIDATION_ERROR', valor_servico: 40 }, // Normalizado para error
        { status: 'pending', valor_servico: 60 }
      ];

      const summary = calculateNfseSummary(sampleRecords);

      expect(summary.total).toBe(5);
      expect(summary.issued).toBe(1);
      expect(summary.manual_resolved).toBe(1);
      expect(summary.error).toBe(2);
      expect(summary.pending).toBe(1);
      expect(summary.offlineCount).toBe(1);
      expect(summary.validationCount).toBe(1);
      expect(summary.totalValorServico).toBe(50);
    });
  });

  describe('6. Atualização de Dados Fiscais do Tomador (updateTomadorFiscalData)', () => {
    it('deve retornar erro se professionalId não for fornecido', async () => {
      const res = await updateTomadorFiscalData({ cpf: '12345678901' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Identificador do profissional');
    });

    it('deve retornar erro se o documento for ausente ou tiver quantidade inválida de dígitos', async () => {
      const resEmpty = await updateTomadorFiscalData({ professionalId: 'prof-1', cpf: '' });
      expect(resEmpty.success).toBe(false);
      expect(resEmpty.error).toContain('informe o CPF');

      const resInvalid = await updateTomadorFiscalData({ professionalId: 'prof-1', cpf: '123' });
      expect(resInvalid.success).toBe(false);
      expect(resInvalid.error).toContain('Documento incompleto');

      const resRepeated = await updateTomadorFiscalData({ professionalId: 'prof-1', cpf: '111.111.111-11' });
      expect(resRepeated.success).toBe(false);
      expect(resRepeated.error).toContain('sequência de dígitos repetidos');
    });

    it('deve formatar e persistir CPF (11 dígitos) limpando máscara e zerando CNPJ', async () => {
      updateProfessional.mockResolvedValue({ id: 'prof-1', cpf: '12345678901', cnpj: null, name: 'Dra. Ana' });

      const res = await updateTomadorFiscalData({
        professionalId: 'prof-1',
        cpf: '123.456.789-01',
        name: 'Dra. Ana',
        email: 'ana@psi.com'
      });

      expect(res.success).toBe(true);
      expect(updateProfessional).toHaveBeenCalledWith('prof-1', {
        cpf: '12345678901',
        cnpj: null,
        name: 'Dra. Ana',
        email: 'ana@psi.com'
      });
    });

    it('deve formatar e persistir CNPJ (14 dígitos) limpando máscara e zerando CPF', async () => {
      updateProfessional.mockResolvedValue({ id: 'prof-2', cnpj: '12345678000199', cpf: null });

      const res = await updateTomadorFiscalData({
        professionalId: 'prof-2',
        cnpj: '12.345.678/0001-99'
      });

      expect(res.success).toBe(true);
      expect(updateProfessional).toHaveBeenCalledWith('prof-2', {
        cnpj: '12345678000199',
        cpf: null
      });
    });

    it('deve capturar falhas e erros de persistência de forma amigável', async () => {
      updateProfessional.mockRejectedValue(new Error('Falha de conexão com o banco'));

      const res = await updateTomadorFiscalData({
        professionalId: 'prof-1',
        cpf: '12345678901'
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Falha de conexão com o banco');
    });
  });
});

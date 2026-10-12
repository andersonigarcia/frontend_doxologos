import {
  ALLOWED_PROFESSIONAL_FIELDS,
  sanitizeProfessionalPayload,
  getProfessionalById,
  listProfessionals,
  updateProfessional,
  updateProfessionalStatus
} from '../professionalService';
import { supabase } from '@/lib/customSupabaseClient';

// Mock Supabase
jest.mock('@/lib/customSupabaseClient', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn(),
      functions: {
        invoke: jest.fn()
      },
      auth: {
        getSession: jest.fn()
      }
    }
  };
});

// Mock fetch global para testes de Edge Function
global.fetch = jest.fn();

describe('professionalService — Domain Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeProfessionalPayload', () => {
    it('deve remover campos inexistentes no banco como email e password', () => {
      const rawInput = {
        name: 'Dr. Eric Vinícius',
        email: 'eric@clinica.com',
        password: 'secret_password_123',
        whatsapp: '5511999999999',
        specialty: 'Psicologia Clínica',
        mini_curriculum: 'Currículo de teste',
        extra_fake_field: 'deveria_ser_ignorado'
      };

      const sanitized = sanitizeProfessionalPayload(rawInput);

      expect(sanitized.name).toBe('Dr. Eric Vinícius');
      expect(sanitized.whatsapp).toBe('5511999999999');
      expect(sanitized.phone).toBe('5511999999999'); // sincronizado
      expect(sanitized.specialty).toBe('Psicologia Clínica');
      expect(sanitized.mini_curriculum).toBe('Currículo de teste');

      // Garantir que email e password NÃO existem no payload
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.extra_fake_field).toBeUndefined();
    });

    it('deve garantir que services_ids é sempre um array', () => {
      const sanitized = sanitizeProfessionalPayload({ services_ids: 'not-an-array' });
      expect(Array.isArray(sanitized.services_ids)).toBe(true);
      expect(sanitized.services_ids).toEqual([]);
    });

    it('deve normalizar strings vazias para null em documentos', () => {
      const sanitized = sanitizeProfessionalPayload({
        cpf: '   ',
        cnpj: '',
        crp: '06/12345'
      });
      expect(sanitized.cpf).toBeNull();
      expect(sanitized.cnpj).toBeNull();
      expect(sanitized.crp).toBe('06/12345');
    });
  });

  describe('getProfessionalById', () => {
    it('deve lançar erro se id não for fornecido', async () => {
      await expect(getProfessionalById('')).rejects.toThrow('ID do profissional é obrigatório.');
    });

    it('deve buscar profissional e enriquecer com e-mail do Auth se possuir user_id', async () => {
      const mockProfDb = {
        id: 'prof-uuid-1',
        name: 'Eric Vinícius',
        user_id: 'auth-user-99'
      };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockProfDb, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      supabase.rpc.mockResolvedValue({
        data: [
          { id: 'auth-user-99', email: 'ericviniciusag@gmail.com' },
          { id: 'auth-user-100', email: 'outro@clinica.com' }
        ],
        error: null
      });

      const result = await getProfessionalById('prof-uuid-1');

      expect(supabase.from).toHaveBeenCalledWith('professionals');
      expect(eqMock).toHaveBeenCalledWith('id', 'prof-uuid-1');
      expect(result.id).toBe('prof-uuid-1');
      expect(result.email).toBe('ericviniciusag@gmail.com');
    });
  });

  describe('listProfessionals', () => {
    it('deve listar profissionais e aplicar enriquecimento de e-mails', async () => {
      const mockList = [
        { id: 'prof-1', user_id: 'auth-1', name: 'Ana Silva', status: 'active' },
        { id: 'prof-2', user_id: 'auth-2', name: 'Bruno Costa', status: 'suspended' }
      ];

      const selectMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ data: mockList, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        order: orderMock
      });

      supabase.rpc.mockResolvedValue({
        data: [
          { id: 'auth-1', email: 'ana@clinica.com' },
          { id: 'auth-2', email: 'bruno@clinica.com' }
        ],
        error: null
      });

      const all = await listProfessionals();
      expect(all).toHaveLength(2);
      expect(all[0].email).toBe('ana@clinica.com');
      expect(all[1].email).toBe('bruno@clinica.com');

      // Filtrar apenas ativos
      const activeOnly = await listProfessionals({ status: 'active' });
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].name).toBe('Ana Silva');
    });
  });

  describe('updateProfessional', () => {
    it('deve salvar dados no banco e sincronizar credenciais no Auth sem enviar email para a tabela professionals', async () => {
      const mockUpdated = {
        id: 'prof-123',
        user_id: 'auth-user-99',
        name: 'Eric Vinícius Atualizado'
      };

      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockUpdated, error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
        single: singleMock
      });

      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'valid-test-token' } }
      });

      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ user: { id: 'auth-user-99' } })
        })
      );

      const payload = {
        name: 'Eric Vinícius Atualizado',
        email: 'novoemail@gmail.com',
        whatsapp: '11999998888',
        specialty: 'Psicologia Clínica',
        user_id: 'auth-user-99'
      };

      const result = await updateProfessional('prof-123', payload);

      // Verificar que update foi chamado na tabela professionals
      expect(supabase.from).toHaveBeenCalledWith('professionals');
      expect(updateMock).toHaveBeenCalled();
      
      const payloadPassedToPostgres = updateMock.mock.calls[0][0];
      // Invariante de ouro: email NÃO pode ter sido enviado para a tabela professionals
      expect(payloadPassedToPostgres.email).toBeUndefined();
      expect(payloadPassedToPostgres.name).toBe('Eric Vinícius Atualizado');

      // Verificar que fetch foi chamado para admin-update-user com o authUserId correto
      expect(global.fetch).toHaveBeenCalled();
      const fetchCallArgs = global.fetch.mock.calls[0];
      const fetchBody = JSON.parse(fetchCallArgs[1].body);
      expect(fetchBody.userId).toBe('auth-user-99');
      expect(fetchBody.userData.email).toBe('novoemail@gmail.com');

      expect(result.email).toBe('novoemail@gmail.com');
    });
  });

  describe('updateProfessionalStatus', () => {
    it('deve validar status permitidos', async () => {
      await expect(updateProfessionalStatus('prof-1', 'status_invalido')).rejects.toThrow('Status inválido');
    });

    it('deve atualizar status com sucesso', async () => {
      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock
      });

      const res = await updateProfessionalStatus('prof-1', 'suspended');
      expect(res.status).toBe('suspended');
      expect(updateMock).toHaveBeenCalledWith({ status: 'suspended' });
    });
  });
});

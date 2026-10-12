import {
  ALLOWED_PAYMENT_FIELDS,
  VALID_PAYMENT_STATUSES,
  sanitizePaymentPayload,
  getPaymentById,
  getPaymentByMpId,
  getPaymentByBookingId,
  listPayments,
  updatePaymentStatus,
  createPaymentRecord
} from '../paymentService';
import { supabase } from '@/lib/customSupabaseClient';

jest.mock('@/lib/customSupabaseClient', () => {
  const mSupabase = {
    from: jest.fn(() => mSupabase),
    select: jest.fn(() => mSupabase),
    insert: jest.fn(() => mSupabase),
    update: jest.fn(() => mSupabase),
    eq: jest.fn(() => mSupabase),
    in: jest.fn(() => mSupabase),
    order: jest.fn(() => mSupabase),
    limit: jest.fn(() => mSupabase),
    single: jest.fn(() => Promise.resolve({ data: { id: 'pay_123', status: 'approved' }, error: null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: { id: 'pay_123', mp_payment_id: '999888' }, error: null }))
  };
  return { supabase: mSupabase };
});

describe('paymentService — Domain Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizePaymentPayload', () => {
    it('deve remover campos inexistentes no banco como invalid_tax e token_card', () => {
      const payload = {
        amount: 150.0,
        booking_id: 'bkg_123',
        status: 'approved',
        invalid_tax: 15.0,
        token_card: 'xyz789'
      };

      const sanitized = sanitizePaymentPayload(payload);
      expect(sanitized.amount).toBe(150.0);
      expect(sanitized.booking_id).toBe('bkg_123');
      expect(sanitized.status).toBe('approved');
      expect(sanitized.invalid_tax).toBeUndefined();
      expect(sanitized.token_card).toBeUndefined();
    });

    it('deve ignorar status inválido para preservar integridade de dados', () => {
      const payload = {
        amount: 200.0,
        status: 'status_inventado_123'
      };

      const sanitized = sanitizePaymentPayload(payload);
      expect(sanitized.amount).toBe(200.0);
      expect(sanitized.status).toBeUndefined();
    });
  });

  describe('getPaymentById', () => {
    it('deve lançar erro se id não for fornecido', async () => {
      await expect(getPaymentById('')).rejects.toThrow('ID do pagamento é obrigatório.');
    });

    it('deve buscar pagamento por id', async () => {
      const payment = await getPaymentById('pay_123');
      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(supabase.eq).toHaveBeenCalledWith('id', 'pay_123');
      expect(payment).toEqual({ id: 'pay_123', status: 'approved' });
    });
  });

  describe('getPaymentByMpId', () => {
    it('deve retornar null se mpPaymentId não for fornecido', async () => {
      const res = await getPaymentByMpId(null);
      expect(res).toBeNull();
    });

    it('deve converter número em string e buscar pelo mp_payment_id', async () => {
      const payment = await getPaymentByMpId(999888);
      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(supabase.eq).toHaveBeenCalledWith('mp_payment_id', '999888');
      expect(payment).toEqual({ id: 'pay_123', mp_payment_id: '999888' });
    });
  });

  describe('getPaymentByBookingId', () => {
    it('deve retornar null se bookingId for vazio', async () => {
      const res = await getPaymentByBookingId('');
      expect(res).toBeNull();
    });

    it('deve consultar pagamentos associados ao booking', async () => {
      supabase.limit.mockReturnValueOnce(Promise.resolve({ data: [{ id: 'pay_123', booking_id: 'bkg_123' }], error: null }));
      const payment = await getPaymentByBookingId('bkg_123');
      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(supabase.eq).toHaveBeenCalledWith('booking_id', 'bkg_123');
      expect(payment.id).toBe('pay_123');
    });
  });

  describe('updatePaymentStatus', () => {
    it('deve rejeitar status inválido', async () => {
      await expect(updatePaymentStatus('pay_123', 'status_invalido')).rejects.toThrow('Status inválido: "status_invalido"');
    });

    it('deve atualizar status com sucesso para status aprovado', async () => {
      const result = await updatePaymentStatus('pay_123', 'approved', { status_detail: 'accredited' });
      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(supabase.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('createPaymentRecord', () => {
    it('deve sanitizar e inserir registro de pagamento', async () => {
      const result = await createPaymentRecord({
        amount: 250.0,
        booking_id: 'bkg_999',
        status: 'pending',
        campo_fantasma: 'invalido'
      });

      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(supabase.insert).toHaveBeenCalledWith([expect.objectContaining({
        amount: 250.0,
        booking_id: 'bkg_999',
        status: 'pending'
      })]);
      expect(result).toBeDefined();
    });
  });
});

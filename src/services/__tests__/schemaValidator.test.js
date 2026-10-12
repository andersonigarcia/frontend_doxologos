import {
  getTableColumns,
  isColumnValid,
  validatePayloadAgainstSchema,
  databaseCatalog
} from '../../lib/validation/schemaValidator.js';

describe('schemaValidator — Database Catalog & Schema Integrity Tests', () => {
  describe('Catálogo de Banco (databaseCatalog)', () => {
    it('deve possuir metadados válidos e conter ao menos 50 tabelas catalogadas', () => {
      expect(databaseCatalog).toBeDefined();
      expect(databaseCatalog._metadata).toBeDefined();
      expect(databaseCatalog._metadata.tables_count).toBeGreaterThanOrEqual(50);
      expect(databaseCatalog.tables).toBeDefined();
    });
  });

  describe('getTableColumns', () => {
    it('deve retornar a lista de colunas reais de public.professionals', () => {
      const cols = getTableColumns('professionals');
      expect(cols).toContain('name');
      expect(cols).toContain('crp');
      expect(cols).toContain('specialty');
      expect(cols).toContain('personal_meet_link');
      // Colunas que NÃO existem em public.professionals
      expect(cols).not.toContain('email');
      expect(cols).not.toContain('password');
    });

    it('deve retornar a lista de colunas reais de public.bookings', () => {
      const cols = getTableColumns('bookings');
      expect(cols).toContain('booking_date');
      expect(cols).toContain('booking_time');
      expect(cols).toContain('patient_name');
      expect(cols).toContain('status');
      // Coluna fantasma que NÃO existe em public.bookings
      expect(cols).not.toContain('meeting_platform');
      expect(cols).not.toContain('service_name');
    });

    it('deve retornar array vazio para tabela inexistente', () => {
      const cols = getTableColumns('tabela_fantasma_xyz');
      expect(cols).toEqual([]);
    });
  });

  describe('isColumnValid', () => {
    it('deve validar corretamente colunas existentes e inexistentes', () => {
      expect(isColumnValid('professionals', 'name')).toBe(true);
      expect(isColumnValid('professionals', 'crp')).toBe(true);
      expect(isColumnValid('professionals', 'email')).toBe(false);

      expect(isColumnValid('bookings', 'booking_time')).toBe(true);
      expect(isColumnValid('bookings', 'meeting_platform')).toBe(false);
    });
  });

  describe('validatePayloadAgainstSchema', () => {
    it('deve aprovar payload 100% válido', () => {
      const payload = {
        name: 'Dra. Ana',
        crp: '06/12345',
        specialty: 'TCC'
      };

      const result = validatePayloadAgainstSchema('professionals', payload);
      expect(result.isValid).toBe(true);
      expect(result.invalidFields).toEqual([]);
      expect(result.sanitizedPayload).toEqual(payload);
    });

    it('deve detectar e sanitizar campos fantasmas como email em professionals', () => {
      const payload = {
        name: 'Dr. Lucas',
        crp: '06/98765',
        email: 'lucas@doxologos.com.br', // fantasma
        password: 'secretPassword123' // fantasma
      };

      const result = validatePayloadAgainstSchema('professionals', payload);
      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toContain('email');
      expect(result.invalidFields).toContain('password');
      expect(result.sanitizedPayload).toEqual({
        name: 'Dr. Lucas',
        crp: '06/98765'
      });
    });

    it('deve detectar e sanitizar meeting_platform em bookings', () => {
      const payload = {
        booking_date: '2026-10-15',
        booking_time: '14:00',
        patient_name: 'Carlos Silva',
        meeting_platform: 'google_meet' // fantasma
      };

      const result = validatePayloadAgainstSchema('bookings', payload);
      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toEqual(['meeting_platform']);
      expect(result.sanitizedPayload).toEqual({
        booking_date: '2026-10-15',
        booking_time: '14:00',
        patient_name: 'Carlos Silva'
      });
    });
  });
});

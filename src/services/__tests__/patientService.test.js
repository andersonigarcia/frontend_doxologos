import {
  ALLOWED_PATIENT_NOTE_FIELDS,
  ALLOWED_PATIENT_HISTORY_FIELDS,
  sanitizePatientNotePayload,
  getPatientHomeworkTasks,
  getPatientNotesHistory,
  savePatientSessionNote
} from '../patientService';
import { supabase } from '@/lib/customSupabaseClient';

jest.mock('@/lib/customSupabaseClient', () => {
  const mSupabase = {
    from: jest.fn(() => mSupabase),
    select: jest.fn(() => mSupabase),
    insert: jest.fn(() => mSupabase),
    update: jest.fn(() => mSupabase),
    eq: jest.fn(() => mSupabase),
    order: jest.fn(() => Promise.resolve({ data: [{ id: 'task_1', homework: 'Praticar respiração' }], error: null })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: { access_token: 'fake_jwt_token' } } }))
    },
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: { history: [{ id: 'note_1', session_date: '2026-10-10' }] }, error: null }))
    }
  };
  return { supabase: mSupabase };
});

describe('patientService — Domain Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizePatientNotePayload', () => {
    it('deve remover campos inexistentes no banco como invalid_tag e internal_rating', () => {
      const payload = {
        chief_complaint: 'Ansiedade crônica',
        session_development: 'Evolução positiva com TCC',
        homework: 'Registro de pensamentos',
        notes: 'Sessão produtiva',
        invalid_tag: 'vip',
        internal_rating: 5
      };

      const sanitized = sanitizePatientNotePayload(payload);
      expect(sanitized.chief_complaint).toBe('Ansiedade crônica');
      expect(sanitized.session_development).toBe('Evolução positiva com TCC');
      expect(sanitized.homework).toBe('Registro de pensamentos');
      expect(sanitized.notes).toBe('Sessão produtiva');
      expect(sanitized.invalid_tag).toBeUndefined();
      expect(sanitized.internal_rating).toBeUndefined();
    });
  });

  describe('getPatientHomeworkTasks', () => {
    it('deve retornar array vazio se patientEmail não for fornecido', async () => {
      const tasks = await getPatientHomeworkTasks('');
      expect(tasks).toEqual([]);
    });

    it('deve buscar tarefas de homework do paciente em patient_notes_history', async () => {
      const tasks = await getPatientHomeworkTasks('paciente@teste.com');
      expect(supabase.from).toHaveBeenCalledWith('patient_notes_history');
      expect(supabase.eq).toHaveBeenCalledWith('patient_email', 'paciente@teste.com');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].homework).toBe('Praticar respiração');
    });
  });

  describe('getPatientNotesHistory', () => {
    it('deve retornar array vazio se patientEmail for nulo', async () => {
      const history = await getPatientNotesHistory(null);
      expect(history).toEqual([]);
    });

    it('deve invocar patient-notes-manager para listar o histórico', async () => {
      const history = await getPatientNotesHistory('paciente@teste.com');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('patient-notes-manager', expect.objectContaining({
        body: { action: 'list_history', patient_email: 'paciente@teste.com' }
      }));
      expect(history).toEqual([{ id: 'note_1', session_date: '2026-10-10' }]);
    });
  });

  describe('savePatientSessionNote', () => {
    it('deve lançar erro se patientEmail for ausente', async () => {
      await expect(savePatientSessionNote('', 'notas')).rejects.toThrow('E-mail do paciente é obrigatório.');
    });

    it('deve invocar patient-notes-manager com a ação save', async () => {
      await savePatientSessionNote('paciente@teste.com', 'Anotações da sessão', {
        chief_complaint: 'Insônia',
        homework: 'Higiene do sono'
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('patient-notes-manager', expect.objectContaining({
        body: expect.objectContaining({
          action: 'save',
          patient_email: 'paciente@teste.com',
          notes: 'Anotações da sessão',
          chief_complaint: 'Insônia',
          homework: 'Higiene do sono'
        })
      }));
    });
  });
});

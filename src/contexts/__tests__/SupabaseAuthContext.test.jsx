import {
  resolveAvailableRoles,
  resolveInitialActiveRole,
  ACTIVE_ROLE_STORAGE_KEY
} from '../SupabaseAuthContext';

describe('Multi-Perfil Híbrido: Resolução de Roles (SupabaseAuthContext)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('resolveAvailableRoles', () => {
    test('deve retornar lista vazia para usuário nulo', () => {
      expect(resolveAvailableRoles(null)).toEqual([]);
    });

    test('deve conceder apenas "patient" para paciente comum com role="user"', () => {
      const user = {
        id: 'user-1',
        app_metadata: { role: 'user' }
      };
      const roles = resolveAvailableRoles(user);
      expect(roles).toEqual(['patient']);
    });

    test('deve conceder apenas "patient" para paciente com role="patient"', () => {
      const user = {
        id: 'user-2',
        app_metadata: { role: 'patient' }
      };
      const roles = resolveAvailableRoles(user);
      expect(roles).toEqual(['patient']);
    });

    test('deve conceder "patient" e "professional" para usuário com role="professional"', () => {
      const user = {
        id: 'prof-1',
        app_metadata: { role: 'professional' }
      };
      const roles = resolveAvailableRoles(user);
      expect(roles).toContain('patient');
      expect(roles).toContain('professional');
      expect(roles).not.toContain('admin');
    });

    test('deve conceder "admin", "professional" e "patient" para administrador', () => {
      const user = {
        id: 'admin-1',
        app_metadata: { role: 'admin' }
      };
      const roles = resolveAvailableRoles(user);
      expect(roles).toContain('admin');
      expect(roles).toContain('professional');
      expect(roles).toContain('patient');
    });

    test('deve aceitar array app_metadata.roles se presente', () => {
      const user = {
        id: 'hybrid-1',
        app_metadata: { roles: ['professional', 'user'] }
      };
      const roles = resolveAvailableRoles(user);
      expect(roles).toContain('professional');
      expect(roles).toContain('patient');
    });
  });

  describe('resolveInitialActiveRole', () => {
    test('deve retornar null para lista vazia', () => {
      expect(resolveInitialActiveRole([])).toBeNull();
    });

    test('deve respeitar a preferência salva no localStorage se for válida', () => {
      localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, 'patient');
      const initial = resolveInitialActiveRole(['patient', 'professional']);
      expect(initial).toBe('patient');
    });

    test('deve ignorar preferência inválida no localStorage e usar prioridade padrão', () => {
      localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, 'admin'); // Usuário não tem admin
      const initial = resolveInitialActiveRole(['patient', 'professional']);
      expect(initial).toBe('professional');
    });

    test('deve priorizar "admin" sobre "professional" e "patient" por padrão', () => {
      const initial = resolveInitialActiveRole(['patient', 'professional', 'admin']);
      expect(initial).toBe('admin');
    });

    test('deve priorizar "professional" sobre "patient" por padrão', () => {
      const initial = resolveInitialActiveRole(['patient', 'professional']);
      expect(initial).toBe('professional');
    });
  });
});

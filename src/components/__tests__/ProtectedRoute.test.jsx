import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';
import { MemoryRouter } from 'react-router-dom';

const mockSwitchActiveRole = jest.fn();

let mockAuthContext = {
  user: null,
  userRole: null,
  activeRole: null,
  availableRoles: [],
  switchActiveRole: mockSwitchActiveRole,
  loading: false,
};

jest.mock('@/contexts/SupabaseAuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('ProtectedRoute Component (Multi-Perfil Híbrido)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar formulário de login quando usuário não estiver autenticado', () => {
    mockAuthContext = {
      user: null,
      userRole: null,
      activeRole: null,
      availableRoles: [],
      switchActiveRole: mockSwitchActiveRole,
      loading: false,
    };

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Conteúdo Protegido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Área Restrita')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });

  test('deve permitir acesso direto quando activeRole estiver contido em requiredRoles', () => {
    mockAuthContext = {
      user: { id: 'prof-1', email: 'prof@doxologos.com.br' },
      userRole: 'professional',
      activeRole: 'professional',
      availableRoles: ['professional', 'patient'],
      switchActiveRole: mockSwitchActiveRole,
      loading: false,
    };

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRoles={['professional']}>
          <div>Painel do Profissional</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Painel do Profissional')).toBeInTheDocument();
  });

  test('deve auto-chavear usuário híbrido para a role requerida se ele possuir em availableRoles', () => {
    mockAuthContext = {
      user: { id: 'prof-1', email: 'prof@doxologos.com.br' },
      userRole: 'patient',
      activeRole: 'patient',
      availableRoles: ['professional', 'patient'],
      switchActiveRole: mockSwitchActiveRole,
      loading: false,
    };

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRoles={['professional']}>
          <div>Painel do Profissional</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(mockSwitchActiveRole).toHaveBeenCalledWith('professional');
  });

  test('deve exibir Acesso Restrito quando usuário não possui a role requerida em availableRoles', () => {
    mockAuthContext = {
      user: { id: 'patient-1', email: 'paciente@doxologos.com.br' },
      userRole: 'patient',
      activeRole: 'patient',
      availableRoles: ['patient'],
      switchActiveRole: mockSwitchActiveRole,
      loading: false,
    };

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRoles={['admin']}>
          <div>Painel Administrativo</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    expect(screen.queryByText('Painel Administrativo')).not.toBeInTheDocument();
  });
});

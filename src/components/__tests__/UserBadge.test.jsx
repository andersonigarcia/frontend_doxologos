import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserBadge from '../UserBadge';

const mockNavigate = jest.fn();
const mockSwitchActiveRole = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

let mockAuthContext = {
  availableRoles: ['patient'],
  activeRole: 'patient',
  switchActiveRole: mockSwitchActiveRole,
};

jest.mock('@/contexts/SupabaseAuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('UserBadge Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext = {
      availableRoles: ['patient'],
      activeRole: 'patient',
      switchActiveRole: mockSwitchActiveRole,
    };
  });

  const mockUser = {
    id: 'test-user-id',
    email: 'teste@doxologos.com.br',
    user_metadata: {
      full_name: 'Usuário Teste'
    }
  };

  test('deve exibir Paciente para userRole="user" e redirecionar para /area-do-paciente', () => {
    render(<UserBadge user={mockUser} userRole="user" onLogout={jest.fn()} />);

    expect(screen.getAllByText('Paciente').length).toBeGreaterThan(0);
    
    const badgeButton = screen.getByRole('button', { name: /paciente/i });
    fireEvent.click(badgeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/area-do-paciente');
  });

  test('deve exibir Paciente para userRole="patient" e redirecionar para /area-do-paciente', () => {
    render(<UserBadge user={mockUser} userRole="patient" onLogout={jest.fn()} />);

    expect(screen.getAllByText('Paciente').length).toBeGreaterThan(0);

    const badgeButton = screen.getByRole('button', { name: /paciente/i });
    fireEvent.click(badgeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/area-do-paciente');
  });

  test('deve exibir Profissional para userRole="professional" e redirecionar para /profissional', () => {
    render(<UserBadge user={mockUser} userRole="professional" onLogout={jest.fn()} />);

    expect(screen.getAllByText('Profissional').length).toBeGreaterThan(0);

    const badgeButton = screen.getByRole('button', { name: /profissional/i });
    fireEvent.click(badgeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/profissional');
  });

  test('deve exibir Administrador para userRole="admin" e redirecionar para /admin', () => {
    render(<UserBadge user={mockUser} userRole="admin" onLogout={jest.fn()} />);

    expect(screen.getAllByText('Administrador').length).toBeGreaterThan(0);

    const badgeButton = screen.getByRole('button', { name: /administrador/i });
    fireEvent.click(badgeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  test('deve renderizar dropdown para usuário híbrido com múltiplos papéis e alternar perfil', () => {
    mockAuthContext = {
      availableRoles: ['professional', 'patient'],
      activeRole: 'professional',
      switchActiveRole: mockSwitchActiveRole,
    };

    render(<UserBadge user={mockUser} userRole="professional" onLogout={jest.fn()} />);

    // Deve ter título no botão de alternância
    const trigger = screen.getByTitle('Clique para alternar de perfil');
    expect(trigger).toBeInTheDocument();

    // Abre o dropdown via teclado no JSDOM
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });

    // Deve listar a opção de alternar para Paciente
    const patientOption = screen.getByText('Paciente');
    expect(patientOption).toBeInTheDocument();

    fireEvent.click(patientOption);

    expect(mockSwitchActiveRole).toHaveBeenCalledWith('patient');
    expect(mockNavigate).toHaveBeenCalledWith('/area-do-paciente');
  });

  test('não deve renderizar nada se o usuário for nulo', () => {
    const { container } = render(<UserBadge user={null} userRole="patient" onLogout={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});

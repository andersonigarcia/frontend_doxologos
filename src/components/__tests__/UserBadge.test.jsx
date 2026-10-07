import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserBadge from '../UserBadge';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('UserBadge Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    
    // Clica no badge
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

  test('não deve renderizar nada se o usuário for nulo', () => {
    const { container } = render(<UserBadge user={null} userRole="patient" onLogout={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});

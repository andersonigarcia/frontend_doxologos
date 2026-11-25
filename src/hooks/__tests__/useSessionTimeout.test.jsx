import React from 'react';
import { render } from '@testing-library/react';
import {
  useSessionTimeout,
  clearSessionTimeoutStorage,
  STORAGE_KEY_ACTIVITY,
  STORAGE_KEY_SESSION_START,
} from '../useSessionTimeout';

const mockSignOut = jest.fn(() => Promise.resolve({ error: null }));
const mockToast = jest.fn();

let mockAuthState = {
  user: null,
  signOut: mockSignOut,
};

jest.mock('@/contexts/SupabaseAuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/hooks/useSystemSettings', () => ({
  useSystemSettings: () => ({
    settings: {
      session_idle_timeout_minutes: 15,
      session_max_duration_hours: 6,
    },
  }),
}));

function TestHarness() {
  useSessionTimeout({ enabled: true });
  return null;
}

describe('useSessionTimeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockAuthState = {
      user: null,
      signOut: mockSignOut,
    };
  });

  test('clearSessionTimeoutStorage remove os marcadores de sessão do localStorage', () => {
    localStorage.setItem(STORAGE_KEY_ACTIVITY, '1000');
    localStorage.setItem(STORAGE_KEY_SESSION_START, '1000');

    clearSessionTimeoutStorage();

    expect(localStorage.getItem(STORAGE_KEY_ACTIVITY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_SESSION_START)).toBeNull();
  });

  test('não deve deslogar novo login quando marcadores antigos foram limpos antes da autenticação', () => {
    const expiredTimestamp = String(Date.now() - 24 * 60 * 60 * 1000);
    localStorage.setItem(STORAGE_KEY_ACTIVITY, expiredTimestamp);
    localStorage.setItem(STORAGE_KEY_SESSION_START, expiredTimestamp);

    const { rerender } = render(<TestHarness />);
    expect(mockSignOut).not.toHaveBeenCalled();

    clearSessionTimeoutStorage();
    mockAuthState = {
      user: { id: 'admin-1', email: 'admin@doxologos.com.br' },
      signOut: mockSignOut,
    };
    rerender(<TestHarness />);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY_ACTIVITY)).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_SESSION_START)).not.toBeNull();
  });

  test('deve deslogar sessão restaurada que já excedeu o tempo de inatividade', () => {
    const expiredTimestamp = String(Date.now() - 20 * 60 * 1000);
    localStorage.setItem(STORAGE_KEY_ACTIVITY, expiredTimestamp);
    localStorage.setItem(STORAGE_KEY_SESSION_START, String(Date.now() - 30 * 60 * 1000));

    mockAuthState = {
      user: { id: 'admin-1', email: 'admin@doxologos.com.br' },
      signOut: mockSignOut,
    };

    render(<TestHarness />);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
      })
    );
  });
});


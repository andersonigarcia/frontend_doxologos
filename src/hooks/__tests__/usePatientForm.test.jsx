import { StrictMode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePatientForm } from '../booking/usePatientForm.js';

const createStrictWrapper = () => ({ children }) => <StrictMode>{children}</StrictMode>;

describe('usePatientForm', () => {
  test('prefills values from authenticated user metadata', async () => {
    const authUser = {
      email: 'ana@example.com',
      user_metadata: {
        full_name: 'Ana Clara',
        phone: '11987654321'
      }
    };
    const wrapper = createStrictWrapper();
    const { result, unmount } = renderHook(() => usePatientForm({ authUser }), { wrapper });

    await waitFor(() => expect(result.current.getValues('email')).toBe('ana@example.com'));
    expect(result.current.getValues('name')).toBe('Ana Clara');
    expect(result.current.getValues('phone')).toBe('(11) 98765-4321');

    unmount();
  });

  test('handlePasswordResetRequest shows toast when email is invalid', async () => {
    const toast = jest.fn();
    const resetPassword = jest.fn();
    const wrapper = createStrictWrapper();
    const { result, unmount } = renderHook(() => usePatientForm({ toast, resetPassword }), { wrapper });

    await act(async () => {
      await result.current.handlePasswordResetRequest();
    });

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Informe um email') }));
    expect(resetPassword).not.toHaveBeenCalled();

    unmount();
  });

  test('handlePasswordResetRequest calls reset when email is valid', async () => {
    const toast = jest.fn();
    const resetPassword = jest.fn().mockResolvedValue(undefined);
    const wrapper = createStrictWrapper();
    const { result, unmount } = renderHook(() => usePatientForm({ toast, resetPassword }), { wrapper });

    act(() => {
      result.current.setValue('email', 'valid@example.com');
    });

    await act(async () => {
      await result.current.handlePasswordResetRequest();
    });

    expect(resetPassword).toHaveBeenCalledWith('valid@example.com');
    expect(toast).not.toHaveBeenCalled();

    unmount();
  });

  test('toggleExistingPatient flips mode and clears passwords', () => {
    const wrapper = createStrictWrapper();
    const { result, unmount } = renderHook(() => usePatientForm(), { wrapper });

    act(() => {
      result.current.setValue('password', '12345678');
      result.current.setValue('confirmPassword', '12345678');
      result.current.toggleExistingPatient();
    });

    expect(result.current.isExistingPatient).toBe(true);
    expect(result.current.getValues('password')).toBe('');
    expect(result.current.getValues('confirmPassword')).toBe('');

    unmount();
  });
});

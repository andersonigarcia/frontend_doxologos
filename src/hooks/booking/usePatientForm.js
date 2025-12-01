import { useCallback, useEffect, useState } from 'react';

export const INITIAL_PATIENT_DATA = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
};

export const formatPhoneNumber = (value = '') => {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  const limited = numbers.slice(0, 11);
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
};

export const validateEmail = (email) => {
  if (!email) {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function usePatientForm({ authUser, resetPassword, toast } = {}) {
  const [patientData, setPatientData] = useState(INITIAL_PATIENT_DATA);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePhoneChange = useCallback((event) => {
    const formatted = formatPhoneNumber(event.target.value);
    setPatientData((prev) => ({ ...prev, phone: formatted }));
  }, []);

  const handleEmailChange = useCallback((event) => {
    const email = event.target.value;
    setPatientData((prev) => ({ ...prev, email }));

    if (email && !validateEmail(email)) {
      setEmailError('Por favor, insira um email válido');
    } else {
      setEmailError('');
    }
  }, []);

  const handlePasswordChange = useCallback((value) => {
    setPatientData((prev) => ({ ...prev, password: value }));
    if (passwordError) {
      setPasswordError('');
    }
  }, [passwordError]);

  const handleConfirmPasswordChange = useCallback((value) => {
    setPatientData((prev) => ({ ...prev, confirmPassword: value }));
    if (passwordError) {
      setPasswordError('');
    }
  }, [passwordError]);

  const toggleExistingPatient = useCallback(() => {
    setIsExistingPatient((prev) => !prev);
    setPasswordError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPatientData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
  }, []);

  const handlePasswordResetRequest = useCallback(async () => {
    if (!patientData.email || emailError) {
      toast?.({
        variant: 'destructive',
        title: 'Informe um email válido',
        description: 'Use um email válido para receber o link de redefinição de senha.',
      });
      return;
    }

    await resetPassword?.(patientData.email);
  }, [emailError, patientData.email, resetPassword, toast]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const authMetadata = authUser.user_metadata || {};
    const authEmail = authUser.email || '';
    const authName = authMetadata.full_name || authMetadata.name || '';
    const authPhoneRaw = authMetadata.phone || authMetadata.phone_number || '';
    const formattedPhone = authPhoneRaw ? formatPhoneNumber(String(authPhoneRaw)) : '';

    setPatientData((prev) => {
      let changed = false;
      const next = { ...prev };

      if (!prev.email && authEmail) {
        next.email = authEmail;
        changed = true;
      }

      if (!prev.name && authName) {
        next.name = authName;
        changed = true;
      }

      if (!prev.phone && formattedPhone) {
        next.phone = formattedPhone;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [authUser]);

  return {
    patientData,
    setPatientData,
    emailError,
    passwordError,
    setPasswordError,
    isExistingPatient,
    setIsExistingPatient,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    handlePhoneChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    toggleExistingPatient,
    handlePasswordResetRequest,
    formatPhoneNumber,
    validateEmail,
  };
}

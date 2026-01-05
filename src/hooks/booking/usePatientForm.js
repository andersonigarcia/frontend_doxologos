import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEmailValidation } from './useEmailValidation';

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

const phoneDigits = (value = '') => value.replace(/\D/g, '');

const MIN_PASSWORD_LENGTH = 8;

const buildPatientSchema = ({ requireIdentityFields, requirePassword, requireConfirmation }) => {
  return z
    .object({
      name: z
        .string()
        .optional()
        .transform((value) => (value ?? '').trim()),
      email: z
        .string({ required_error: '📧 Por favor, informe seu email' })
        .trim()
        .min(1, '📧 Por favor, informe seu email')
        .email('📧 Este email não parece válido. Verifique se digitou corretamente'),
      phone: z
        .string()
        .optional()
        .transform((value) => (value ?? '').trim()),
      password: z
        .string()
        .optional()
        .transform((value) => value ?? ''),
      confirmPassword: z
        .string()
        .optional()
        .transform((value) => value ?? ''),
      acceptTerms: z.boolean().optional().transform((value) => Boolean(value)),
    })
    .superRefine((data, ctx) => {
      if (requireIdentityFields) {
        if (!data.name) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '👤 Por favor, informe seu nome completo',
            path: ['name']
          });
        }

        if (!data.phone) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '📱 Por favor, informe seu telefone com DDD',
            path: ['phone']
          });
        }
      }

      if (data.phone) {
        const digits = phoneDigits(data.phone);
        if (digits.length < 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '📱 Telefone incompleto. Use o formato (00) 00000-0000',
            path: ['phone']
          });
        }
      }

      if (requirePassword) {
        if (!data.password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '🔐 Por favor, informe sua senha de acesso',
            path: ['password']
          });
        } else if (data.password.length < MIN_PASSWORD_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `🔐 Sua senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres para proteger sua conta`,
            path: ['password'],
          });
        }
      }

      if (requireConfirmation) {
        if (!data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '🔄 Por favor, confirme sua senha',
            path: ['confirmPassword']
          });
        } else if (data.password !== data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '🔄 As senhas não conferem. Digite a mesma senha nos dois campos',
            path: ['confirmPassword']
          });
        }
      }
    });
};

export function usePatientForm({ authUser, resetPassword, toast } = {}) {
  const [passwordError, setPasswordError] = useState('');
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [autoToggleEnabled, setAutoToggleEnabled] = useState(true); // Controla se auto-toggle está ativo

  // Hook de validação de email
  const { checkEmail, isChecking, emailExists, error: emailCheckError, clearEmailCheck } = useEmailValidation();

  const schema = useMemo(
    () =>
      buildPatientSchema({
        requireIdentityFields: !authUser,
        requirePassword: !authUser,
        requireConfirmation: !authUser && !isExistingPatient,
      }),
    [authUser, isExistingPatient]
  );

  const form = useForm({
    defaultValues: INITIAL_PATIENT_DATA,
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    trigger,
    formState,
  } = form;

  const patientData = watch();
  const emailError = formState.errors.email?.message || '';

  const toggleExistingPatient = useCallback(() => {
    setIsExistingPatient((prev) => !prev);
    setPasswordError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setValue('password', '', { shouldDirty: false, shouldValidate: false });
    setValue('confirmPassword', '', { shouldDirty: false, shouldValidate: false });

    // Desabilitar auto-toggle quando usuário faz override manual
    setAutoToggleEnabled(false);
  }, [setValue]);

  const handlePasswordResetRequest = useCallback(async () => {
    const isValidEmail = await trigger('email');
    const email = getValues('email');

    if (!isValidEmail || !email) {
      toast?.({
        variant: 'destructive',
        title: 'Informe um email válido',
        description: 'Use um email válido para receber o link de redefinição de senha.',
      });
      return;
    }

    await resetPassword?.(email);
  }, [getValues, resetPassword, toast, trigger]);

  // Efeito para validação automática de email
  useEffect(() => {
    // Não fazer nada se usuário já está autenticado
    if (authUser) {
      return;
    }

    const email = patientData.email;

    // Limpar estado se email estiver vazio ou inválido
    if (!email || !validateEmail(email)) {
      clearEmailCheck();
      return;
    }

    // Verificar email automaticamente
    const verifyEmail = async () => {
      const exists = await checkEmail(email);

      // Se auto-toggle está habilitado, atualizar estado automaticamente
      if (autoToggleEnabled && exists !== null) {
        setIsExistingPatient(exists);

        // Limpar campos de senha quando muda o modo
        setValue('password', '', { shouldDirty: false, shouldValidate: false });
        setValue('confirmPassword', '', { shouldDirty: false, shouldValidate: false });
        setPasswordError('');
      }
    };

    verifyEmail();
  }, [patientData.email, authUser, checkEmail, clearEmailCheck, autoToggleEnabled, setValue]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const authMetadata = authUser.user_metadata || {};
    const authEmail = authUser.email || '';
    const authName = authMetadata.full_name || authMetadata.name || '';
    const authPhoneRaw = authMetadata.phone || authMetadata.phone_number || '';
    const formattedPhone = authPhoneRaw ? formatPhoneNumber(String(authPhoneRaw)) : '';

    if (!getValues('email') && authEmail) {
      setValue('email', authEmail, { shouldDirty: false });
    }

    if (!getValues('name') && authName) {
      setValue('name', authName, { shouldDirty: false });
    }

    if (!getValues('phone') && formattedPhone) {
      setValue('phone', formattedPhone, { shouldDirty: false });
    }
  }, [authUser, getValues, setValue]);

  return {
    form,
    register,
    control,
    handleSubmit,
    formState,
    patientData,
    emailError,
    passwordError,
    setPasswordError,
    isExistingPatient,
    setIsExistingPatient,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    toggleExistingPatient,
    handlePasswordResetRequest,
    setValue,
    getValues,
    trigger,
    formatPhoneNumber,
    validateEmail,
    // Novos estados de validação de email
    isCheckingEmail: isChecking,
    emailExists,
    emailCheckError,
    autoToggleEnabled,
    setAutoToggleEnabled,
  };
}

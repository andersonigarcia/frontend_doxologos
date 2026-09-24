import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Eye, EyeOff, KeyRound, Video, Loader2, CheckCircle, Sparkles, UserCheck, UserPlus, Info, CheckCircle2, Mail, Send, X, AlertCircle } from 'lucide-react';
import { formatPhoneNumber } from '@/hooks/booking/usePatientForm';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import Tooltip from '@/components/ui/Tooltip';

const PatientAccountStep = ({
  authUser,
  patientData = {},
  register = () => ({}),
  errors = {},
  emailError,
  passwordError,
  isExistingPatient,
  minPasswordLength = 8,
  showPassword,
  showConfirmPassword,
  meetingPlatform,
  meetingOptions = [],
  onToggleExistingPatient,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
  onPasswordResetRequest,
  onSelectMeetingPlatform,
  // Novos props para validação de email
  isCheckingEmail = false,
  emailExists = null,
  emailCheckError = null,
}) => {
  // Estado para modal de recuperação de senha
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState(null);

  // Handler para enviar email de recuperação
  const handleSendPasswordReset = async () => {
    setIsResettingPassword(true);
    setResetPasswordError(null);

    try {
      await onPasswordResetRequest();
      setResetPasswordSuccess(true);

      // Fechar modal após 3 segundos
      setTimeout(() => {
        setShowPasswordRecovery(false);
        setResetPasswordSuccess(false);
      }, 3000);
    } catch (error) {
      setResetPasswordError('Não foi possível enviar o email. Tente novamente.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Quem estará conosco nessa jornada?</h2>
        <p className="text-gray-600 text-sm sm:text-base">Seus dados são protegidos pelo sigilo ético profissional e pela LGPD.</p>
      </div>

      {!authUser && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email*</label>
            <div className="relative">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                {...register('email', {
                  setValueAs: (value) => (value ?? '').trim(),
                })}
                className={`w-full px-4 py-3 border rounded-2xl bg-gray-50/50 focus:bg-white transition-colors focus:ring-2 focus:ring-[#2d8659] focus:border-transparent ${emailError ? 'border-red-500' : emailExists === true ? 'border-green-500' : emailExists === false ? 'border-blue-500' : 'border-gray-200'
                  }`}
                placeholder="seu@email.com"
              />
              {isCheckingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Feedback de validação de email */}
            {isCheckingEmail && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-gray-600 mt-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando email...</span>
              </motion.div>
            )}

            {!isCheckingEmail && emailExists === true && !emailError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-green-600 mt-2 bg-green-50 px-3 py-2 rounded-2xl border border-green-200"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">✓ Que bom ter você de volta! Reconhecemos seu e-mail.</span>
              </motion.div>
            )}

            {!isCheckingEmail && emailExists === false && !emailError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-blue-600 mt-2 bg-blue-50 px-3 py-2 rounded-2xl border border-blue-200"
              >
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">✓ Seja muito bem-vindo(a)! Criaremos seu espaço seguro.</span>
              </motion.div>
            )}

            {emailCheckError && (
              <p className="text-amber-600 text-sm mt-2 bg-amber-50 px-3 py-2 rounded-2xl border border-amber-200">
                {emailCheckError}
              </p>
            )}

            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>

          <AnimatePresence>
            {!isExistingPatient && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Nome completo*</label>
                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="name"
                      {...register('name', {
                        setValueAs: (value) => (value ?? '').trim(),
                      })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50/50 focus:bg-white transition-colors focus:ring-2 focus:ring-[#2d8659] focus:border-transparent pr-10"
                      placeholder="Seu nome completo"
                    />
                    {/* Checkmark de validação */}
                    {patientData.name && !errors.name && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </motion.div>
                    )}
                  </div>
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Telefone*</label>
                  <div className="relative">
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      {...register('phone', {
                        onChange: (event) => {
                          const formatted = formatPhoneNumber(event.target.value);
                          event.target.value = formatted;
                        },
                      })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50/50 focus:bg-white transition-colors focus:ring-2 focus:ring-[#2d8659] focus:border-transparent pr-10"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                    {/* Checkmark de validação */}
                    {patientData.phone && !errors.phone && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </motion.div>
                    )}
                  </div>
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!authUser ? (
        <AnimatePresence>
          {emailExists === true && (
            <motion.div
              className="mt-8 overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Card Simplificado */}
              <div className={`relative rounded-2xl p-4 md:p-5 border transition-all duration-300 ${isExistingPatient
                ? 'bg-green-50 border-green-200'
                : 'bg-blue-50 border-blue-200'
                }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isExistingPatient
                      ? 'bg-green-100 text-green-600'
                      : 'bg-blue-100 text-blue-600'
                      }`}>
                      {isExistingPatient ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isExistingPatient ? 'text-green-900' : 'text-blue-900'}`}>
                        {isExistingPatient ? 'Bem-vindo de volta!' : 'Nova conta'}
                      </h3>
                      <p className={`text-xs ${isExistingPatient ? 'text-green-700' : 'text-blue-700'}`}>
                        {isExistingPatient ? 'Vincule seu agendamento' : 'Crie sua senha'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={onToggleExistingPatient}
                    className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${isExistingPatient
                      ? 'text-green-700 hover:bg-green-200/50'
                      : 'text-blue-700 hover:bg-blue-200/50'
                      }`}
                  >
                    {isExistingPatient ? 'Trocar' : 'Já tenho conta'}
                  </button>
                </div>

                {/* Descrição */}
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  {isExistingPatient
                    ? 'Digite sua senha para manter suas consultas organizadas no mesmo lugar.'
                    : `Defina uma senha segura com pelo menos ${minPasswordLength} caracteres para acompanhar suas consultas e acessar sua sala virtual.`}
                </p>

                {/* Campos de Senha */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Campo de Senha */}
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      {isExistingPatient ? 'Sua senha de acesso*' : 'Crie uma senha de acesso*'}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className={`w-full px-4 py-3 border rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:border-transparent pr-12 transition-all ${isExistingPatient
                        ? 'border-green-200 focus:ring-green-500'
                        : 'border-blue-200 focus:ring-blue-500'
                        }`}
                      placeholder={isExistingPatient ? 'Sua senha atual' : `Mínimo ${minPasswordLength} caracteres`}
                      autoComplete={isExistingPatient ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={onToggleShowPassword}
                      className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Indicador de Força de Senha - Apenas para Novos */}
                  <AnimatePresence>
                    {!isExistingPatient && (
                      <PasswordStrengthIndicator
                        password={patientData.password || ''}
                        isExistingPatient={isExistingPatient}
                      />
                    )}
                  </AnimatePresence>

                  {/* Campo de Confirmar Senha - Apenas para Novos */}
                  {!isExistingPatient && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Confirme a senha*
                      </label>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...register('confirmPassword')}
                        className="w-full px-4 py-3 border border-blue-200 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 transition-all"
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={onToggleShowConfirmPassword}
                        className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Footer com Links e Dicas */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-gray-600">
                      {isExistingPatient
                        ? 'Caso não lembre sua senha, solicite um link de redefinição.'
                        : 'Use esta senha para acompanhar consultas e reagendar quando precisar.'}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={onPasswordResetRequest}
                        className={`text-sm font-medium transition-colors ${isExistingPatient
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-blue-600 hover:text-blue-700'
                          } disabled:text-gray-400 disabled:hover:text-gray-400`}
                        disabled={!patientData.email || !!emailError}
                      >
                        Esqueci minha senha
                      </button>
                      <Link
                        to="/recuperar-senha"
                        className={`text-sm font-medium transition-colors ${isExistingPatient
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-blue-600 hover:text-blue-700'
                          }`}
                      >
                        Recuperar agora
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Erros */}
                {(passwordError || errors.password) && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm mt-4 bg-red-50 px-4 py-2 rounded-2xl border border-red-200"
                  >
                    {passwordError || errors.password?.message}
                  </motion.p>
                )}
                {!isExistingPatient && errors.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm mt-2 bg-red-50 px-4 py-2 rounded-2xl border border-red-200"
                  >
                    {errors.confirmPassword.message}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-800">
          Você está acessando como <span className="font-semibold">{authUser?.email}</span>. Usaremos seu cadastro atual para concluir o agendamento.
        </div>
      )}

      {/* Banner Informativo da Sala Online - Compacto e Mobile-Friendly */}
      <div className="mt-6 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2d8659]/10 text-[#2d8659] flex items-center justify-center flex-shrink-0">
          <Video className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">
              Atendimento Online via Google Meet
            </p>
            <span className="text-[11px] font-semibold bg-[#2d8659]/15 text-[#236b47] px-2 py-0.5 rounded-full">
              100% no navegador
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            Sessão individual, segura e sigilosa. O link exclusivo de acesso será enviado para seu e-mail e fica disponível na Área do Paciente.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PatientAccountStep;

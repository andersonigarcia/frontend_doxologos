import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Eye, EyeOff, KeyRound, Video, Loader2, CheckCircle, Sparkles, UserCheck, UserPlus } from 'lucide-react';
import { formatPhoneNumber } from '@/hooks/booking/usePatientForm';

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
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">Confirmação e Dados Pessoais</h2>
        <p className="text-gray-600 text-lg">Revise os detalhes e preencha seus dados para finalizar</p>
      </div>

      {!authUser && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome completo*</label>
            <input
              type="text"
              {...register('name', {
                setValueAs: (value) => (value ?? '').trim(),
              })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              placeholder="Seu nome completo"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email*</label>
            <div className="relative">
              <input
                type="email"
                {...register('email', {
                  setValueAs: (value) => (value ?? '').trim(),
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent ${emailError ? 'border-red-500' : emailExists === true ? 'border-green-500' : emailExists === false ? 'border-blue-500' : 'border-gray-300'
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
                className="flex items-center gap-2 text-sm text-green-600 mt-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">✓ Email encontrado - Bem-vindo de volta!</span>
              </motion.div>
            )}

            {!isCheckingEmail && emailExists === false && !emailError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-blue-600 mt-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200"
              >
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">✓ Novo por aqui? Vamos criar sua conta!</span>
              </motion.div>
            )}

            {emailCheckError && (
              <p className="text-amber-600 text-sm mt-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                {emailCheckError}
              </p>
            )}

            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Telefone*</label>
            <input
              type="tel"
              {...register('phone', {
                onChange: (event) => {
                  const formatted = formatPhoneNumber(event.target.value);
                  event.target.value = formatted;
                },
              })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>
        </div>
      )}

      {!authUser ? (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Card Visual com Gradiente */}
          <div className={`relative rounded-2xl p-6 border-2 transition-all duration-300 ${isExistingPatient
              ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 border-green-200'
              : 'bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50 border-blue-200'
            }`}>
            {/* Header do Card com Ícone */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                {/* Ícone Grande */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isExistingPatient
                    ? 'bg-green-500 shadow-lg shadow-green-200'
                    : 'bg-blue-500 shadow-lg shadow-blue-200'
                  }`}>
                  {isExistingPatient ? (
                    <UserCheck className="w-7 h-7 text-white" />
                  ) : (
                    <UserPlus className="w-7 h-7 text-white" />
                  )}
                </div>

                {/* Título e Subtítulo */}
                <div>
                  <h3 className={`text-xl font-bold mb-1 transition-colors duration-300 ${isExistingPatient ? 'text-green-900' : 'text-blue-900'
                    }`}>
                    {isExistingPatient ? 'Bem-vindo de volta!' : 'Novo por aqui?'}
                  </h3>
                  <p className={`text-sm transition-colors duration-300 ${isExistingPatient ? 'text-green-700' : 'text-blue-700'
                    }`}>
                    {isExistingPatient
                      ? 'Encontramos seu cadastro'
                      : 'Vamos criar sua conta'}
                  </p>
                </div>
              </div>

              {/* Botão de Override - Discreto mas Visível */}
              <button
                type="button"
                onClick={onToggleExistingPatient}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${isExistingPatient
                    ? 'text-green-700 hover:bg-green-100 border border-green-300'
                    : 'text-blue-700 hover:bg-blue-100 border border-blue-300'
                  }`}
              >
                {isExistingPatient ? 'Sou novo' : 'Já tenho conta'}
              </button>
            </div>

            {/* Descrição */}
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {isExistingPatient
                ? 'Informe sua senha atual para vincular este agendamento à sua conta.'
                : `Defina uma senha com pelo menos ${minPasswordLength} caracteres para acessar a Área do Paciente.`}
            </p>

            {/* Campos de Senha */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Campo de Senha */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  {isExistingPatient ? 'Senha do paciente*' : 'Crie uma senha*'}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:border-transparent pr-12 transition-all ${isExistingPatient
                      ? 'border-green-200 focus:ring-green-500 focus:border-green-500'
                      : 'border-blue-200 focus:ring-blue-500 focus:border-blue-500'
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
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 transition-all"
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
                className="text-red-600 text-sm mt-4 bg-red-50 px-4 py-2 rounded-lg border border-red-200"
              >
                {passwordError || errors.password?.message}
              </motion.p>
            )}
            {!isExistingPatient && errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-600 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg border border-red-200"
              >
                {errors.confirmPassword.message}
              </motion.p>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          Você está acessando como <span className="font-semibold">{authUser?.email}</span>. Usaremos seu cadastro atual para concluir o agendamento.
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Video className="w-5 h-5 text-[#2d8659]" />
          Como prefere acessar a consulta?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          A Doxologos utiliza o Google Meet para as consultas online.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          {meetingOptions.map((option) => {
            const Icon = option.icon || Video;
            const isActive = meetingPlatform === option.id;
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => onSelectMeetingPlatform?.(option.id)}
                aria-pressed={isActive}
                className={`w-full text-left border rounded-xl p-5 transition-all ${isActive
                  ? 'border-[#2d8659] bg-[#2d8659]/10 shadow-md'
                  : 'border-gray-200 bg-white hover:border-[#2d8659]/60 hover:bg-[#2d8659]/5'
                  }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-[#2d8659] text-white' : 'bg-gray-100 text-[#2d8659]'
                    }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{option.label}</p>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </div>
                <ul className="space-y-1 text-sm text-gray-600 pl-1">
                  {(option.highlights || []).map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#2d8659] mt-0.5 flex-shrink-0" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                <div
                  className={`mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${isActive ? 'text-[#2d8659]' : 'text-gray-400'
                    }`}
                >
                  {isActive ? 'Selecionado' : 'Selecionar'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default PatientAccountStep;

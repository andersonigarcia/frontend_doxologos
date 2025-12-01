import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Eye, EyeOff, KeyRound, Video } from 'lucide-react';
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
            <label className="block text-sm font-medium mb-2">Nome completo</label>
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
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              {...register('email', {
                setValueAs: (value) => (value ?? '').trim(),
              })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent ${
                emailError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="seu@email.com"
            />
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Telefone</label>
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
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#2d8659]" />
                {isExistingPatient ? 'Confirme seu acesso' : 'Crie sua senha de acesso'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isExistingPatient
                  ? 'Informe sua senha atual para vincular este agendamento à sua conta.'
                  : `Defina uma senha com pelo menos ${minPasswordLength} caracteres para acessar a Área do Paciente.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleExistingPatient}
              className="text-sm font-medium text-[#2d8659] hover:text-[#236b47] transition-colors self-start"
            >
              {isExistingPatient ? 'Sou um novo paciente' : 'Já sou paciente'}
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-sm font-medium mb-2">{isExistingPatient ? 'Senha do paciente' : 'Crie uma senha'}</label>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent pr-12"
                placeholder={isExistingPatient ? 'Sua senha atual' : `Mínimo ${minPasswordLength} caracteres`}
                autoComplete={isExistingPatient ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={onToggleShowPassword}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {!isExistingPatient && (
              <div className="relative">
                <label className="block text-sm font-medium mb-2">Confirme a senha</label>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent pr-12"
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={onToggleShowConfirmPassword}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {isExistingPatient
                ? 'Caso não lembre sua senha, solicite um link de redefinição abaixo.'
                : 'Use esta senha para acompanhar consultas e reagendar quando precisar.'}
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onPasswordResetRequest}
                className="text-sm font-medium text-[#2d8659] hover:text-[#236b47] disabled:text-gray-400 disabled:hover:text-gray-400"
                disabled={!patientData.email || !!emailError}
              >
                Esqueci minha senha
              </button>
              <Link to="/recuperar-senha" className="text-sm text-[#2d8659] hover:text-[#236b47] font-medium">
                Recuperar agora
              </Link>
            </div>
          </div>
          {(passwordError || errors.password) && (
            <p className="text-red-500 text-sm mt-3">{passwordError || errors.password?.message}</p>
          )}
          {!isExistingPatient && errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-2">{errors.confirmPassword.message}</p>
          )}
        </div>
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
          A Doxologos oferece Zoom e Google Meet. Escolha a plataforma que for mais confortável para você.
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
                className={`w-full text-left border rounded-xl p-5 transition-all ${
                  isActive
                    ? 'border-[#2d8659] bg-[#2d8659]/10 shadow-md'
                    : 'border-gray-200 bg-white hover:border-[#2d8659]/60 hover:bg-[#2d8659]/5'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-[#2d8659] text-white' : 'bg-gray-100 text-[#2d8659]'
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
                  className={`mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${
                    isActive ? 'text-[#2d8659]' : 'text-gray-400'
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

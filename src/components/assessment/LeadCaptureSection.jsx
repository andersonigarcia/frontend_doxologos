import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  User,
  Send,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveAssessmentLead } from '@/lib/assessmentService';
import { getAssessmentBookingLink } from '@/lib/assessmentEngine';
import { validateLeadData, validateLeadPhone, validateLeadEmail, validateLeadName } from '@/lib/leadValidator';
import analytics from '@/lib/analytics';

const formatBRPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const LeadCaptureSection = ({
  assessmentId,
  assessmentTitle,
  score,
  maxScore,
  severity,
  severityLabel,
  severitySummary,
  recommendations,
  spiritualBridge,
  dimensions = [],
  therapyQuestions = [],
  psychoeducation = '',
  answers,
  functionalImpact,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const clinicPhone = '5511917287583';
  const firstName = name.trim().split(' ')[0] || '';
  const greetingName = firstName ? `Me chamo ${firstName}. ` : '';
  const whatsappText = encodeURIComponent(
    `Olá! ${greetingName}Acabei de fazer a autoavaliação de ${assessmentTitle} no site da Doxologos e meu resultado indicou "${severityLabel || 'avaliação realizada'}". Gostaria de tirar dúvidas com a equipe e saber como funciona o atendimento com psicólogo.`
  );
  const directWhatsAppUrl = `https://wa.me/${clinicPhone}?text=${whatsappText}`;

  const directBookingUrl = getAssessmentBookingLink(
    { id: assessmentId, title: assessmentTitle },
    severity,
    { name, email, phone }
  );

  const handleBlurField = (field, value) => {
    if (!value || !value.trim()) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return;
    }

    if (field === 'name') {
      const res = validateLeadName(value);
      setFieldErrors((prev) => ({
        ...prev,
        name: res.isValid ? undefined : res.error,
      }));
    } else if (field === 'email') {
      const res = validateLeadEmail(value);
      setFieldErrors((prev) => ({
        ...prev,
        email: res.isValid ? undefined : res.error,
      }));
    } else if (field === 'phone') {
      const res = validateLeadPhone(value);
      setFieldErrors((prev) => ({
        ...prev,
        phone: res.isValid ? undefined : res.error,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const validation = validateLeadData({ name, email, phone });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      if (validation.errors.general) {
        setErrorMsg(validation.errors.general);
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await saveAssessmentLead({
        assessmentId,
        assessmentTitle,
        score,
        maxScore,
        severity,
        severityLabel,
        severitySummary,
        recommendations,
        spiritualBridge,
        dimensions,
        therapyQuestions,
        psychoeducation,
        name: validation.sanitized.name || name,
        email: validation.sanitized.email || email,
        phone: validation.sanitized.phone || phone,
        answers,
        functionalImpact,
      });

      if (result && result.success === false) {
        if (result.validationErrors) {
          setFieldErrors(result.validationErrors);
        }
        setErrorMsg(result.error || 'Por favor, confira os dados informados.');
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setErrorMsg('Ocorreu um imprevisto ao enviar. Seus dados foram guardados.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="w-full bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white rounded-3xl border border-emerald-200/80 p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-2.5 text-[#2d8659] mb-3">
        <Sparkles className="w-5 h-5" />
        <span className="text-xs font-bold uppercase tracking-wider">Aprofunde seu Autocuidado</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        Receba seu Relatório Completo + Guia Prático
      </h3>

      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        Preencha seus dados abaixo para receber uma cópia detalhada da sua avaliação com estratégias científicas e reflexões práticas para o seu dia a dia.
      </p>

      {isSubmitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-emerald-300 text-center space-y-4 shadow-sm"
        >
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-[#2d8659]">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-xl font-extrabold text-gray-900">Relatório Solicitado com Sucesso!</h4>
            <p className="text-sm text-gray-600 max-w-lg mx-auto mt-1 leading-relaxed">
              Enviamos uma cópia detalhada para <strong>{email || 'seu e-mail'}</strong>.
            </p>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-5 max-w-xl mx-auto text-left space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#2d8659] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-gray-900">
                  Quer dar o próximo passo com acolhimento profissional?
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-relaxed">
                  Não passe por esse momento sozinho(a). Nossa equipe clínica está pronta para tirar dúvidas no WhatsApp e direcionar você para o psicólogo ideal.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <a
                href={directWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#1ebc59] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
                onClick={() => {
                  try {
                    analytics.trackEvent('lead_whatsapp_click', {
                      assessment_id: assessmentId,
                      severity,
                    });
                  } catch (e) {}
                }}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Conversar no WhatsApp Agora</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <Link
                to={directBookingUrl}
                className="w-full sm:w-auto py-3 px-4 bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                onClick={() => {
                  try {
                    analytics.trackEvent('lead_booking_click', {
                      assessment_id: assessmentId,
                      severity,
                    });
                  } catch (e) {}
                }}
              >
                <Calendar className="w-4 h-4" />
                <span>Ver Horários Disponíveis</span>
              </Link>
            </div>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Nome */}
            <div>
              <label htmlFor="lead-name" className="block text-xs font-semibold text-gray-700 mb-1">
                Seu Nome
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="lead-name"
                  type="text"
                  placeholder="Ex: Maria Silva"
                  value={name}
                  onBlur={() => handleBlurField('name', name)}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 bg-white rounded-xl border text-sm outline-none transition-all ${
                    fieldErrors.name
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-gray-200 focus:border-[#2d8659] focus:ring-1 focus:ring-[#2d8659]'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 leading-tight">{fieldErrors.name}</p>
              )}
            </div>

            {/* E-mail */}
            <div>
              <label htmlFor="lead-email" className="block text-xs font-semibold text-gray-700 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="lead-email"
                  type="email"
                  placeholder="seu.email@gmail.com"
                  value={email}
                  onBlur={() => handleBlurField('email', email)}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg('');
                    if (fieldErrors.email || fieldErrors.general) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined, general: undefined }));
                    }
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 bg-white rounded-xl border text-sm outline-none transition-all ${
                    fieldErrors.email
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-gray-200 focus:border-[#2d8659] focus:ring-1 focus:ring-[#2d8659]'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 leading-tight">{fieldErrors.email}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label htmlFor="lead-phone" className="block text-xs font-semibold text-gray-700 mb-1">
                WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="lead-phone"
                  type="tel"
                  placeholder="(11) 98456-7890"
                  value={phone}
                  onBlur={() => handleBlurField('phone', phone)}
                  onChange={(e) => {
                    setPhone(formatBRPhone(e.target.value));
                    setErrorMsg('');
                    if (fieldErrors.phone || fieldErrors.general) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined, general: undefined }));
                    }
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 bg-white rounded-xl border text-sm outline-none transition-all ${
                    fieldErrors.phone
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-gray-200 focus:border-[#2d8659] focus:ring-1 focus:ring-[#2d8659]'
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 leading-tight">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
          )}

          {/* Consentimento LGPD */}
          <div className="flex items-start gap-2 pt-1">
            <input
              id="lead-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded text-[#2d8659] focus:ring-[#2d8659]"
            />
            <label htmlFor="lead-consent" className="text-xs text-gray-500 leading-tight">
              Concordo em receber meu relatório e comunicações de saúde mental da Doxologos. Seus dados estão 100% seguros e confidenciais sob a LGPD.
            </label>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !consent}
              className="w-full sm:w-auto bg-[#2d8659] hover:bg-[#236b46] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Meu Relatório Completo</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center gap-1.5 text-[11px] text-gray-600">
        <ShieldCheck className="w-3.5 h-3.5 text-[#2d8659]" />
        <span>Privacidade Garantida. Nunca enviamos spam ou compartilhamos seus contatos.</span>
      </div>
    </div>
  );
};

export default LeadCaptureSection;

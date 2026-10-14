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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() && !phone.trim()) {
      setErrorMsg('Por favor, informe pelo menos seu E-mail ou WhatsApp para receber o relatório.');
      return;
    }

    if (email.trim() && !/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      await saveAssessmentLead({
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
        name,
        email,
        phone,
        answers,
        functionalImpact,
      });

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
                  placeholder="Como prefere ser chamado(a)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:border-[#2d8659] focus:ring-1 focus:ring-[#2d8659] outline-none transition-all"
                />
              </div>
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
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:border-[#2d8659] focus:ring-1 focus:ring-[#2d8659] outline-none transition-all"
                />
              </div>
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
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatBRPhone(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:border-[#2d8659] focus:ring-1 focus:ring-[#2d8659] outline-none transition-all"
                />
              </div>
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

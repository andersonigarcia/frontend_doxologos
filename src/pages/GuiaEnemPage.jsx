import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Heart,
  Moon,
  MessageCircle,
  Coffee,
  ShieldAlert,
  ArrowRight,
  PhoneCall,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import SiteFooter from '@/components/common/SiteFooter';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePageTracking, useEventTracking } from '@/hooks/useAnalytics';
import { ENEM_CAMPAIGN } from '@/config/enemCampaign';

const CHECKLIST_ITEMS = [
  { id: 'inep', text: 'Conferir no site do Inep o local exato de prova, o horário de abertura dos portões e o que levar.' },
  { id: 'docs', text: 'Separar documento oficial original com foto e canetas esferográficas pretas em tubo transparente.' },
  { id: 'trajeto', text: 'Combinar o caminho até o local com folga de horário, prevendo trânsito atípico e imprevistos.' },
  { id: 'sono', text: 'Jantar leve e manter horário de dormir normal na véspera, evitando qualquer maratona de revisão noturna.' },
  { id: 'cafe', text: 'Café da manhã conhecido e habitual no dia da prova, sem novidades alimentares.' },
  { id: 'saida', text: 'Na saída de casa, uma frase curta e acolhedora: “Vai tranquilo. A gente te ama de qualquer jeito.”' },
  { id: 'retorno', text: 'Depois da prova, perguntar como ele está se sentindo antes de perguntar como foi a prova.' },
];

const PHRASES = [
  {
    instead: '“Esse ano é decisivo pra sua vida.”',
    tryThis: '“Esse ano é importante, e a sua vida é maior do que ele.”',
    why: 'Tira o peso de um veredito definitivo e lembra que a identidade do jovem não se resume a um teste.'
  },
  {
    instead: '“Você precisa passar.”',
    tryThis: '“Faz o seu melhor. A gente está com você.”',
    why: 'Troca a cobrança por apoio incondicional. Ele sabe que precisa se esforçar, mas precisa sentir segurança.'
  },
  {
    instead: '“Fulano estudou e passou de primeira.”',
    tryThis: '“Como você está se sentindo com tudo isso?”',
    why: 'Comparações geram ressentimento e vergonha. Perguntar sobre os sentimentos abre canal de diálogo.'
  },
  {
    instead: '“Investimos tanto em você esse ano.”',
    tryThis: '“Tenho muito orgulho de como você está se dedicando.”',
    why: 'Evita transferir uma dívida de culpa e valoriza o esforço real do processo em vez do resultado final.'
  },
  {
    instead: '“E se não der certo?”',
    tryThis: '“Se não der certo agora, a gente pensa junto no próximo passo.”',
    why: 'Demonstra que mesmo num cenário adverso a família continuará sendo um porto seguro.'
  }
];

export default function GuiaEnemPage() {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const trackEvent = useEventTracking();
  usePageTracking('/guia-enem', 'Guia ENEM para Famílias | Doxologos');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [copiedPhraseIndex, setCopiedPhraseIndex] = useState(null);

  const toggleCheck = (id) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const checkedCount = Object.values(next).filter(Boolean).length;
      trackEvent('checklist_toggle', {
        item_id: id,
        checked: next[id],
        completed_count: checkedCount
      });
      return next;
    });
  };

  const resetChecklist = () => {
    setCheckedItems({});
    toast({
      title: 'Checklist reiniciado',
      description: 'Todos os itens foram desmarcados.'
    });
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100);

  const handleDownloadPdf = () => {
    trackEvent('download_material', {
      material_id: 'guia_enem_pais',
      material_name: 'Guia Reta Final ENEM - Doxologos'
    });
  };

  const handleSharePage = async () => {
    const shareData = {
      title: 'Guia para Famílias - Reta final do ENEM',
      text: 'Como ajudar seu filho na reta final do ENEM sem aumentar a pressão (Guia gratuito da Doxologos):',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        trackEvent('share_click', { method: 'native_share', target: 'guia_enem' });
      } catch (err) {
        // usuário cancelou o compartilhamento nativo
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copiado!',
        description: 'Cole no WhatsApp ou envie para outros pais e mães.'
      });
      trackEvent('share_click', { method: 'clipboard_copy', target: 'guia_enem' });
    }
  };

  const handleCopyPhrase = (phrase, index) => {
    const textToCopy = `Dica para pais no ENEM:\nEm vez de: ${phrase.instead}\nExperimente dizer: ${phrase.tryThis}\n\n(Guia ENEM Doxologos: ${window.location.href})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPhraseIndex(index);
    setTimeout(() => setCopiedPhraseIndex(null), 3000);
    toast({
      title: 'Frase copiada!',
      description: 'Pronto para colar no WhatsApp ou enviar em conversa de família.'
    });
    trackEvent('phrase_copied', { phrase_index: index });
  };

  const handleCtaAgendamento = () => {
    trackEvent('generate_lead', {
      event_category: 'Conversion',
      event_label: 'agendar_consulta_guia_enem',
      source: 'guia_enem_page'
    });
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col text-[#262624]">
      <Helmet>
        <title>Reta final do ENEM: Como ajudar seu filho sem aumentar a pressão | Doxologos</title>
        <meta
          name="description"
          content="Guia prático e acolhedor para pais e mães: o que falar, como manter a rotina em casa, checklist da véspera e apoio emocional nesta reta final do ENEM 2026."
        />
        <link rel="canonical" href="https://doxologos.com.br/guia-enem" />

        {/* Open Graph / Facebook / WhatsApp */}
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Doxologos - Psicologia Clínica & Princípios Cristãos" />
        <meta property="og:url" content="https://doxologos.com.br/guia-enem" />
        <meta property="og:title" content="Reta final do ENEM: como ajudar seu filho sem aumentar a pressão" />
        <meta
          property="og:description"
          content="Guia gratuito para pais e mães: orientações práticas de psicólogos para acolher o vestibulando, reduzir a tensão e proteger a saúde emocional."
        />
        <meta property="og:image" content={ENEM_CAMPAIGN.ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Guia ENEM para Famílias - Doxologos" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Reta final do ENEM: como ajudar seu filho sem aumentar a pressão" />
        <meta
          name="twitter:description"
          content="Guia prático para pais e mães: o que dizer, o que observar em casa e checklist para as provas do ENEM."
        />
        <meta name="twitter:image" content={ENEM_CAMPAIGN.ogImageUrl} />

        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            'headline': 'Reta final do ENEM: como ajudar seu filho sem aumentar a pressão',
            'description': 'Guia para pais e mães de vestibulandos do ENEM com suporte emocional e prático.',
            'image': ENEM_CAMPAIGN.ogImageUrl,
            'author': {
              '@type': 'Organization',
              'name': 'Doxologos'
            },
            'publisher': {
              '@type': 'Organization',
              'name': 'Doxologos',
              'logo': {
                '@type': 'ImageObject',
                'url': 'https://doxologos.com.br/brand/logo-doxologos-horizontal.svg'
              }
            },
            'mainEntityOfPage': {
              '@type': 'WebPage',
              '@id': 'https://doxologos.com.br/guia-enem'
            }
          })}
        </script>
      </Helmet>

      {/* Header institucional Doxologos */}
      <HomeHeader
        activeEventsCount={0}
        user={user}
        userRole={userRole}
        onLogout={() => {
          signOut();
          setMobileMenuOpen(false);
        }}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <main className="flex-grow pt-20 sm:pt-24 pb-16">
        {/* ============================================================== */}
        {/* HERO SECTION                                                   */}
        {/* ============================================================== */}
        <section className="bg-gradient-to-b from-[#132d29] via-[#1b3c37] to-[#234c45] text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Luz de fundo decorativa */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#2d8659]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto relative z-10">
            {/* Tag / Badge */}
            <div className="inline-flex items-center gap-2 bg-[#2d8659]/30 border border-[#2d8659]/60 text-[#a9d6c3] px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide uppercase mb-6 backdrop-blur-xs">
              <BookOpen className="w-4 h-4 text-[#75caa6]" />
              {ENEM_CAMPAIGN.badge}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white mb-6">
              Reta final do ENEM:{' '}
              <span className="text-[#a9d6c3] font-serif italic block sm:inline">
                como ajudar seu filho sem aumentar a pressão
              </span>
            </h1>

            <p className="text-lg sm:text-2xl text-[#e4ede8] leading-relaxed mb-8 max-w-3xl">
              Este guia é para pais e mães que querem ajudar o filho a chegar inteiro até as provas: estudando, mas também
              dormindo, comendo e sabendo que é amado com qualquer resultado.
            </p>

            {/* Destaque das Datas das Provas */}
            <div className="grid grid-cols-2 sm:inline-flex gap-4 sm:gap-8 bg-white/10 backdrop-blur-md border border-white/15 p-4 sm:px-8 sm:py-5 rounded-2xl mb-10">
              <div className="border-l-4 border-[#2d8659] pl-3.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">{ENEM_CAMPAIGN.dates.firstDay}</div>
                <div className="text-[11px] sm:text-xs font-bold text-[#a9d6c3] uppercase tracking-wider">
                  {ENEM_CAMPAIGN.dates.firstDayLabel}
                </div>
              </div>
              <div className="border-l-4 border-[#2d8659] pl-3.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">{ENEM_CAMPAIGN.dates.secondDay}</div>
                <div className="text-[11px] sm:text-xs font-bold text-[#a9d6c3] uppercase tracking-wider">
                  {ENEM_CAMPAIGN.dates.secondDayLabel}
                </div>
              </div>
            </div>

            {/* Ações Principais do Hero */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href={ENEM_CAMPAIGN.pdfDownloadUrl}
                download="Guia_ENEM_Familias_Doxologos.pdf"
                onClick={handleDownloadPdf}
                className="bg-[#2d8659] hover:bg-[#236b46] text-white px-7 py-3.5 rounded-full font-bold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 text-center group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                Baixar Guia Oficial em PDF
              </a>

              <Button
                variant="outline"
                onClick={handleSharePage}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 px-6 py-3.5 rounded-full font-medium text-base flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-5 h-5 text-[#a9d6c3]" />
                Compartilhar com outros Pais
              </Button>
            </div>
          </div>
        </section>

        {/* Conteúdo Central do Guia */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-16">
          {/* ============================================================== */}
          {/* SEÇÃO 01: O QUE É NORMAL SENTIR NESTA FASE                     */}
          {/* ============================================================== */}
          <section className="bg-white p-6 sm:p-10 rounded-2xl border border-[#e8e2d8] shadow-xs">
            <div className="flex items-center gap-2.5 text-[#2d8659] font-bold text-xs uppercase tracking-widest mb-2">
              <span className="w-6 h-6 rounded-full bg-[#eaf3ee] flex items-center justify-center text-xs">01</span>
              Etapa de Reconhecimento
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1b3c37] mb-4">
              O que é normal sentir nesta fase
            </h2>
            <p className="text-base sm:text-lg text-[#4a4843] leading-relaxed mb-6">
              Ansiedade antes de uma prova importante é esperada. Um pouco de tensão ajuda a focar, e é comum que o
              adolescente fique mais irritado, mais cansado ou mais calado nestas semanas. Isso, sozinho, não é sinal de
              problema.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Card Esperado */}
              <div className="bg-[#f7faf8] border border-[#d2e4da] p-5 rounded-xl">
                <div className="flex items-center gap-2 text-[#2d8659] font-bold text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2d8659]" />
                  Comum e Esperado
                </div>
                <ul className="text-sm text-[#4a4843] space-y-2">
                  <li>• Dias em que ele parece mais calado ou introspectivo.</li>
                  <li>• Cansaço acumulado do ano letivo.</li>
                  <li>• Um frio na barriga saudável que mobiliza para estudar.</li>
                </ul>
              </div>

              {/* Card Alerta */}
              <div className="bg-[#fff9f6] border border-[#f4d2c4] p-5 rounded-xl">
                <div className="flex items-center gap-2 text-[#b04a29] font-bold text-sm mb-2">
                  <AlertCircle className="w-4 h-4 text-[#b04a29]" />
                  Sinal de Alerta (Atenção)
                </div>
                <p className="text-sm text-[#4a4843] leading-relaxed">
                  O sinal de alerta aparece quando a ansiedade passa a mandar na rotina: ele{' '}
                  <strong>não consegue dormir, não come direito, chora com frequência, trava diante dos estudos</strong> ou se
                  isola de todo mundo. Aí vale olhar com mais cuidado.
                </p>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* SEÇÃO 02: O QUE AJUDA EM CASA (6 ATITUDES)                     */}
          {/* ============================================================== */}
          <section className="bg-white p-6 sm:p-10 rounded-2xl border border-[#e8e2d8] shadow-xs">
            <div className="flex items-center gap-2.5 text-[#2d8659] font-bold text-xs uppercase tracking-widest mb-2">
              <span className="w-6 h-6 rounded-full bg-[#eaf3ee] flex items-center justify-center text-xs">02</span>
              Atitudes Práticas
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1b3c37] mb-2">O que ajuda em casa</h2>
            <p className="text-base text-[#4a4843] mb-6">
              O curso é uma porta de entrada, não a vida inteira. Muita gente boa mudou de rota no meio do caminho, e isso faz
              parte de crescer.
            </p>

            {/* Citação Bíblica em Destaque */}
            <div className="bg-[#faf7f2] border-l-4 border-[#b89c65] p-5 rounded-r-xl mb-8">
              <p className="font-serif italic text-base sm:text-lg text-[#2d2a26] leading-relaxed">
                “O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.”
              </p>
              <div className="text-xs font-semibold text-[#8c857b] mt-1.5 uppercase tracking-wider">
                Provérbios 16:9 (paráfrase)
              </div>
            </div>

            {/* Grid dos 6 Pilares */}
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Item 1 */}
              <div className="p-4 sm:p-5 rounded-xl border border-[#ece7df] bg-[#fbfbfa] hover:border-[#2d8659]/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eaf3ee] text-[#2d8659] flex items-center justify-center font-extrabold text-sm">
                    01
                  </div>
                  <h3 className="font-bold text-[#1b3c37] text-base">Proteja o sono</h3>
                </div>
                <p className="text-sm text-[#4a4843] leading-relaxed">
                  Madrugada de estudo rende menos do que uma noite inteira de descanso. Ajude a manter um horário de dormir
                  parecido todos os dias.
                </p>
              </div>

              {/* Item 2 */}
              <div className="p-4 sm:p-5 rounded-xl border border-[#ece7df] bg-[#fbfbfa] hover:border-[#2d8659]/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eaf3ee] text-[#2d8659] flex items-center justify-center font-extrabold text-sm">
                    02
                  </div>
                  <h3 className="font-bold text-[#1b3c37] text-base">Pergunte como ele está</h3>
                </div>
                <p className="text-sm text-[#4a4843] leading-relaxed">
                  Antes de perguntar quanto estudou. A primeira pergunta do dia diz o que importa mais para você.
                </p>
              </div>

              {/* Item 3 */}
              <div className="p-4 sm:p-5 rounded-xl border border-[#ece7df] bg-[#fbfbfa] hover:border-[#2d8659]/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eaf3ee] text-[#2d8659] flex items-center justify-center font-extrabold text-sm">
                    03
                  </div>
                  <h3 className="font-bold text-[#1b3c37] text-base">Mantenha as refeições</h3>
                </div>
                <p className="text-sm text-[#4a4843] leading-relaxed">
                  Comer junto, uma caminhada, um culto, um encontro com amigos. Pausa e vida normal não são tempo perdido.
                </p>
              </div>

              {/* Item 4 */}
              <div className="p-4 sm:p-5 rounded-xl border border-[#ece7df] bg-[#fbfbfa] hover:border-[#2d8659]/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eaf3ee] text-[#2d8659] flex items-center justify-center font-extrabold text-sm">
                    04
                  </div>
                  <h3 className="font-bold text-[#1b3c37] text-base">Não compare</h3>
                </div>
                <p className="text-sm text-[#4a4843] leading-relaxed">
                  Nem com o primo, nem com o filho do vizinho, nem com o irmão mais velho. Cada jovem tem o seu próprio tempo.
                </p>
              </div>

              {/* Item 5 */}
              <div className="p-4 sm:p-5 rounded-xl border border-[#ece7df] bg-[#fbfbfa] hover:border-[#2d8659]/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eaf3ee] text-[#2d8659] flex items-center justify-center font-extrabold text-sm">
                    05
                  </div>
                  <h3 className="font-bold text-[#1b3c37] text-base">Combine o pós-prova antes</h3>
                </div>
                <p className="text-sm text-[#4a4843] leading-relaxed">
                  Conversem desde já sobre os caminhos possíveis se o resultado vier diferente do esperado. Saber que existe
                  plano B tira peso do plano A.
                </p>
              </div>

              {/* Item 6 */}
              <div className="p-4 sm:p-5 rounded-xl border border-[#ece7df] bg-[#fbfbfa] hover:border-[#2d8659]/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eaf3ee] text-[#2d8659] flex items-center justify-center font-extrabold text-sm">
                    06
                  </div>
                  <h3 className="font-bold text-[#1b3c37] text-base">Amor não depende de nota</h3>
                </div>
                <p className="text-sm text-[#4a4843] leading-relaxed">
                  Diga com todas as letras que o amor não depende do resultado. Ele pode até já saber no coração, mas precisa
                  ouvir da sua boca.
                </p>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* SEÇÃO 03: FRASES QUE PESAM E O QUE DIZER NO LUGAR              */}
          {/* ============================================================== */}
          <section className="bg-white p-6 sm:p-10 rounded-2xl border border-[#e8e2d8] shadow-xs">
            <div className="flex items-center gap-2.5 text-[#2d8659] font-bold text-xs uppercase tracking-widest mb-2">
              <span className="w-6 h-6 rounded-full bg-[#eaf3ee] flex items-center justify-center text-xs">03</span>
              Comunicação Consciente
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1b3c37] mb-2">
              Frases que pesam e o que dizer no lugar
            </h2>
            <p className="text-base text-[#4a4843] mb-6">
              Quase sempre essas frases saem por amor e preocupação genuínos. O problema é o que o adolescente escuta nelas.
            </p>

            <div className="space-y-4">
              {PHRASES.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-[#e8e2d8] rounded-xl overflow-hidden hover:shadow-xs transition-shadow bg-[#fdfdfc]"
                >
                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#e8e2d8]">
                    {/* Em vez de */}
                    <div className="p-4 sm:p-5 bg-[#fcf9f9]">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#b04a29] mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#b04a29]" />
                        Em vez de dizer:
                      </div>
                      <div className="text-base font-semibold text-[#8c3e27]">{item.instead}</div>
                    </div>

                    {/* Experimente */}
                    <div className="p-4 sm:p-5 bg-[#f5f9f6]">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#2d8659] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#2d8659]" />
                          Experimente dizer:
                        </div>
                        <button
                          onClick={() => handleCopyPhrase(item, idx)}
                          className="text-xs text-[#2d8659] hover:text-[#1b3c37] font-semibold flex items-center gap-1 transition-colors px-2 py-0.5 rounded-sm hover:bg-[#e4ede8]"
                          title="Copiar frase para enviar no WhatsApp"
                        >
                          {copiedPhraseIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                      <div className="text-base font-bold text-[#1b3c37] mb-2">{item.tryThis}</div>
                      <p className="text-xs text-[#5f5d57] leading-relaxed">{item.why}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ============================================================== */}
          {/* SEÇÃO 04: VÉSPERA E DIA DA PROVA (CHECKLIST INTERATIVO)          */}
          {/* ============================================================== */}
          <section className="bg-white p-6 sm:p-10 rounded-2xl border border-[#e8e2d8] shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
              <div className="flex items-center gap-2.5 text-[#2d8659] font-bold text-xs uppercase tracking-widest">
                <span className="w-6 h-6 rounded-full bg-[#eaf3ee] flex items-center justify-center text-xs">04</span>
                Checklist da Família
              </div>
              {checkedCount > 0 && (
                <button
                  onClick={resetChecklist}
                  className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Desmarcar todos
                </button>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#1b3c37] mb-2">Véspera e dia da prova</h2>
            <p className="text-base text-[#4a4843] mb-6">
              Marque os itens à medida que vocês forem alinhando em casa. Uma boa organização prévia reduz a ansiedade de
              última hora.
            </p>

            {/* Barra de Progresso */}
            <div className="bg-[#f0ebe1] h-2.5 rounded-full overflow-hidden mb-6">
              <div
                className="bg-[#2d8659] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs font-semibold text-[#5a5852] mb-6 flex justify-between">
              <span>{checkedCount} de {CHECKLIST_ITEMS.length} itens conferidos</span>
              <span>{progressPercent}% pronto</span>
            </div>

            {/* Lista com Checkboxes Interativos */}
            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                      isChecked
                        ? 'bg-[#f4f9f6] border-[#2d8659]/40 text-[#1b3c37]'
                        : 'bg-[#faf9f7] border-[#ece7df] text-[#3d3b37] hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-[#2d8659] border-[#2d8659] text-white'
                          : 'border-gray-400 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className={`text-sm sm:text-base leading-snug ${isChecked ? 'line-through text-gray-500' : ''}`}>
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {checkedCount === CHECKLIST_ITEMS.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 rounded-xl bg-[#eaf3ee] border border-[#2d8659] text-[#1b3c37] text-sm text-center font-semibold"
              >
                🎉 Parabéns! Vocês prepararam tudo o que estava ao alcance da família. Agora é respirar fundo, descansar e
                confiar!
              </motion.div>
            )}
          </section>

          {/* ============================================================== */}
          {/* SEÇÃO 05: QUANDO PROCURAR AJUDA PROFISSIONAL                    */}
          {/* ============================================================== */}
          <section className="bg-white p-6 sm:p-10 rounded-2xl border border-[#e8e2d8] shadow-xs">
            <div className="flex items-center gap-2.5 text-[#b04a29] font-bold text-xs uppercase tracking-widest mb-2">
              <span className="w-6 h-6 rounded-full bg-[#fdeee9] flex items-center justify-center text-xs">05</span>
              Cuidado com a Saúde Mental
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1b3c37] mb-2">
              Quando procurar ajuda profissional
            </h2>
            <p className="text-base text-[#4a4843] mb-6">
              Procure um psicólogo se, por <strong>mais de duas semanas</strong>, você notar no jovem:
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              <div className="p-3.5 rounded-lg bg-[#faf8f5] border border-[#ebe5dc] text-sm font-medium text-[#2d2a26] flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#b04a29]" />
                Insônia ou sono muito desregulado
              </div>
              <div className="p-3.5 rounded-lg bg-[#faf8f5] border border-[#ebe5dc] text-sm font-medium text-[#2d2a26] flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#b04a29]" />
                Crises de choro, falta de ar ou pânico
              </div>
              <div className="p-3.5 rounded-lg bg-[#faf8f5] border border-[#ebe5dc] text-sm font-medium text-[#2d2a26] flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#b04a29]" />
                Isolamento social ou irritação que não passa
              </div>
              <div className="p-3.5 rounded-lg bg-[#faf8f5] border border-[#ebe5dc] text-sm font-medium text-[#2d2a26] flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#b04a29]" />
                Frases como “não vejo saída” ou “tanto faz”
              </div>
            </div>

            {/* Destaque Urgente / CVV */}
            <div className="bg-[#1b3c37] text-white p-6 sm:p-7 rounded-2xl relative overflow-hidden">
              <div className="text-sm font-bold text-[#f7d28b] mb-4 uppercase tracking-wide">
                Se ele falar em morrer ou em se machucar, não espere.
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white/10 p-5 rounded-xl border border-white/15">
                <div className="flex items-center gap-5">
                  <div className="text-5xl font-extrabold text-white tracking-tight">188</div>
                  <div>
                    <div className="font-bold text-base text-white">CVV · Centro de Valorização da Vida</div>
                    <div className="text-xs sm:text-sm text-[#d1e2db]">
                      Ligação gratuita e confidencial, 24 horas por dia. Também em{' '}
                      <a href="https://cvv.org.br" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-white">
                        cvv.org.br
                      </a>.
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[#a9d6c3] border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-5">
                  Em emergências médicas imediatas, procure o pronto-socorro mais próximo ou disque <strong>192 (SAMU)</strong>.
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* SEÇÃO 06: CONTE COM A DOXOLOGOS (CONVERSÃO & AGENDAMENTO)       */}
          {/* ============================================================== */}
          <section className="bg-gradient-to-br from-[#1b3c37] to-[#132d29] text-white p-8 sm:p-12 rounded-3xl shadow-xl border border-[#2d8659]/30 relative overflow-hidden">
            <div className="max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-2 bg-[#2d8659]/30 text-[#a9d6c3] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Apoio Especializado Online
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                Conte com a Doxologos
              </h2>

              <p className="text-base sm:text-lg text-[#e4ede8] leading-relaxed mb-4">
                A Doxologos é uma rede de psicólogos online que leva a sério a história, os valores e a fé de cada pessoa.
                Atendemos o adolescente com sigilo profissional e orientamos os pais com empatia e ciência.
              </p>

              <p className="text-base font-semibold text-[#a9d6c3] mb-8">
                Se essa reta final está pesando aí em casa, agende uma primeira conversa.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <Link
                  to="/agendamento"
                  onClick={handleCtaAgendamento}
                  className="bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-4 rounded-full font-bold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-center"
                >
                  <Calendar className="w-5 h-5" />
                  Agendar Primeira Conversa
                </Link>

                <a
                  href={ENEM_CAMPAIGN.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-6 py-4 rounded-full font-semibold text-base transition-all flex items-center justify-center gap-2 text-center"
                >
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </section>

          {/* Dica de Compartilhamento no Rodapé da Página */}
          <div className="text-center py-6 border-t border-[#e8e2d8]">
            <p className="text-sm text-[#737068] mb-3">
              Conhece outra família com filhos prestando o ENEM? Este guia pode ser um alívio nas próximas semanas.
            </p>
            <Button
              variant="outline"
              onClick={handleSharePage}
              className="rounded-full border-[#1b3c37] text-[#1b3c37] hover:bg-[#1b3c37] hover:text-white transition-all text-sm font-semibold"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar este Guia
            </Button>
          </div>
        </div>
      </main>

      <FloatingWhatsAppButton />
      <SiteFooter />
    </div>
  );
}

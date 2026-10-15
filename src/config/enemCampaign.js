/**
 * Configuração da Campanha ENEM - Doxologos
 * Permite gerenciar a exibição de banners e dados do guia.
 */
export const ENEM_CAMPAIGN = {
  // Controle de ativação do banner de topo no site
  // Quando false, o banner some mas a URL /guia-enem continua acessível (sem quebrar links externos)
  active: true,

  // Informações do Guia
  title: 'Reta final do ENEM: como ajudar seu filho sem aumentar a pressão',
  badge: 'Guia para Famílias · ENEM 2026',
  
  // Datas do Exame
  dates: {
    firstDay: '08/11',
    firstDayLabel: '1º Dia de Prova',
    secondDay: '15/11',
    secondDayLabel: '2º Dia de Prova',
    year: '2026'
  },

  // Links
  route: '/guia-enem',
  pdfDownloadUrl: '/materiais/guia-enem-pais.pdf',
  ogImageUrl: 'https://doxologos.com.br/materiais/og-guia-enem.jpg',

  // Contato e Agendamento
  whatsappNumber: '+55 11 91728-7583',
  whatsappMessage: 'Olá! Li o Guia do ENEM para famílias e gostaria de conversar sobre o atendimento com um psicólogo.',
  get whatsappUrl() {
    return `https://wa.me/5511917287583?text=${encodeURIComponent(this.whatsappMessage)}`;
  }
};

import React from 'react';
import { Helmet } from 'react-helmet-async';

const TermosCondicoesPage = () => {
  return (
    <>
      <Helmet>
        <title>Termos e Condições - Doxologos</title>
        <meta name="description" content="Termos e condições do contrato terapêutico da plataforma Doxologos" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8 sm:px-10">
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Termos e Condições do Contrato Terapêutico
            </h1>

            <div className="prose prose-lg max-w-none text-gray-700">
              <p className="mb-6">
                Este documento formaliza os termos do processo psicoterapêutico entre o paciente e o profissional de saúde vinculado à plataforma www.doxologos.com.br, com base na ética profissional, na legislação vigente e na Lei Geral de Proteção de Dados (LGPD).
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introdução ao Processo Terapêutico</h2>
              <p className="mb-4">
                No processo psicoterapêutico, identificaremos juntos as questões que surgirem das demandas que você desejar tratar. Inicialmente, realizaremos uma busca para compreender o caso e, subsequentemente, serão utilizados recursos terapêuticos com o objetivo de refinar as informações sobre as demandas apresentadas, a fim de oferecer os melhores encaminhamentos para o processo.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <p className="text-yellow-800 font-medium">
                  <strong>IMPORTANTE:</strong> Como a psicoterapia envolve, frequentemente, tocar em aspectos difíceis da sua vida, você poderá, eventualmente, experimentar sentimentos desconfortáveis como tristeza, ansiedade ou raiva. Esses sentimentos, quando ocorrem, fazem parte do processo. Portanto, entenda que muitas vezes eles são esperados.
                </p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Sigilo e Proteção de Dados</h2>
              <div className="space-y-2 mb-6">
                <p><strong>a)</strong> Todos os conteúdos das sessões são reservados e absolutamente sigilosos. As sessões não serão gravadas nem acompanhadas por terceiros, salvo mediante consentimento e autorização por escrito do paciente.</p>
                <p><strong>b)</strong> O material produzido nas sessões é de responsabilidade do profissional. Os registros serão sucintos, contendo apenas descrição e evolução do processo.</p>
                <p><strong>c)</strong> O contato com familiares ou terceiros ocorrerá somente com seu consentimento e será previamente negociado, exceto nos casos previstos pelo Código de Ética da Psicologia.</p>
                <p><strong>d)</strong> Em alguns casos, pode ser necessário entrar em contato com outros profissionais que estejam realizando seu acompanhamento terapêutico ou médico. Isso será acordado previamente em sessão.</p>
                <p><strong>e)</strong> Os dados pessoais e clínicos compartilhados serão tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD), com finalidade exclusiva de prestação dos serviços psicológicos.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Sessões</h2>
              <div className="space-y-2 mb-6">
                <p><strong>a)</strong> Cada sessão tem duração de 50 minutos.</p>
                <p><strong>b)</strong> Em caso de atrasos, o tempo será ajustado para não ultrapassar o horário final previsto para a sessão, a fim de não prejudicar o próximo paciente.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Atendimentos Online</h2>
              <p className="mb-6">
                As plataformas de comunicação utilizadas são ZOOM e Google Meet. Elas oferecem segurança, estabilidade e são acessíveis via navegador em celular ou computador. Certifique-se de que sua conexão de internet, câmera e microfone estejam configurados antes do início do atendimento. Em alguns casos, pode ser necessário instalar o aplicativo desses serviços.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Requisitos Técnicos</h2>
              <div className="space-y-2 mb-6">
                <p><strong>a)</strong> Conexão mínima de 15 Mbps de banda larga ou 4G.</p>
                <p><strong>b)</strong> Ambiente com máxima privacidade e conforto.</p>
                <p><strong>c)</strong> Recomenda-se o uso de fone de ouvido para evitar eco.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Agendamento e Periodicidade</h2>
              <div className="space-y-2 mb-6">
                <p><strong>a)</strong> As consultas podem ser agendadas a qualquer momento, respeitando, impreterivelmente, o limite de até 48 horas antes do atendimento e conforme a disponibilidade do profissional de sua escolha.</p>
                <p><strong>b)</strong> Para manter o mesmo profissional e horários fixos, recomenda-se o agendamento antecipado de um número de sessões. A plataforma não garante a reserva de horários fixos.</p>
                <p><strong>c)</strong> A frequência ideal é semanal, mas você pode optar por quinzenal, mensal ou sazonal, desde que haja espaço na agenda do profissional.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Valores e Pagamento</h2>
              <div className="space-y-2 mb-6">
                <p><strong>a)</strong> O valor das sessões será pago exclusivamente por meio da plataforma e poderá ser realizado via PIX, cartão de crédito/débito, conforme sua preferência.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Duração do Processo Terapêutico</h2>
              <div className="space-y-2 mb-6">
                <p><strong>a)</strong> Não há como determinar previamente o tempo de duração de um processo terapêutico. A duração depende da natureza da demanda, do apoio social e do seu compromisso com o processo.</p>
                <p><strong>b)</strong> Você pode encerrar o processo a qualquer momento. O profissional poderá pontuar e oferecer um feedback, mas a decisão final é sempre sua. Em hipótese alguma você será induzido ou pressionado a continuar o processo terapêutico.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Faltas e Cancelamentos</h2>
              <div className="space-y-2 mb-6">
                <p><strong>a)</strong> O não comparecimento à sessão, sem aviso prévio de menos 24 horas, não será reembolsado.</p>
                <p><strong>b)</strong> Casos excepcionais justificáveis deverão ser comunicados à administração da plataforma pelo e-mail: contato@doxologos.com.br.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Comunicação e Confirmação</h2>
              <p className="mb-6">
                O canal de comunicação oficial da Doxologos é o WhatsApp e o e-mail contato@doxologos.com.br. Todas as demandas serão respondidas o mais brevemente possível.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Limites e Emergências</h2>
              <div className="space-y-2 mb-6">
                <p><strong>a)</strong> O profissional não realiza diagnósticos médicos, prescrição de medicamentos ou intervenções fora do escopo da psicologia.</p>
                <p><strong>b)</strong> O processo terapêutico não se destina ao atendimento de situações de urgência ou risco iminente. Em tais casos, o paciente deve buscar imediatamente serviços especializados, políticas públicas de saúde ou pronto atendimento. O profissional poderá orientar, mas não se responsabiliza por intervenções emergenciais fora do escopo da psicologia clínica.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Consentimento e Foro</h2>
              <div className="space-y-4 mb-6">
                <p><strong>a)</strong> Declaro estar ciente de que o processo psicoterapêutico é conduzido com base em técnicas reconhecidas pela ciência psicológica, fundamentadas em princípios éticos e metodológicos. Reconheço que, embora o tratamento siga abordagens estruturadas e respaldadas por evidências, os resultados podem variar conforme fatores individuais, como o grau de envolvimento, a natureza da demanda, o contexto de vida e os recursos emocionais disponíveis. Entendo que o processo envolve tanto dimensões objetivas, como a aplicação de técnicas e estratégias, quanto subjetivas, como a vivência emocional e a construção de sentido, e que o progresso terapêutico ocorre de forma gradual e personalizada.</p>
                <p><strong>b)</strong> Este contrato será regido pelas leis brasileiras, e as partes elegem o foro da Comarca de Belo Horizonte para dirimir quaisquer controvérsias.</p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Direitos de Imagem e Comunicação Institucional</h2>
              <p className="mb-6">
                O paciente autoriza, de forma voluntária e revogável, o uso de depoimentos escritos ou gravados, desde que previamente autorizados por escrito, para fins institucionais da plataforma Doxologos. Nenhuma imagem, nome ou conteúdo será divulgado sem consentimento formal. A plataforma se compromete a preservar a privacidade e integridade do paciente em qualquer ação de comunicação.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-8">
                <p className="text-blue-800 font-medium italic">
                  *Declaro que li, compreendi e estou de acordo com os termos acima.*
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermosCondicoesPage;
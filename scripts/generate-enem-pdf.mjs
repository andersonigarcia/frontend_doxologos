import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Reta final do ENEM: como ajudar seu filho sem aumentar a pressão - Doxologos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #262624;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    @page {
      size: A4;
      margin: 0;
    }
    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      padding: 24mm 22mm 18mm 22mm;
      overflow: hidden;
    }

    /* Page 1: Dark Cover */
    .page-1 {
      background: #1b3c37;
      color: #ffffff;
      justify-content: space-between;
    }
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 12px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #ffffff;
    }
    .brand-sub {
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #9ec5b6;
      font-weight: 600;
    }
    .cover-body {
      margin-top: 35mm;
    }
    .cover-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #9ec5b6;
      margin-bottom: 20px;
      display: inline-block;
      border-left: 3px solid #2d8659;
      padding-left: 10px;
    }
    .cover-h1 {
      font-size: 40px;
      line-height: 1.15;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
    }
    .cover-desc {
      font-size: 16px;
      line-height: 1.6;
      color: #e2ede8;
      max-width: 500px;
      font-weight: 400;
    }
    .cover-dates {
      display: flex;
      gap: 30px;
      margin-top: 45mm;
      padding-top: 25px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }
    .date-box {
      border-left: 3px solid #2d8659;
      padding-left: 14px;
    }
    .date-num {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 4px;
    }
    .date-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #9ec5b6;
      text-transform: uppercase;
    }
    .cover-footer {
      font-size: 9.5px;
      color: #8faea2;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
    }

    /* Inner Pages: Clean White & Dark Forest Accents */
    .inner-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e4ded5;
      padding-bottom: 10px;
      margin-bottom: 18px;
    }
    .inner-logo {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #1b3c37;
    }
    .inner-cat {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: #8c857b;
    }

    .sec-num {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #2d8659;
      margin-bottom: 4px;
    }
    .sec-title {
      font-size: 20px;
      font-weight: 800;
      color: #1b3c37;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
    }
    p {
      font-size: 12.5px;
      line-height: 1.6;
      color: #3d3b37;
      margin-bottom: 10px;
    }
    .highlight-lead {
      background: #f4f8f6;
      border-left: 3px solid #2d8659;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin: 12px 0 18px 0;
      font-size: 12px;
      line-height: 1.55;
      color: #1b3c37;
    }

    .quote-box {
      background: #faf7f2;
      border-left: 3px solid #b89c65;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 14px 0 18px 0;
    }
    .quote-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 13.5px;
      color: #2d2a26;
      line-height: 1.5;
    }
    .quote-ref {
      font-size: 10.5px;
      color: #8c857b;
      margin-top: 5px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* Grid of 6 items */
    .pillar-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 18px;
      margin-top: 10px;
    }
    .pillar-item {
      display: flex;
      gap: 10px;
    }
    .pillar-idx {
      font-size: 14px;
      font-weight: 800;
      color: #2d8659;
      background: #eaf3ee;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .pillar-content strong {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #1b3c37;
      margin-bottom: 3px;
    }
    .pillar-content span {
      font-size: 11px;
      line-height: 1.45;
      color: #4a4843;
      display: block;
    }

    /* Comparison Table */
    .table-container {
      margin-top: 8px;
      margin-bottom: 20px;
      border: 1px solid #e4ded5;
      border-radius: 8px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #1b3c37;
      color: #ffffff;
      padding: 8px 12px;
      text-align: left;
      font-weight: 700;
      letter-spacing: 1.5px;
      font-size: 9.5px;
      text-transform: uppercase;
    }
    th:last-child {
      background: #234c45;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #ebe6df;
      line-height: 1.45;
      vertical-align: top;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:nth-child(even) {
      background: #faf9f6;
    }
    td:first-child {
      color: #8c4343;
      font-weight: 500;
      width: 44%;
      border-right: 1px solid #ebe6df;
    }
    td:last-child {
      color: #1b3c37;
      font-weight: 600;
    }

    /* Checklist */
    .checklist-list {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 11.5px;
      line-height: 1.4;
      color: #2d2a26;
      background: #faf9f7;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #ece7df;
    }
    .check-box {
      width: 14px;
      height: 14px;
      border: 2px solid #2d8659;
      border-radius: 3px;
      margin-top: 2px;
      flex-shrink: 0;
      background: #ffffff;
    }

    /* Section 05: Professional Help & CVV */
    .alert-card {
      background: #1b3c37;
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 10px;
      margin-top: 14px;
      margin-bottom: 18px;
    }
    .alert-warning-text {
      font-size: 13px;
      font-weight: 700;
      color: #f7d28b;
      margin-bottom: 12px;
      letter-spacing: 0.2px;
    }
    .cvv-flex {
      display: flex;
      align-items: center;
      gap: 18px;
      background: rgba(255, 255, 255, 0.08);
      padding: 12px 16px;
      border-radius: 8px;
    }
    .cvv-number {
      font-size: 38px;
      font-weight: 800;
      line-height: 1;
      color: #ffffff;
      letter-spacing: -1px;
    }
    .cvv-details strong {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 3px;
    }
    .cvv-details span {
      font-size: 10.5px;
      color: #d1e2db;
      display: block;
      line-height: 1.4;
    }

    /* Section 06: Doxologos CTA Card */
    .doxologos-card {
      border: 2px solid #2d8659;
      background: #f4f8f6;
      border-radius: 12px;
      padding: 18px 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .doxologos-card-text h3 {
      font-size: 18px;
      font-weight: 800;
      color: #1b3c37;
      margin-bottom: 6px;
    }
    .doxologos-card-text p {
      font-size: 11.5px;
      line-height: 1.5;
      color: #334e48;
      margin-bottom: 0;
    }
    .doxologos-card-badge {
      background: #1b3c37;
      color: #ffffff;
      font-weight: 700;
      font-size: 12px;
      padding: 10px 18px;
      border-radius: 30px;
      white-space: nowrap;
    }

    /* Inner Page Footer */
    .inner-footer {
      margin-top: auto;
      border-top: 1px solid #e4ded5;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #8c857b;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER -->
  <div class="page page-1">
    <div class="cover-header">
      <div class="brand-title">DOXOLOGOS</div>
      <div class="brand-sub">GUIA PARA FAMÍLIAS</div>
    </div>

    <div class="cover-body">
      <div class="cover-tag">ENEM 2026 · PARA PAIS E MÃES</div>
      <h1 class="cover-h1">Reta final do ENEM:<br>como ajudar seu filho<br>sem aumentar a pressão</h1>
      <p class="cover-desc">
        Este guia é para pais e mães que querem ajudar o filho a chegar inteiro até as provas: estudando, mas também dormindo, comendo e sabendo que é amado com qualquer resultado.
      </p>

      <div class="cover-dates">
        <div class="date-box">
          <div class="date-num">08/11</div>
          <div class="date-label">1º DIA DE PROVA</div>
        </div>
        <div class="date-box">
          <div class="date-num">15/11</div>
          <div class="date-label">2º DIA DE PROVA</div>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <span>Doxologos · doxologos.com.br</span>
      <span>contato@doxologos.com.br · WhatsApp +55 11 91728-7583</span>
    </div>
  </div>

  <!-- PAGE 2: NORMAL VS ALERTA & O QUE AJUDA EM CASA -->
  <div class="page">
    <div class="inner-header">
      <div class="inner-logo">DOXOLOGOS</div>
      <div class="inner-cat">GUIA PARA FAMÍLIAS · ENEM 2026</div>
    </div>

    <div class="sec-num">01</div>
    <div class="sec-title">O que é normal sentir nesta fase</div>
    <p>
      Ansiedade antes de uma prova importante é esperada. Um pouco de tensão ajuda a focar, e é comum que o adolescente fique mais irritado, mais cansado ou mais calado nestas semanas. Isso, sozinho, não é sinal de problema.
    </p>
    <div class="highlight-lead">
      <strong>O sinal de alerta:</strong> Aparece quando a ansiedade passa a mandar na rotina: ele não consegue dormir, não come direito, chora com frequência, trava diante dos estudos ou se isola de todo mundo. Aí vale olhar com mais cuidado, e o fim deste guia orienta como agir.
    </div>

    <div class="sec-num" style="margin-top: 16px;">02</div>
    <div class="sec-title">O que ajuda em casa</div>
    <p style="font-size: 12px; margin-bottom: 6px;">
      O curso é uma porta de entrada, não a vida inteira. Muita gente boa mudou de rota no meio do caminho, e isso faz parte de crescer.
    </p>

    <div class="quote-box">
      <div class="quote-text">"O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos."</div>
      <div class="quote-ref">Provérbios 16:9 (paráfrase)</div>
    </div>

    <div class="pillar-grid">
      <div class="pillar-item">
        <div class="pillar-idx">01</div>
        <div class="pillar-content">
          <strong>Proteja o sono.</strong>
          <span>Madrugada de estudo rende menos do que uma noite inteira de descanso. Ajude a manter um horário de dormir parecido todos os dias.</span>
        </div>
      </div>
      <div class="pillar-item">
        <div class="pillar-idx">02</div>
        <div class="pillar-content">
          <strong>Pergunte como ele está.</strong>
          <span>Antes de perguntar quanto estudou. A primeira pergunta do dia diz o que importa mais para você.</span>
        </div>
      </div>
      <div class="pillar-item">
        <div class="pillar-idx">03</div>
        <div class="pillar-content">
          <strong>Mantenha as refeições.</strong>
          <span>Comer junto, uma caminhada, um culto, um encontro com amigos. Pausa e um pouco de vida normal não são tempo perdido.</span>
        </div>
      </div>
      <div class="pillar-item">
        <div class="pillar-idx">04</div>
        <div class="pillar-content">
          <strong>Não compare.</strong>
          <span>Nem com o primo, nem com o filho do vizinho, nem com o irmão mais velho. Cada trajetória é individual.</span>
        </div>
      </div>
      <div class="pillar-item">
        <div class="pillar-idx">05</div>
        <div class="pillar-content">
          <strong>Combine o pós-prova antes.</strong>
          <span>Conversem desde já sobre os caminhos possíveis se o resultado vier diferente do esperado. Saber que existe plano B tira peso do plano A.</span>
        </div>
      </div>
      <div class="pillar-item">
        <div class="pillar-idx">06</div>
        <div class="pillar-content">
          <strong>Amor não depende da nota.</strong>
          <span>Diga isso com todas as letras. Ele pode até já saber em teoria, mas precisa ouvir agora.</span>
        </div>
      </div>
    </div>

    <div class="inner-footer">
      <span>Doxologos · doxologos.com.br · WhatsApp +55 11 91728-7583</span>
      <span>Reta final do ENEM · 2</span>
    </div>
  </div>

  <!-- PAGE 3: FRASES & CHECKLIST -->
  <div class="page">
    <div class="inner-header">
      <div class="inner-logo">DOXOLOGOS</div>
      <div class="inner-cat">GUIA PARA FAMÍLIAS · ENEM 2026</div>
    </div>

    <div class="sec-num">03</div>
    <div class="sec-title">Frases que pesam e o que dizer no lugar</div>
    <p style="font-size: 12px; margin-bottom: 6px;">
      Quase sempre essas frases saem por amor e preocupação genuínos. O problema é o que o adolescente escuta nelas.
    </p>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Em vez de</th>
            <th>Experimente</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>“Esse ano é decisivo pra sua vida.”</td>
            <td>“Esse ano é importante, e a sua vida é maior do que ele.”</td>
          </tr>
          <tr>
            <td>“Você precisa passar.”</td>
            <td>“Faz o seu melhor. A gente está com você.”</td>
          </tr>
          <tr>
            <td>“Fulano estudou e passou.”</td>
            <td>“Como você está se sentindo com tudo isso?”</td>
          </tr>
          <tr>
            <td>“Investimos tanto em você.”</td>
            <td>“Tenho orgulho de como você está se dedicando.”</td>
          </tr>
          <tr>
            <td>“E se não der certo?”</td>
            <td>“Se não der certo agora, a gente pensa junto no próximo passo.”</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sec-num" style="margin-top: 12px;">04</div>
    <div class="sec-title">Véspera e dia da prova</div>
    <div class="checklist-list">
      <div class="check-item">
        <div class="check-box"></div>
        <span>Conferir no site do Inep o local de prova, o horário dos portões e o que levar.</span>
      </div>
      <div class="check-item">
        <div class="check-box"></div>
        <span>Separar documento oficial com foto e o material permitido (caneta preta em tubo transparente).</span>
      </div>
      <div class="check-item">
        <div class="check-box"></div>
        <span>Combinar o caminho até o local com folga de horário para evitar imprevistos de trânsito.</span>
      </div>
      <div class="check-item">
        <div class="check-box"></div>
        <span>Jantar leve e horário de dormir normal na véspera, sem maratona de revisão ou café tarde da noite.</span>
      </div>
      <div class="check-item">
        <div class="check-box"></div>
        <span>Café da manhã conhecido e habitual, sem nenhuma novidade ou comida estranha no dia.</span>
      </div>
      <div class="check-item">
        <div class="check-box"></div>
        <span>Na saída de casa, uma frase curta de acolhimento: <strong>“Vai tranquilo. A gente te ama de qualquer jeito.”</strong></span>
      </div>
      <div class="check-item">
        <div class="check-box"></div>
        <span>Depois da prova, perguntar <strong>como ele está</strong> antes de perguntar como foi a prova.</span>
      </div>
    </div>

    <div class="inner-footer">
      <span>Doxologos · doxologos.com.br · WhatsApp +55 11 91728-7583</span>
      <span>Reta final do ENEM · 3</span>
    </div>
  </div>

  <!-- PAGE 4: AJUDA PROFISSIONAL & CONTE COM A DOXOLOGOS -->
  <div class="page">
    <div class="inner-header">
      <div class="inner-logo">DOXOLOGOS</div>
      <div class="inner-cat">GUIA PARA FAMÍLIAS · ENEM 2026</div>
    </div>

    <div class="sec-num">05</div>
    <div class="sec-title">Quando procurar ajuda profissional</div>
    <p style="font-size: 12px; margin-bottom: 8px;">
      Procure um psicólogo se, por mais de duas semanas consecutivas, você notar em seu filho:
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
      <div style="background: #faf8f5; border: 1px solid #ebe5dc; padding: 9px 12px; border-radius: 6px; font-size: 11px; color: #2d2a26;">
        • Insônia frequente ou sono muito desregulado
      </div>
      <div style="background: #faf8f5; border: 1px solid #ebe5dc; padding: 9px 12px; border-radius: 6px; font-size: 11px; color: #2d2a26;">
        • Crises de choro, falta de ar ou ataques de pânico
      </div>
      <div style="background: #faf8f5; border: 1px solid #ebe5dc; padding: 9px 12px; border-radius: 6px; font-size: 11px; color: #2d2a26;">
        • Isolamento social ou irritação constante
      </div>
      <div style="background: #faf8f5; border: 1px solid #ebe5dc; padding: 9px 12px; border-radius: 6px; font-size: 11px; color: #2d2a26;">
        • Frases como “não vejo saída” ou “tanto faz”
      </div>
    </div>

    <div class="alert-card">
      <div class="alert-warning-text">Se ele falar em morrer ou em se machucar, não espere.</div>
      <div class="cvv-flex">
        <div class="cvv-number">188</div>
        <div class="cvv-details">
          <strong>CVV · Centro de Valorização da Vida</strong>
          <span>Ligação gratuita e confidencial, 24 horas por dia. Também disponível em cvv.org.br.</span>
          <span style="margin-top: 4px; color: #f7d28b;">Em emergência imediata, procure o pronto-socorro ou ligue 192 (SAMU).</span>
        </div>
      </div>
    </div>

    <div class="sec-num" style="margin-top: 16px;">06</div>
    <div class="sec-title">Conte com a Doxologos</div>

    <div class="doxologos-card">
      <div class="doxologos-card-text">
        <h3>Psicologia Clínica & Princípios Cristãos</h3>
        <p style="margin-bottom: 6px;">
          A Doxologos é uma rede de psicólogos online que leva a sério a história, os valores e a fé de cada pessoa.
        </p>
        <p style="margin-bottom: 6px;">
          Atendemos o adolescente com total sigilo profissional e orientamos os pais com sabedoria.
        </p>
        <p style="font-weight: 700; color: #1b3c37;">
          Se essa reta final está pesando aí em casa, agende uma primeira conversa.
        </p>
      </div>
      <div class="doxologos-card-badge">
        doxologos.com.br
      </div>
    </div>

    <div class="inner-footer">
      <span>Doxologos · doxologos.com.br · WhatsApp +55 11 91728-7583</span>
      <span>Reta final do ENEM · 4</span>
    </div>
  </div>

</body>
</html>
`;

async function generate() {
  const outputPath = path.resolve(__dirname, '../public/materiais/guia-enem-pais.pdf');
  console.log('Iniciando geração do PDF em:', outputPath);

  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    preferCSSPageSize: true
  });

  await browser.close();
  console.log('✅ PDF gerado com sucesso em:', outputPath);
}

generate().catch(err => {
  console.error('Erro gerando PDF:', err);
  process.exit(1);
});

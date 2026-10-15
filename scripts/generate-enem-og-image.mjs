import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playfair+Display:ital,wght@1,600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #132d29 0%, #1b3c37 50%, #234c45 100%);
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #ffffff;
      padding: 60px 80px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(45, 134, 89, 0.3);
      border: 1px solid #2d8659;
      color: #9ec5b6;
      padding: 8px 18px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      width: fit-content;
    }
    h1 {
      font-size: 54px;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: -1px;
      color: #ffffff;
      margin-top: 20px;
      max-width: 900px;
    }
    p {
      font-size: 22px;
      color: #d1e2db;
      line-height: 1.5;
      margin-top: 18px;
      max-width: 820px;
    }
    .bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 24px;
    }
    .dates {
      display: flex;
      gap: 30px;
    }
    .date-pill {
      border-left: 4px solid #2d8659;
      padding-left: 14px;
    }
    .date-num {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
    }
    .date-desc {
      font-size: 13px;
      color: #9ec5b6;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .brand-box {
      text-align: right;
    }
    .brand-name {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 3px;
      color: #ffffff;
    }
    .brand-tag {
      font-size: 13px;
      color: #9ec5b6;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div>
    <div class="badge">📘 GUIA PARA FAMÍLIAS · ENEM 2026</div>
    <h1>Reta final do ENEM: como ajudar seu filho sem aumentar a pressão</h1>
    <p>O que dizer, como acolher, o que observar em casa e como proteger a saúde emocional do vestibulando nesta reta final.</p>
  </div>
  <div class="bottom-row">
    <div class="dates">
      <div class="date-pill">
        <div class="date-num">08/11</div>
        <div class="date-desc">1º Dia de Prova</div>
      </div>
      <div class="date-pill">
        <div class="date-num">15/11</div>
        <div class="date-desc">2º Dia de Prova</div>
      </div>
    </div>
    <div class="brand-box">
      <div class="brand-name">DOXOLOGOS</div>
      <div class="brand-tag">PSICOLOGIA CLÍNICA & VALORES</div>
    </div>
  </div>
</body>
</html>
`;

async function run() {
  const outputPath = path.resolve(__dirname, '../public/materiais/og-guia-enem.jpg');
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 90 });
  await browser.close();
  console.log('✅ Open Graph banner gerado com sucesso em:', outputPath);
}

run().catch(console.error);

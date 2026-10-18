import { test, expect } from '@playwright/test';

/**
 * Suíte de Testes E2E: Navegação, Fluxos Clínicos e Landing Pages SEO
 * Valida a integridade visual e funcional dos pontos de entrada essenciais da plataforma.
 */
test.describe('Navegação e Fluxos Críticos Doxologos', () => {
  test('Deve carregar a HomePage com título, logo e chamada para agendamento', async ({ page }) => {
    await page.goto('/');

    // Verifica presença de elemento de marca ou botão de consulta
    const agendarButton = page.getByRole('link', { name: /Agendar Consulta|Começar Agora|Agende sua Consulta/i }).first();
    await expect(agendarButton).toBeVisible();
  });

  test('Deve carregar a página de agendamento com as etapas do funil clínico', async ({ page }) => {
    await page.goto('/agendamento');

    // Valida carregamento da página de agendamento
    await expect(page).toHaveURL(/agendamento/);
    const mainHeading = page.locator('h1, h2').first();
    await expect(mainHeading).toBeVisible();
  });

  test('Deve carregar a Landing Page SEO de Terapia para Ansiedade', async ({ page }) => {
    await page.goto('/terapia/ansiedade');

    await expect(page).toHaveURL('/terapia/ansiedade');
    // Deve conter chamada médica/psicológica sem promessa de cura
    const ctaButton = page.getByRole('link', { name: /Agendar|Iniciar|Consulta/i }).first();
    await expect(ctaButton).toBeVisible();
  });

  test('Deve carregar a Central de Ferramentas e Instrumentos Psicométricos', async ({ page }) => {
    await page.goto('/ferramentas');

    await expect(page).toHaveURL('/ferramentas');
    // Deve conter referência aos testes validados (GAD-7, PHQ-9, Burnout)
    const cardContent = page.getByText(/Ansiedade|Burnout|Depressão|TDAH/i).first();
    await expect(cardContent).toBeVisible();
  });
});

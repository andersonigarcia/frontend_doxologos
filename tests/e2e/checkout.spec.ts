import { test, expect } from '@playwright/test';

/**
 * Suíte de Testes E2E: Checkout & Compliance TCLE (Resolução CFP nº 11/2018)
 * Valida resiliência do checkout transparente Mercado Pago e aceites legais do paciente.
 */
test.describe('Checkout & Consentimento TCLE/CFP', () => {
  test('Deve exigir o aceite do TCLE/CFP antes de permitir avançar para o pagamento', async ({ page }) => {
    // Redireciona para o checkout com parâmetros de teste
    await page.goto('/checkout?booking_id=00000000-0000-0000-0000-000000000001&valor=150.00');

    // Aguarda elemento de checkout carregar
    const tcleCheckbox = page.locator('input[data-testid="tcle-checkbox"]');
    await expect(tcleCheckbox).toBeVisible();
    await expect(tcleCheckbox).not.toBeChecked();

    // O botão de continuar pagamento deve estar desabilitado enquanto TCLE não for marcado
    const paymentButton = page.getByRole('button', { name: /Continuar para Pagamento|Pagar via Mercado Pago|Confirmar/i }).first();
    await expect(paymentButton).toBeDisabled();

    // Marca a caixa de consentimento do TCLE / CFP
    await tcleCheckbox.check();
    await expect(tcleCheckbox).toBeChecked();

    // O botão de continuar pagamento deve ficar habilitado após o aceite
    await expect(paymentButton).toBeEnabled();
  });

  test('Deve permitir trocar entre PIX e Cartão de Crédito no Checkout', async ({ page }) => {
    await page.goto('/checkout?booking_id=00000000-0000-0000-0000-000000000001&valor=150.00');

    // Seleciona método Cartão de Crédito
    const creditCardOption = page.getByText('Cartão de Crédito');
    await creditCardOption.click();

    // Marca o TCLE
    const tcleCheckbox = page.locator('input[data-testid="tcle-checkbox"]');
    await tcleCheckbox.check();

    // Verifica se o botão de Formulário Direto de Cartão está habilitado
    const directCardButton = page.getByRole('button', { name: /Pagar com Cartão \(Formulário Direto\)/i });
    await expect(directCardButton).toBeVisible();
    await expect(directCardButton).toBeEnabled();
  });

  test('Deve validar TCLE e desabilitar botão de submissão no Checkout Direto de Cartão', async ({ page }) => {
    await page.goto('/checkout-direct?booking_id=00000000-0000-0000-0000-000000000001&valor=150.00');

    const submitButton = page.getByRole('button', { name: /Pagar R\$/i });
    const tcleCheckbox = page.locator('input[data-testid="tcle-checkbox"]');

    await expect(tcleCheckbox).toBeVisible();
    await expect(tcleCheckbox).not.toBeChecked();
    await expect(submitButton).toBeDisabled();

    // Marca TCLE
    await tcleCheckbox.check();
    await expect(submitButton).toBeEnabled();
  });

  test('Deve redirecionar para a página de Termos e Privacidade ao clicar no link de termos', async ({ page }) => {
    await page.goto('/checkout?booking_id=00000000-0000-0000-0000-000000000001&valor=150.00');

    const termsLink = page.getByRole('link', { name: /Ver termos completos/i });
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute('href', '/termos');
  });
});

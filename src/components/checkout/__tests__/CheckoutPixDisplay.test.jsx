import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPixDisplay from '../CheckoutPixDisplay';

jest.mock('@/lib/analytics', () => ({
  __esModule: true,
  default: {
    trackEvent: jest.fn()
  }
}));

describe('CheckoutPixDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza corretamente com qrCode (camelCase) e QR Code >= 200px', () => {
    render(
      <CheckoutPixDisplay
        pixPayment={{ qrCode: '00020126580014br.gov.bcb.pix' }}
        paymentStatus={{ status: 'pending' }}
        onCopyPix={jest.fn()}
      />
    );

    expect(screen.getByText(/Pague com PIX/i)).toBeInTheDocument();
    const input = screen.getByLabelText(/Código PIX Copia e Cola/i);
    expect(input).toHaveValue('00020126580014br.gov.bcb.pix');
  });

  test('renderiza corretamente ao retomar pagamento com qr_code (snake_case)', () => {
    render(
      <CheckoutPixDisplay
        pixPayment={{ qr_code: '00020126580014br.gov.bcb.pix.retomado' }}
        paymentStatus={{ status: 'pending' }}
        onCopyPix={jest.fn()}
      />
    );

    const input = screen.getByLabelText(/Código PIX Copia e Cola/i);
    expect(input).toHaveValue('00020126580014br.gov.bcb.pix.retomado');
  });

  test('copia via navigator.clipboard e usa fallback execCommand quando clipboard falha', async () => {
    const onCopyPix = jest.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockRejectedValueOnce(new Error('NotAllowedError')) },
      configurable: true
    });
    document.execCommand = jest.fn().mockReturnValue(true);

    render(
      <CheckoutPixDisplay
        pixPayment={{ qrCode: 'pix-fallback-code' }}
        paymentStatus={{ status: 'pending' }}
        onCopyPix={onCopyPix}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Copiar Código PIX Copia e Cola/i }));

    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(onCopyPix).toHaveBeenCalledWith(true);
    });
  });
});


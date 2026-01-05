import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const Providers = ({ children, initialEntries }) => (
  <HelmetProvider>
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  </HelmetProvider>
);

export const renderWithProviders = (ui, options = {}) => {
  const { initialEntries = ['/'], wrapper: CustomWrapper, ...restOptions } = options;

  if (CustomWrapper) {
    return render(ui, { wrapper: CustomWrapper, ...restOptions });
  }

  return render(ui, {
    wrapper: ({ children }) => (
      <Providers initialEntries={initialEntries}>{children}</Providers>
    ),
    ...restOptions
  });
};

export * from '@testing-library/react';

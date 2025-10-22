import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading } from './Loading';

describe('Loading', () => {
  it('should render with default message', () => {
    render(<Loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<Loading message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('should not render message when empty', () => {
    render(<Loading message="" />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should render small size spinner', () => {
    const { container } = render(<Loading size="small" />);
    const spinners = container.querySelectorAll('div');
    const spinnerElement = spinners[1]; // Second div is the spinner
    expect(spinnerElement).toBeTruthy();
    expect(spinnerElement?.getAttribute('style')).toContain('20px');
  });

  it('should render medium size spinner by default', () => {
    const { container } = render(<Loading />);
    const spinners = container.querySelectorAll('div');
    const spinnerElement = spinners[1];
    expect(spinnerElement).toBeTruthy();
    expect(spinnerElement?.getAttribute('style')).toContain('40px');
  });

  it('should render large size spinner', () => {
    const { container } = render(<Loading size="large" />);
    const spinners = container.querySelectorAll('div');
    const spinnerElement = spinners[1];
    expect(spinnerElement).toBeTruthy();
    expect(spinnerElement?.getAttribute('style')).toContain('60px');
  });

  it('should have spinner animation', () => {
    const { container } = render(<Loading />);
    const spinners = container.querySelectorAll('div');
    const spinnerElement = spinners[1];
    expect(spinnerElement?.getAttribute('style')).toContain('spin');
  });
});

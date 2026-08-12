import React from 'react';

/**
 * Componente oficial do Logotipo da DOXOLOGOS - Instituto de Cuidado Integral.
 * 
 * @param {Object} props
 * @param {'horizontal' | 'white' | 'shield' | 'petroleum'} [props.variant='horizontal'] Variante do logotipo
 * @param {string} [props.className='h-8 w-auto'] Classes Tailwind para dimensão e posicionamento
 * @param {string} [props.alt='Doxologos - Instituto de Cuidado Integral'] Texto alternativo de acessibilidade
 */
export const DoxologosLogo = ({
  variant = 'horizontal',
  className = 'h-8 w-auto',
  alt = 'Doxologos - Instituto de Cuidado Integral',
  ...props
}) => {
  let src = '/brand/logo-doxologos-horizontal.svg';

  if (variant === 'white') {
    src = '/brand/logo-doxologos-white.svg';
  } else if (variant === 'shield') {
    src = '/brand/logo-doxologos-shield.svg';
  } else if (variant === 'petroleum') {
    src = '/brand/logo-doxologos-horizontal.svg';
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block object-contain transition-opacity duration-200 ${className}`}
      {...props}
    />
  );
};

export default DoxologosLogo;

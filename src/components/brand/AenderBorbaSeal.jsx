import React from 'react';

/**
 * Componente oficial do Selo Institucional Aender Borba.
 * 
 * @param {Object} props
 * @param {string} [props.className='h-16 w-auto'] Classes Tailwind de estilização
 * @param {string} [props.alt='Selo Institucional Aender Borba'] Texto de acessibilidade
 */
export const AenderBorbaSeal = ({
  className = 'h-16 w-auto',
  alt = 'Selo Institucional Aender Borba',
  ...props
}) => {
  return (
    <img
      src="/brand/selo-aender-borba.svg"
      alt={alt}
      className={`inline-block object-contain ${className}`}
      {...props}
    />
  );
};

export default AenderBorbaSeal;

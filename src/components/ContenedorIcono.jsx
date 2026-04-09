import React from 'react';

const ContenedorIcono = ({ 
  children, 
  tamano = 'md', 
  color = 'accent',
  className = '',
  ...props 
}) => {
  const clasesTamano = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const clasesTamanoIcono = {
    sm: 'w-4 h-4',
    md: 'w-6 w-6',
    lg: 'w-8 h-8', 
    xl: 'w-10 h-10'
  };

  const clasesColor = {
    accent: 'bg-accent/10 text-accent',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success'
  };

  return (
    <div 
      className={`mx-auto rounded-full flex items-center justify-center ${clasesColor[color]} ${clasesTamano[tamano]} ${className}`}
      {...props}
    >
      <div className={clasesTamanoIcono[tamano]}>
        {children}
      </div>
    </div>
  );
};

export default ContenedorIcono;

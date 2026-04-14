import React from 'react';
import PropTypes from 'prop-types';

const ContenedorIcono = ({ 
  children, 
  size = 'md', 
  color = 'accent',
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 w-6',
    lg: 'w-8 h-8', 
    xl: 'w-10 h-10'
  };

  const colorClasses = {
    accent: 'bg-accent/10 text-accent',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success'
  };

  return (
    <div 
      className={`mx-auto rounded-full flex items-center justify-center ${colorClasses[color]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <div className={iconSizeClasses[size]}>
        {children}
      </div>
    </div>
  );
};

ContenedorIcono.propTypes = {
  children: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf(['accent', 'danger', 'warning', 'success']),
  className: PropTypes.string,
};

export default ContenedorIcono;

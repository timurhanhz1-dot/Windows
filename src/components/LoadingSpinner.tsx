import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  text,
  className = '' 
}: LoadingSpinnerProps) => {
  const { t } = useTranslation();
  const displayText = text !== undefined ? text : t('common.loading');
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 
        className={`${sizeClasses[size]} animate-spin text-blue-400`} 
      />
      {displayText && (
        <span className="text-sm text-white/60">{displayText}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;

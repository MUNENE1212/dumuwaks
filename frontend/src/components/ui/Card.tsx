import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated';
}

export const Card: React.FC<CardProps> = ({ children, className, variant = 'default', ...props }) => {
  const variantStyles = {
    default: 'bg-surface-200 border-line',
    glass: 'bg-surface-200 border-line',
    elevated: 'bg-surface-300 border-line-strong',
  };

  return (
    <div className={clsx('rounded-md border transition-colors duration-150', variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, ...props }) => {
  return (
    <div className={clsx('flex flex-col space-y-1.5 p-6 border-b border-line', className)} {...props}>
      {children}
    </div>
  );
};

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className, ...props }) => {
  return (
    <h3 className={clsx('font-display text-heading text-ink', className)} {...props}>
      {children}
    </h3>
  );
};

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className, ...props }) => {
  return <p className={clsx('text-body-sm text-ink-muted', className)} {...props}>{children}</p>;
};

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className, ...props }) => {
  return <div className={clsx('p-6 pt-0', className)} {...props}>{children}</div>;
};

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className, ...props }) => {
  return <div className={clsx('flex items-center p-6 pt-0 border-t border-line', className)} {...props}>{children}</div>;
};

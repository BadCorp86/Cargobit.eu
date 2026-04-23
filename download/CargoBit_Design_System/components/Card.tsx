/**
 * CargoBit Design System - Card Component
 * Version: 1.0.0
 * 
 * A versatile card component for displaying content with optional risk level indicators,
 * elevations, and interactive states.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

// ========================================
// Card Variants
// ========================================
const cardVariants = cva(
  // Base styles
  'bg-white rounded-[var(--radius-lg)] transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border border-neutral-200 shadow-card',
        elevated: 'border-0 shadow-dropdown',
        outlined: 'border-2 border-neutral-200 shadow-none',
        ghost: 'border-0 shadow-none bg-transparent'
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8'
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-dropdown hover:border-neutral-300',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      interactive: false
    }
  }
);

// ========================================
// Risk Level Indicator
// ========================================
const riskIndicatorVariants = cva(
  'absolute top-0 left-0 w-1 h-full rounded-l-lg',
  {
    variants: {
      risk: {
        green: 'bg-risk-green',
        yellow: 'bg-risk-yellow',
        red: 'bg-risk-red',
        none: 'bg-transparent'
      }
    },
    defaultVariants: {
      risk: 'none'
    }
  }
);

// ========================================
// Types
// ========================================
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type RiskLevel = 'green' | 'yellow' | 'red' | 'none';

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Card variant style */
  variant?: CardVariant;
  /** Card padding */
  padding?: CardPadding;
  /** Make card interactive (hover effects) */
  interactive?: boolean;
  /** Risk level indicator for CargoBit transport cards */
  risk?: RiskLevel;
  /** Show risk indicator */
  showRiskIndicator?: boolean;
  /** Additional class name */
  className?: string;
  /** Card content */
  children: React.ReactNode;
}

// ========================================
// Card Component
// ========================================
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      risk = 'none',
      showRiskIndicator = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const hasRiskIndicator = showRiskIndicator && risk !== 'none';

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, interactive }),
          hasRiskIndicator && 'relative overflow-hidden pl-5',
          className
        )}
        {...props}
      >
        {/* Risk Level Indicator */}
        {hasRiskIndicator && (
          <div className={riskIndicatorVariants({ risk })} aria-hidden="true" />
        )}
        
        {/* Card Content */}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ========================================
// Card Header Component
// ========================================
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show border below header */
  bordered?: boolean;
  /** Header content */
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  bordered = false,
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'flex items-center justify-between',
      bordered && 'pb-4 mb-4 border-b border-neutral-200',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

CardHeader.displayName = 'CardHeader';

// ========================================
// Card Title Component
// ========================================
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Title heading level */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle: React.FC<CardTitleProps> = ({
  as: Component = 'h3',
  className,
  children,
  ...props
}) => (
  <Component
    className={cn(
      'text-lg font-semibold text-neutral-900',
      className
    )}
    {...props}
  >
    {children}
  </Component>
);

CardTitle.displayName = 'CardTitle';

// ========================================
// Card Description Component
// ========================================
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Description text */
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  className,
  children,
  ...props
}) => (
  <p
    className={cn(
      'text-sm text-neutral-500 mt-1',
      className
    )}
    {...props}
  >
    {children}
  </p>
);

CardDescription.displayName = 'CardDescription';

// ========================================
// Card Content Component
// ========================================
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent: React.FC<CardContentProps> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

CardContent.displayName = 'CardContent';

// ========================================
// Card Footer Component
// ========================================
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show border above footer */
  bordered?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  bordered = false,
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'flex items-center gap-3',
      bordered && 'pt-4 mt-4 border-t border-neutral-200',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

CardFooter.displayName = 'CardFooter';

// ========================================
// Transport Card (CargoBit Specialized)
// ========================================
export interface TransportCardProps extends Omit<CardProps, 'risk'> {
  /** Transport ID */
  transportId: string;
  /** Route information */
  route: {
    from: string;
    to: string;
  };
  /** Risk level */
  risk: 'green' | 'yellow' | 'red';
  /** Status text */
  status?: string;
  /** Price */
  price?: number;
  /** Currency */
  currency?: string;
  /** On click handler */
  onClick?: () => void;
}

export const TransportCard: React.FC<TransportCardProps> = ({
  transportId,
  route,
  risk,
  status,
  price,
  currency = 'EUR',
  onClick,
  className,
  children,
  ...props
}) => {
  const riskLabels = {
    green: 'Niedriges Risiko',
    yellow: 'Mittleres Risiko',
    red: 'Hohes Risiko'
  };

  return (
    <Card
      variant="default"
      padding="md"
      interactive={!!onClick}
      risk={risk}
      showRiskIndicator
      className={cn(onClick && 'cursor-pointer', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      {...props}
    >
      <CardHeader bordered>
        <div>
          <CardTitle>Transport #{transportId}</CardTitle>
          {status && (
            <CardDescription>{status}</CardDescription>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge risk={risk} />
          {price !== undefined && (
            <span className="text-lg font-semibold text-neutral-900">
              {price.toLocaleString('de-DE', { style: 'currency', currency })}
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-3 text-neutral-600">
          <span className="font-medium">{route.from}</span>
          <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-medium">{route.to}</span>
        </div>
      </CardContent>

      {children}
    </Card>
  );
};

TransportCard.displayName = 'TransportCard';

// ========================================
// Risk Badge Component
// ========================================
export interface RiskBadgeProps {
  risk: 'green' | 'yellow' | 'red';
  showLabel?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  risk,
  showLabel = false,
  className
}) => {
  const config = {
    green: {
      bg: 'bg-risk-green-light',
      text: 'text-risk-green-text',
      dot: 'bg-risk-green',
      label: 'Niedrig'
    },
    yellow: {
      bg: 'bg-risk-yellow-light',
      text: 'text-risk-yellow-text',
      dot: 'bg-risk-yellow',
      label: 'Mittel'
    },
    red: {
      bg: 'bg-risk-red-light',
      text: 'text-risk-red-text',
      dot: 'bg-risk-red',
      label: 'Hoch'
    }
  };

  const { bg, text, dot, label } = config[risk];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
        bg,
        text,
        className
      )}
    >
      <span className={cn('w-2 h-2 rounded-full', dot)} aria-hidden="true" />
      {showLabel && label}
    </span>
  );
};

RiskBadge.displayName = 'RiskBadge';

// ========================================
// Export
// ========================================
export { cardVariants, riskIndicatorVariants };
export default Card;

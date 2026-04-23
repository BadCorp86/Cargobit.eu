/**
 * CargoBit Design System - Input Component
 * Version: 1.0.0
 * 
 * A flexible input component with validation states, icons, and accessibility support.
 * Supports various input types with consistent styling across the platform.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

// ========================================
// Input Variants
// ========================================
const inputVariants = cva(
  // Base styles
  'w-full transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
        filled: 'border-0 bg-neutral-100 focus:bg-white focus:ring-2 focus:ring-brand-primary/20',
        unstyled: 'border-0 bg-transparent focus:ring-0 px-0'
      },
      inputSize: {
        sm: 'text-sm h-8 px-3 rounded-[var(--radius-sm)]',
        md: 'text-base h-10 px-3 rounded-[var(--radius-md)]',
        lg: 'text-lg h-12 px-4 rounded-[var(--radius-md)]'
      },
      state: {
        default: '',
        error: 'border-feedback-error focus:border-feedback-error focus:ring-feedback-error/20',
        success: 'border-feedback-success focus:border-feedback-success focus:ring-feedback-success/20'
      }
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
      state: 'default'
    }
  }
);

// ========================================
// Types
// ========================================
export type InputVariant = 'default' | 'filled' | 'unstyled';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'error' | 'success';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Input variant style */
  variant?: InputVariant;
  /** Input size */
  inputSize?: InputSize;
  /** Validation state */
  state?: InputState;
  /** Error message to display */
  error?: string;
  /** Helper text to display below input */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Required field indicator */
  required?: boolean;
  /** Icon to display on the left */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right */
  rightIcon?: React.ReactNode;
  /** Additional wrapper class */
  wrapperClassName?: string;
}

// ========================================
// Input Component
// ========================================
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      inputSize = 'md',
      state = 'default',
      error,
      helperText,
      label,
      required,
      leftIcon,
      rightIcon,
      className,
      wrapperClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${React.useId()}`;
    
    // Determine actual state (error overrides)
    const actualState = error ? 'error' : state;
    
    // Show helper text only if no error
    const showHelperText = helperText && !error;

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
            {required && (
              <span className="text-feedback-error ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Input Wrapper */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              inputVariants({ variant, inputSize, state: actualState }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            aria-invalid={actualState === 'error'}
            aria-describedby={
              actualState === 'error' ? `${inputId}-error` : showHelperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-feedback-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {showHelperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-1 text-sm text-neutral-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ========================================
// Textarea Component (Extension)
// ========================================
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error message to display */
  error?: string;
  /** Helper text to display below textarea */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Required field indicator */
  required?: boolean;
  /** Additional wrapper class */
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error,
      helperText,
      label,
      required,
      className,
      wrapperClassName,
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${React.useId()}`;
    const showHelperText = helperText && !error;

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
            {required && (
              <span className="text-feedback-error ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          className={cn(
            'w-full px-3 py-2 text-base border border-neutral-300 rounded-[var(--radius-md)]',
            'bg-white transition-all duration-200',
            'focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-feedback-error focus:border-feedback-error focus:ring-feedback-error/20',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${textareaId}-error` : showHelperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />

        {/* Error Message */}
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1 text-sm text-feedback-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {showHelperText && (
          <p
            id={`${textareaId}-helper`}
            className="mt-1 text-sm text-neutral-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ========================================
// Export
// ========================================
export { inputVariants };
export default Input;

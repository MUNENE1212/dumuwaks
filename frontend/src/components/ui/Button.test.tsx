/**
 * Button Component Tests
 *
 * Tests for the Button UI component covering:
 * - Rendering with different variants
 * - Size variations
 * - Loading state
 * - Disabled state
 * - Click interactions
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/setup';
import Button from './Button';

describe('Button Component', () => {
  // ============================================
  // BASIC RENDERING TESTS
  // ============================================
  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should apply base styles', () => {
      render(<Button>Styled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('inline-flex');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
    });
  });

  // ============================================
  // VARIANT TESTS
  // ============================================
  describe('Variants', () => {
    it('should render primary variant by default', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-lumen');
    });

    it('should render primary variant when specified', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-lumen');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-surface-200');
      expect(button).toHaveClass('border-line-strong');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('border-line-strong');
      expect(button).toHaveClass('bg-transparent');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
    });

    it('should render danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-fault');
      expect(button).toHaveClass('text-on-lumen');
    });
  });

  // ============================================
  // SIZE TESTS
  // ============================================
  describe('Sizes', () => {
    it('should render medium size by default (48px for WCAG AA compliance)', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12'); // 48px for accessibility
      expect(button).toHaveClass('min-w-[48px]'); // Minimum touch target width
      expect(button).toHaveClass('px-5');
    });

    it('should render small size (44px minimum for WCAG AA compliance)', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11'); // 44px for accessibility
      expect(button).toHaveClass('min-w-[44px]'); // Minimum touch target width
      expect(button).toHaveClass('px-3.5');
      expect(button).toHaveClass('text-body-sm');
    });

    it('should render large size (56px for enhanced touch targets)', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-14'); // 56px for accessibility
      expect(button).toHaveClass('min-w-[56px]'); // Minimum touch target width
      expect(button).toHaveClass('px-7');
      expect(button).toHaveClass('text-lead');
    });
  });

  // ============================================
  // LOADING STATE TESTS
  // ============================================
  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show loading spinner when isLoading is false', () => {
      render(<Button isLoading={false}>Not Loading</Button>);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(<Button isLoading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should still render children when loading', () => {
      render(<Button isLoading>Submit</Button>);
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  // ============================================
  // DISABLED STATE TESTS
  // ============================================
  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50');
      expect(button).toHaveClass('disabled:pointer-events-none');
    });

    it('should not fire click events when disabled', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // CLICK INTERACTION TESTS
  // ============================================
  describe('Click Interactions', () => {
    it('should fire onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should pass event object to onClick handler', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  // ============================================
  // CUSTOM CLASSNAME TESTS
  // ============================================
  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should merge custom className with default styles', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('inline-flex'); // Still has base styles
    });
  });

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('Accessibility', () => {
    it('should have focus-visible styles', () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:outline-none');
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('should support aria-label attribute', () => {
      render(<Button aria-label="Submit form">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });

    it('should support aria-describedby attribute', () => {
      render(<Button aria-describedby="button-help">Help</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'button-help');
    });

    it('should support type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  // ============================================
  // SPREAD PROPS TESTS
  // ============================================
  describe('Spread Props', () => {
    it('should pass through additional HTML attributes', () => {
      render(<Button data-testid="custom-button" id="my-button">Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-testid', 'custom-button');
      expect(button).toHaveAttribute('id', 'my-button');
    });

    it('should support form attribute', () => {
      render(<Button form="my-form">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('form', 'my-form');
    });

    it('should support name attribute', () => {
      render(<Button name="action-button">Action</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('name', 'action-button');
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    it('should render with empty children', () => {
      render(<Button>{''}</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with complex children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('should handle multiple clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Multi Click</Button>);
      const button = screen.getByRole('button');

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });
});

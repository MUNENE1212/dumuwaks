/**
 * Card Component Tests
 *
 * Tests for the Card UI component covering:
 * - Rendering with different variants
 * - Children propagation
 * - Custom className handling
 * - Variant styles
 * - Sub-components (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/setup';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from './Card';

describe('Card Component', () => {
  // ============================================
  // BASIC RENDERING TESTS
  // ============================================
  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(
        <Card>
          <h2>Card Title</h2>
          <p>Card content</p>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render as a div element', () => {
      render(<Card data-testid="test-card">Test Card</Card>);
      const card = screen.getByTestId('test-card');
      expect(card.tagName).toBe('DIV');
    });

    it('should apply base card styles', () => {
      render(<Card data-testid="test-card">Styled Card</Card>);
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('rounded-md');
      expect(card).toHaveClass('border');
    });
  });

  // ============================================
  // VARIANT TESTS
  // ============================================
  describe('Variants', () => {
    it('should render default variant by default', () => {
      render(<Card data-testid="test-card">Default</Card>);
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('bg-surface-200');
    });

    it('should render default variant when specified', () => {
      render(<Card variant="default" data-testid="test-card">Default</Card>);
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('bg-surface-200');
    });

    it('should render glass variant', () => {
      render(<Card variant="glass" data-testid="test-card">Glass</Card>);
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('bg-surface-200');
    });

    it('should render elevated variant', () => {
      render(<Card variant="elevated" data-testid="test-card">Elevated</Card>);
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('bg-surface-300');
    });

    it('should apply transition styles', () => {
      render(<Card data-testid="test-card">Transition</Card>);
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('transition-colors');
      expect(card).toHaveClass('duration-150');
    });
  });

  // ============================================
  // CUSTOM CLASSNAME TESTS
  // ============================================
  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(<Card className="custom-card" data-testid="test-card">Custom</Card>);
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('custom-card');
    });

    it('should merge custom className with default styles', () => {
      render(
        <Card className="custom-card" data-testid="test-card">
          Custom
        </Card>
      );
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('custom-card');
      expect(card).toHaveClass('rounded-md'); // Still has base styles
    });
  });

  // ============================================
  // SPREAD PROPS TESTS
  // ============================================
  describe('Spread Props', () => {
    it('should pass through additional HTML attributes', () => {
      render(
        <Card data-testid="custom-card" id="my-card" title="Card tooltip">
          Test
        </Card>
      );
      const card = screen.getByTestId('custom-card');
      expect(card).toHaveAttribute('id', 'my-card');
      expect(card).toHaveAttribute('title', 'Card tooltip');
    });

    it('should support role attribute', () => {
      render(
        <Card role="article" data-testid="test-card">
          Article
        </Card>
      );
      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('should support aria-label attribute', () => {
      render(
        <Card aria-label="Information card" data-testid="test-card">
          Content
        </Card>
      );
      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('aria-label', 'Information card');
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    it('should render with empty children', () => {
      render(<Card data-testid="empty-card">{''}</Card>);
      const card = screen.getByTestId('empty-card');
      expect(card).toBeInTheDocument();
    });

    it('should render with complex nested children', () => {
      render(
        <Card>
          <div>
            <span>Nested</span>
          </div>
        </Card>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
    });
  });
});

// ============================================
// SUB-COMPONENTS TESTS
// ============================================
describe('Card Sub-Components', () => {
  describe('CardHeader', () => {
    it('should render children', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('p-6');
      expect(header).toHaveClass('border-b');
    });

    it('should accept custom className', () => {
      render(<CardHeader className="custom-header" data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('should render children', () => {
      render(<CardTitle>Card Title</CardTitle>);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should render as h3 element', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title.tagName).toBe('H3');
    });

    it('should apply title styles', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('font-display');
      expect(title).toHaveClass('text-heading');
    });

    it('should accept custom className', () => {
      render(<CardTitle className="custom-title" data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('should render children', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should render as p element', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc.tagName).toBe('P');
    });

    it('should apply description styles', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-body-sm');
    });

    it('should accept custom className', () => {
      render(<CardDescription className="custom-desc" data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('custom-desc');
    });
  });

  describe('CardContent', () => {
    it('should render children', () => {
      render(<CardContent>Content text</CardContent>);
      expect(screen.getByText('Content text')).toBeInTheDocument();
    });

    it('should apply content styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
    });

    it('should accept custom className', () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('should render children', () => {
      render(<CardFooter>Footer text</CardFooter>);
      expect(screen.getByText('Footer text')).toBeInTheDocument();
    });

    it('should apply footer styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('p-6');
      expect(footer).toHaveClass('border-t');
    });

    it('should accept custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer');
    });
  });
});

// ============================================
// COMPOSED CARD TESTS
// ============================================
describe('Composed Card', () => {
  it('should render full card composition', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );

    expect(screen.getByTestId('full-card')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });
});

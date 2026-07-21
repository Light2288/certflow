import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from '../Footer';
import { version } from '@/package.json';

describe('Footer Component', () => {
  describe('Landmark', () => {
    it('should render a contentinfo landmark', () => {
      render(<Footer />);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });

  describe('Donation button', () => {
    it('should render a "Buy me a coffee" link to PayPal.me', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /buy me a coffee/i });
      expect(link).toHaveAttribute('href', 'https://paypal.me/DavideAliti');
    });

    it('should open the donation link in a new tab with safe rel attributes', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /buy me a coffee/i });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Project links', () => {
    it('should render a GitHub / source repository link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /github/i });
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/Light2288/certflow'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render a license link to the LICENSE file on GitHub', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /mit license/i });
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/Light2288/certflow/blob/main/LICENSE'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Copyright', () => {
    it('should render a copyright line crediting CertFlow', () => {
      render(<Footer />);
      expect(screen.getByText(/©\s*2026\s*CertFlow/i)).toBeInTheDocument();
    });
  });

  describe('Disclaimer', () => {
    it('should render an AI-content disclaimer', () => {
      render(<Footer />);
      expect(
        screen.getByText(/AI-generated content may be inaccurate/i)
      ).toBeInTheDocument();
    });

    it('should note it is not affiliated with certification vendors', () => {
      render(<Footer />);
      expect(screen.getByText(/not affiliated/i)).toBeInTheDocument();
    });
  });

  describe('Version', () => {
    it('should render the app version from package.json', () => {
      render(<Footer />);
      expect(screen.getByText(new RegExp(`v${version}`))).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have dark mode classes for theme consistency', () => {
      render(<Footer />);
      const footer = screen.getByRole('contentinfo');
      expect(footer.className).toMatch(/dark:/);
    });
  });
});

// Made with Bob

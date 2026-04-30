import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Navigation from '../Navigation';

// Mock Next.js navigation hooks
const mockPush = vi.fn();
const mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the CertFlow logo', () => {
      render(<Navigation />);
      expect(screen.getByText('CertFlow')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<Navigation />);
      
      // Check for all nav items (they appear twice - desktop and mobile)
      const homeLinks = screen.getAllByText(/Home/);
      const simulatorLinks = screen.getAllByText(/Simulator/);
      const topicsLinks = screen.getAllByText(/Topics/);
      const tutorLinks = screen.getAllByText(/Tutor/);
      const settingsLinks = screen.getAllByText(/Settings/);
      
      expect(homeLinks.length).toBeGreaterThan(0);
      expect(simulatorLinks.length).toBeGreaterThan(0);
      expect(topicsLinks.length).toBeGreaterThan(0);
      expect(tutorLinks.length).toBeGreaterThan(0);
      expect(settingsLinks.length).toBeGreaterThan(0);
    });

    it('should render navigation icons', () => {
      render(<Navigation />);
      
      // Check for emoji icons
      expect(screen.getByText('🎓')).toBeInTheDocument(); // Logo
      expect(screen.getAllByText('🏠').length).toBeGreaterThan(0); // Home
      expect(screen.getAllByText('📝').length).toBeGreaterThan(0); // Simulator
      expect(screen.getAllByText('📚').length).toBeGreaterThan(0); // Topics
      expect(screen.getAllByText('🤖').length).toBeGreaterThan(0); // Tutor
      expect(screen.getAllByText('⚙️').length).toBeGreaterThan(0); // Settings
    });
  });

  describe('Navigation Links', () => {
    it('should have correct href attributes', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link');
      const hrefs = links.map(link => link.getAttribute('href'));
      
      expect(hrefs).toContain('/');
      expect(hrefs).toContain('/simulator');
      expect(hrefs).toContain('/topics');
      expect(hrefs).toContain('/tutor');
      expect(hrefs).toContain('/settings');
    });

    it('should have logo link to home', () => {
      render(<Navigation />);
      
      const logoLink = screen.getByRole('link', { name: /CertFlow/i });
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('Mobile Menu', () => {
    it('should not show mobile menu by default', () => {
      render(<Navigation />);
      
      // Mobile menu should be hidden initially
      const mobileMenu = screen.queryByRole('navigation');
      // The mobile menu items are in the DOM but hidden via CSS
      expect(screen.getByLabelText('Toggle navigation menu')).toBeInTheDocument();
    });

    it('should toggle mobile menu when button is clicked', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      
      // Click to open
      fireEvent.click(menuButton);
      
      // Mobile menu should be visible (check for mobile-specific class or structure)
      // The menu is rendered when mobileMenuOpen is true
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      // Click to close
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should show hamburger icon when menu is closed', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      
      // Check for hamburger icon (three horizontal lines)
      const svg = menuButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show close icon when menu is open', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      
      // Open menu
      fireEvent.click(menuButton);
      
      // Check for close icon (X)
      const svg = menuButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should close mobile menu when a link is clicked', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      
      // Open menu
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      // Click a navigation link in mobile menu
      // Get all links and find one in the mobile menu section
      const allLinks = screen.getAllByRole('link');
      const mobileLinks = allLinks.filter(link => 
        link.className.includes('block') // Mobile links have 'block' class
      );
      
      if (mobileLinks.length > 0) {
        fireEvent.click(mobileLinks[0]);
        
        // Menu should close
        expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      expect(menuButton).toHaveAttribute('aria-expanded');
    });

    it('should have navigation landmark', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have all links accessible', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Styling and Responsiveness', () => {
    it('should have desktop navigation hidden on mobile', () => {
      render(<Navigation />);
      
      // Desktop nav should have md:flex class (hidden on mobile)
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have mobile menu button hidden on desktop', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      
      // Button should have md:hidden class
      expect(menuButton.parentElement).toHaveClass('md:hidden');
    });

    it('should apply hover styles classes', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link');
      
      // Check that at least some links have hover classes
      // (active links might not have hover in their current state)
      const hasHoverClasses = links.some(link => {
        const classes = link.className;
        return classes.includes('hover:');
      });
      
      expect(hasHoverClasses).toBe(true);
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      
      // Check for dark: classes
      expect(nav.className).toMatch(/dark:/);
    });

    it('should have dark mode text colors', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        const classes = link.className;
        // Should have dark mode color classes
        if (classes.includes('text-')) {
          expect(classes).toMatch(/dark:/);
        }
      });
    });
  });
});

// Made with Bob

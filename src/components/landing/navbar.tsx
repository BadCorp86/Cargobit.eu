'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Package,
  Globe,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function Navbar({ onLogin, onRegister }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Matching', href: '#matching' },
    { label: 'Preise', href: '#pricing' },
    { label: 'Wallet', href: '#wallet' },
    { label: 'Support', href: '#support' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass-strong shadow-lg'
          : 'bg-transparent'
      }`}
      style={{ height: '70px' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cb-primary to-cb-accent flex items-center justify-center shadow-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">CargoBit</span>
              <span className="text-xs text-gray-400 -mt-1">Transporte</span>
            </div>
          </div>

          {/* Center Navigation - Desktop */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-gray-300"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">DE</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 glass-card rounded-xl py-2 min-w-[120px] shadow-xl">
                  {['DE', 'EN', 'PL', 'FR', 'ES', 'IT'].map((lang) => (
                    <button
                      key={lang}
                      className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors text-sm text-gray-300"
                      onClick={() => setLangOpen(false)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Login Button */}
            <Button
              variant="outline"
              className="btn-outline text-gray-300 border-white/20 hover:text-white hover:border-white/40"
              onClick={onLogin}
            >
              Anmelden
            </Button>

            {/* Register Button */}
            <Button
              className="btn-primary gap-2"
              onClick={onRegister}
            >
              Jetzt registrieren
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-300"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden glass-strong border-t border-white/10 animate-slide-up">
          <div className="px-4 py-6 space-y-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block py-2 text-gray-300 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 btn-outline text-gray-300"
                onClick={() => { onLogin(); setMenuOpen(false); }}
              >
                Anmelden
              </Button>
              <Button
                className="flex-1 btn-primary"
                onClick={() => { onRegister(); setMenuOpen(false); }}
              >
                Registrieren
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

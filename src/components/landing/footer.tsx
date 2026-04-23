'use client';

import { Package } from 'lucide-react';

const footerLinks = {
  plattform: [
    { label: 'Matching', href: '#matching' },
    { label: 'Transporte', href: '#transports' },
    { label: 'Wallet', href: '#wallet' },
    { label: 'API', href: '#api' },
  ],
  unternehmen: [
    { label: 'Über uns', href: '#about' },
    { label: 'Karriere', href: '#careers' },
    { label: 'Blog', href: '#blog' },
    { label: 'Presse', href: '#press' },
  ],
  rechtliches: [
    { label: 'AGB', href: '#terms' },
    { label: 'Datenschutz', href: '#privacy' },
    { label: 'Impressum', href: '#imprint' },
    { label: 'Cookies', href: '#cookies' },
  ],
  support: [
    { label: 'Hilfe-Center', href: '#help' },
    { label: 'Kontakt', href: '#contact' },
    { label: 'Status', href: '#status' },
    { label: 'Feedback', href: '#feedback' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-cb-darker/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cb-primary to-cb-accent flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">CargoBit</span>
            </div>
            <p className="text-sm text-gray-400">
              Europas führende Logistikplattform für smarte Transporte.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-white mb-4 capitalize">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} CargoBit. Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-4">
            {/* Social Icons */}
            {['twitter', 'linkedin', 'github'].map((social) => (
              <a
                key={social}
                href={`#${social}`}
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <span className="sr-only">{social}</span>
                <div className="w-5 h-5 bg-gray-400 rounded-sm" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

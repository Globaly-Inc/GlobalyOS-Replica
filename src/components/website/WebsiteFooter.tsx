import { Link } from "react-router-dom";
import { Github, Twitter, Linkedin, Mail, Youtube, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import globalyosFullLogo from "@/assets/globalyos-full-logo.png";

export const WebsiteFooter = () => {
  const [email, setEmail] = useState("");

  const footerLinks = {
    Product: [
      { name: "HRMS", href: "/features" },
      { name: "CRM", href: "/features" },
      { name: "Marketing", href: "/features" },
      { name: "Communication", href: "/features" },
      { name: "Accounting", href: "/features" },
      { name: "Wiki & Knowledge Base", href: "/features" },
      { name: "AI Assistant", href: "/features" },
    ],
    Solutions: [
      { name: "For Startups", href: "/pricing" },
      { name: "For SMBs", href: "/pricing" },
      { name: "For Enterprise", href: "/pricing" },
      { name: "For Remote Teams", href: "/features" },
    ],
    Resources: [
      { name: "Blog", href: "/blog" },
      { name: "Help Center", href: "/help" },
      { name: "API Documentation", href: "/docs" },
      { name: "Status", href: "/status" },
      { name: "Changelog", href: "/changelog" },
    ],
    Company: [
      { name: "About", href: "/about" },
      { name: "Careers", href: "/careers" },
      { name: "Contact", href: "/contact" },
      { name: "Partners", href: "/partners" },
    ],
    Legal: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Cookie Policy", href: "/cookies" },
      { name: "GDPR", href: "/gdpr" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com/globalyos", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/globalyos", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/globalyos", label: "GitHub" },
    { icon: Youtube, href: "https://youtube.com/@globalyos", label: "YouTube" },
    { icon: Instagram, href: "https://instagram.com/globalyos", label: "Instagram" },
    { icon: Mail, href: "mailto:hello@globalyos.com", label: "Email" },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Newsletter */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">Stay in the loop</h3>
              <p className="text-sm text-slate-400">Get product updates, tips, and insights delivered to your inbox.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 md:w-72 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Button className="bg-primary hover:bg-primary/90 text-white px-6">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img src={globalyosFullLogo} alt="GlobalyOS" className="h-8 brightness-0 invert" width={132} height={32} loading="lazy" />
            </Link>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              The all-in-one Business Operating System for growing teams.
            </p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary transition-all duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} GlobalyOS. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Privacy</Link>
              <Link to="/terms" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Terms</Link>
              <Link to="/cookies" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Cookies</Link>
            </div>
            <p className="text-sm text-slate-500">
              Made with 💜 for growing teams
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

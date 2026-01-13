import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import globalyosFullLogo from "@/assets/globalyos-full-logo.png";

export const WebsiteHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { currentOrg, organizations, loading: orgLoading } = useOrganization();
  const navigate = useNavigate();

  // Show loading state while checking auth or loading orgs for authenticated user
  const isAuthenticating = authLoading || (user && orgLoading);
  
  // Determine the dashboard path - use currentOrg, fallback to first org, or pending approval
  const getDashboardPath = () => {
    if (currentOrg) return `/org/${currentOrg.slug}`;
    if (organizations.length > 0) return `/org/${organizations[0].slug}`;
    return '/pending-approval';
  };

  const navLinks = [
    { name: "Features", href: "/features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Blog", href: "/blog" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Nav Links */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <img src={globalyosFullLogo} alt="GlobalyOS" className="h-8" width={132} height={32} />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticating ? (
              <Button disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </Button>
            ) : user ? (
              <Button onClick={() => navigate(getDashboardPath())}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button onClick={() => navigate("/signup")}>
                  Get Started Free
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {isAuthenticating ? (
                  <Button disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </Button>
                ) : user ? (
                  <Button onClick={() => { navigate(getDashboardPath()); setMobileMenuOpen(false); }}>
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                      Sign In
                    </Button>
                    <Button onClick={() => { navigate("/signup"); setMobileMenuOpen(false); }}>
                      Get Started Free
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

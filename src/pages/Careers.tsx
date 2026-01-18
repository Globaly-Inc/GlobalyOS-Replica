import { Helmet } from 'react-helmet-async';
import { WebsiteHeader } from '@/components/website/WebsiteHeader';
import { WebsiteFooter } from '@/components/website/WebsiteFooter';
import { Button } from '@/components/ui/button';
import { 
  Rocket, 
  Globe, 
  Target, 
  TrendingUp, 
  Heart, 
  Clock, 
  Plane, 
  Laptop, 
  BookOpen, 
  Users, 
  MapPin, 
  Briefcase, 
  ArrowRight, 
  Mail,
  CheckCircle,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const whyJoinReasons = [
  {
    icon: Rocket,
    title: 'Impact at Scale',
    description: 'Your work touches thousands of teams daily. Build features that genuinely improve how people work together.'
  },
  {
    icon: Globe,
    title: 'Remote-First Culture',
    description: 'Work from anywhere in the world. We believe great talent isn\'t limited by geography.'
  },
  {
    icon: Target,
    title: 'Ownership & Autonomy',
    description: 'Own your projects end-to-end. We trust you to make decisions and drive outcomes.'
  },
  {
    icon: TrendingUp,
    title: 'Growth Opportunities',
    description: 'Learning budget, mentorship programs, and clear career paths to help you level up.'
  },
  {
    icon: Heart,
    title: 'Work-Life Balance',
    description: 'Flexible hours, generous PTO, and a culture that respects your time outside of work.'
  },
  {
    icon: Users,
    title: 'Amazing Team',
    description: 'Collaborate with talented, kind people who genuinely care about each other\'s success.'
  }
];

const benefits = [
  { icon: TrendingUp, label: 'Competitive salary + equity' },
  { icon: Globe, label: 'Remote-first (work from anywhere)' },
  { icon: Clock, label: 'Flexible working hours' },
  { icon: Plane, label: 'Unlimited PTO + company holidays' },
  { icon: BookOpen, label: 'Learning & development budget' },
  { icon: Laptop, label: 'Home office stipend' },
  { icon: Heart, label: 'Health & wellness benefits' },
  { icon: Users, label: 'Annual team retreats' }
];

const openPositions = [
  {
    id: 'senior-frontend',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Remote (Worldwide)',
    type: 'Full-time',
    description: 'Build beautiful, performant interfaces for our growing platform.'
  },
  {
    id: 'product-designer',
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote (Worldwide)',
    type: 'Full-time',
    description: 'Shape the user experience for thousands of teams.'
  },
  {
    id: 'customer-success',
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Remote (EMEA)',
    type: 'Full-time',
    description: 'Help our customers get the most out of GlobalyOS.'
  }
];

const hiringSteps = [
  { step: 1, title: 'Application Review', duration: '1-2 days', description: 'We review your application and get back to you quickly.' },
  { step: 2, title: 'Initial Call', duration: '30 min', description: 'A friendly chat with our People team to learn about you.' },
  { step: 3, title: 'Role Interview', duration: '60 min', description: 'Deep dive into your skills and experience with the hiring manager.' },
  { step: 4, title: 'Team Meet & Greet', duration: '45 min', description: 'Meet your potential teammates and ask questions.' },
  { step: 5, title: 'Offer & Onboarding', duration: '', description: 'Welcome to the team! We\'ll set you up for success.' }
];

const values = [
  {
    icon: Sparkles,
    title: 'Simplicity First',
    description: 'We obsess over removing complexity so our users don\'t have to.'
  },
  {
    icon: Users,
    title: 'Team Over Tools',
    description: 'Technology should serve people, not the other way around.'
  },
  {
    icon: Shield,
    title: 'Transparency',
    description: 'Honest communication, clear expectations, no hidden agendas.'
  },
  {
    icon: Zap,
    title: 'Continuous Improvement',
    description: 'We ship fast, learn from feedback, and iterate constantly.'
  }
];

export default function Careers() {
  return (
    <>
      <Helmet>
        <title>Careers | GlobalyOS - Join Our Team</title>
        <meta name="description" content="Join GlobalyOS and help build the future of team operations. We're a remote-first company looking for talented people who want to make an impact." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <WebsiteHeader />

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Briefcase className="h-4 w-4" />
              We're Hiring
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Build the future of work{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                with us
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Join a team of passionate people building tools that help thousands of organizations work better together. Remote-first, impact-driven, and growing fast.
            </p>
            <Button size="lg" asChild>
              <a href="#positions">
                View Open Positions
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>

        {/* Why Join Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why join GlobalyOS?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're building something special, and we want you to be part of it.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {whyJoinReasons.map((reason, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <reason.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{reason.title}</h3>
                  <p className="text-muted-foreground">{reason.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Values Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Our values in action
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                These aren't just words on a wall—they guide how we work every day.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-2xl p-6 text-center"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Benefits & perks
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We take care of our team so they can do their best work.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{benefit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions Section */}
        <section id="positions" className="py-20 px-4 scroll-mt-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Open positions
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Find your next opportunity and make an impact with GlobalyOS.
              </p>
            </div>

            {openPositions.length > 0 ? (
              <div className="space-y-4 max-w-4xl mx-auto">
                {openPositions.map((position) => (
                  <div
                    key={position.id}
                    className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{position.title}</h3>
                        <p className="text-muted-foreground mb-3">{position.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            {position.department}
                          </span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {position.location}
                          </span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {position.type}
                          </span>
                        </div>
                      </div>
                      <Button asChild>
                        <a href={`mailto:careers@globalyos.com?subject=Application: ${position.title}`}>
                          Apply Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <p className="text-muted-foreground mb-4">
                  No open positions right now, but we're always looking for great people.
                </p>
                <Button asChild variant="outline">
                  <a href="mailto:careers@globalyos.com">
                    <Mail className="mr-2 h-4 w-4" />
                    Send us your resume
                  </a>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Hiring Process Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Our hiring process
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Transparent, respectful, and designed to be a great experience for everyone.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="space-y-6">
                {hiringSteps.map((step, index) => (
                  <div
                    key={step.step}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                        {step.step}
                      </div>
                      {index < hiringSteps.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        {step.duration && (
                          <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                            {step.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Don't see the right role?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              We're always on the lookout for talented people. Send us your resume and tell us how you'd like to contribute.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="mailto:careers@globalyos.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Get in Touch
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/about">
                  Learn About Us
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <WebsiteFooter />
      </div>
    </>
  );
}

import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Target, 
  Eye, 
  Heart, 
  Sparkles, 
  Users, 
  Globe, 
  Shield, 
  Zap,
  ArrowRight,
  Building2,
  Clock,
  Lightbulb,
  HandHeart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WebsiteHeader } from '@/components/website/WebsiteHeader';
import { WebsiteFooter } from '@/components/website/WebsiteFooter';

const values = [
  {
    icon: Sparkles,
    title: 'Simplicity First',
    description: 'We obsess over removing complexity. Every feature should feel intuitive from the first click.'
  },
  {
    icon: Heart,
    title: 'Team Over Tools',
    description: 'Technology should serve people, not the other way around. Your team\'s success is our north star.'
  },
  {
    icon: Eye,
    title: 'Transparency',
    description: 'Honest pricing, clear communication, no hidden fees. What you see is what you get.'
  },
  {
    icon: Zap,
    title: 'Continuous Improvement',
    description: 'We ship fast and iterate based on your feedback. Your voice shapes our roadmap.'
  },
  {
    icon: Shield,
    title: 'Security by Default',
    description: 'Your data is sacred. Enterprise-grade security comes standard, not as an add-on.'
  },
  {
    icon: Globe,
    title: 'Global Mindset',
    description: 'Built for teams anywhere in the world. Multiple timezones, languages, and currencies supported.'
  }
];

const stats = [
  { value: '500+', label: 'Organizations', icon: Building2 },
  { value: '45+', label: 'Countries', icon: Globe },
  { value: '50,000+', label: 'Team Members', icon: Users },
  { value: '99.9%', label: 'Uptime', icon: Clock }
];

const cultureHighlights = [
  {
    icon: Globe,
    title: 'Remote-First',
    description: 'Work from anywhere. We believe great work happens when you\'re in your element.'
  },
  {
    icon: Clock,
    title: 'Async by Default',
    description: 'Deep work matters. We minimize meetings and maximize focus time.'
  },
  {
    icon: Lightbulb,
    title: 'Ownership Mentality',
    description: 'Every team member owns their domain. We trust you to make the right calls.'
  },
  {
    icon: HandHeart,
    title: 'Growth-Focused',
    description: 'Learning budget, conference attendance, and mentorship opportunities for everyone.'
  }
];

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Us | GlobalyOS - The All-in-One Team Operating System</title>
        <meta 
          name="description" 
          content="Learn about GlobalyOS's mission to empower growing teams with an all-in-one platform that's simple, affordable, and delightful to use." 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <WebsiteHeader />

        {/* Hero Section */}
        <section className="pt-32 pb-16 lg:pb-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Building the future of{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  team operations
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We're on a mission to give every growing team access to enterprise-grade tools 
                without the enterprise complexity or pricing.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-card border-border">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Empower growing teams to operate at their best with an all-in-one platform 
                    that's simple, affordable, and delightful to use. No per-seat pricing, 
                    no feature gates, no compromises.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    A world where every team, regardless of size or budget, has access to the 
                    tools they need to thrive. Where growing shouldn't mean growing pains.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">Our Story</h2>
              <div className="space-y-6 text-lg text-muted-foreground text-left">
                <p>
                  We've been there. As a team scales from 10 to 50 to 200 people, the tools that 
                  once worked become a tangled web of subscriptions. One platform for HR, another 
                  for attendance, a third for knowledge sharing, and yet another for team communication. 
                  Each with its own login, its own learning curve, and its own per-seat pricing that 
                  grows faster than revenue.
                </p>
                <p>
                  GlobalyOS was born from this frustration. We asked ourselves: what if there was 
                  one platform that handled it all? What if pricing was simple and predictable? 
                  What if AI could handle the busywork so teams could focus on what matters?
                </p>
                <p>
                  Today, GlobalyOS serves hundreds of teams across 45+ countries. From startups 
                  hitting their stride to established businesses streamlining operations, we're 
                  proud to be the operating system that keeps growing teams moving forward.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The principles that guide every decision we make
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((value) => (
                <Card key={value.title} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <value.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* By the Numbers Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">By the Numbers</h2>
              <p className="text-lg text-muted-foreground">
                Trusted by teams around the world
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <Card key={stat.label} className="bg-card border-border text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                      {stat.value}
                    </div>
                    <div className="text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Join Our Team Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Team</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're always looking for talented people who are passionate about building 
                products that make a difference.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {cultureHighlights.map((item) => (
                <div key={item.title} className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button asChild size="lg">
                <Link to="/careers">
                  View Open Positions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to transform your team operations?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join hundreds of growing teams who've simplified their operations with GlobalyOS.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link to="/signup">
                      Start Your Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/features">
                      Explore Features
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <WebsiteFooter />
      </div>
    </>
  );
};

export default About;

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Shield, Lock, Users } from 'lucide-react';

// Company logos placeholder - in production these would be actual customer logos
const TRUSTED_COMPANIES = [
  { name: 'TechCorp', logo: null },
  { name: 'GlobalBank', logo: null },
  { name: 'HealthPlus', logo: null },
  { name: 'EduFirst', logo: null },
  { name: 'RetailMax', logo: null },
];

const TESTIMONIALS = [
  {
    quote: "GlobalyOS transformed how we manage our team. The all-in-one approach saves us hours every week.",
    author: "Sarah Chen",
    role: "HR Director",
    company: "TechCorp",
    avatar: null,
  },
  {
    quote: "Finally, an HRMS that our team actually enjoys using. The wiki and chat features are game-changers.",
    author: "Michael Ross",
    role: "Operations Manager",
    company: "GlobalBank",
    avatar: null,
  },
];

const SECURITY_BADGES = [
  { icon: Shield, label: '256-bit SSL' },
  { icon: Lock, label: 'GDPR Ready' },
  { icon: Users, label: '1,000+ Teams' },
];

export const TrustedBySection = () => (
  <div className="text-center space-y-4">
    <p className="text-sm text-muted-foreground font-medium">
      Trusted by teams at
    </p>
    <div className="flex items-center justify-center gap-6 flex-wrap">
      {TRUSTED_COMPANIES.map((company) => (
        <div 
          key={company.name}
          className="h-8 px-4 rounded bg-muted/50 flex items-center justify-center"
        >
          <span className="text-sm font-medium text-muted-foreground">
            {company.name}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const TestimonialCarousel = () => (
  <div className="grid md:grid-cols-2 gap-4">
    {TESTIMONIALS.map((testimonial, index) => (
      <Card key={index} className="p-4 bg-card/50">
        <div className="flex gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-warning text-warning" />
          ))}
        </div>
        <blockquote className="text-sm text-foreground mb-3">
          "{testimonial.quote}"
        </blockquote>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={testimonial.avatar || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {testimonial.author.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{testimonial.author}</p>
            <p className="text-xs text-muted-foreground">
              {testimonial.role}, {testimonial.company}
            </p>
          </div>
        </div>
      </Card>
    ))}
  </div>
);

export const SecurityBadges = () => (
  <div className="flex items-center justify-center gap-4 flex-wrap">
    {SECURITY_BADGES.map((badge) => {
      const Icon = badge.icon;
      return (
        <Badge 
          key={badge.label} 
          variant="outline" 
          className="gap-1.5 py-1.5 px-3 bg-card"
        >
          <Icon className="h-3.5 w-3.5 text-success" />
          <span>{badge.label}</span>
        </Badge>
      );
    })}
  </div>
);

export const CustomerCount = () => (
  <div className="flex items-center justify-center gap-2">
    <div className="flex -space-x-2">
      {[...Array(4)].map((_, i) => (
        <Avatar key={i} className="h-8 w-8 border-2 border-background">
          <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-accent text-primary-foreground">
            {String.fromCharCode(65 + i)}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
    <div className="text-sm">
      <span className="font-semibold text-foreground">1,000+</span>
      <span className="text-muted-foreground"> teams trust GlobalyOS</span>
    </div>
  </div>
);

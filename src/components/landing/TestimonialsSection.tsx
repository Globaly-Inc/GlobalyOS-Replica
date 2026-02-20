import { TestimonialCard } from "@/components/website";

const testimonials = [
  {
    quote: "GlobalyOS replaced 4 different tools for us. Now everything from leave requests to team docs is in one place.",
    author: "Sarah Chen",
    role: "Operations Manager",
    company: "TechStart Inc",
  },
  {
    quote: "The AI assistant is a game-changer. I used to spend hours answering the same HR questions. Now AI handles it.",
    author: "Marcus Johnson",
    role: "HR Director",
    company: "GrowthCo",
  },
  {
    quote: "From CRM to accounting to team chat — everything is connected. Our team is 3x more productive since switching.",
    author: "Priya Patel",
    role: "CEO",
    company: "Elevate Studios",
  },
];

export const TestimonialsSection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Loved by teams everywhere</h2>
        <p className="text-lg text-muted-foreground">See why growing teams choose GlobalyOS</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}
      </div>
    </div>
  </section>
);

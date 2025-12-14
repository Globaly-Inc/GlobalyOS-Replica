import { Star } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  rating?: number;
  avatarUrl?: string;
}

export const TestimonialCard = ({
  quote,
  author,
  role,
  company,
  rating = 5,
  avatarUrl,
}: TestimonialCardProps) => {
  return (
    <div className="flex flex-col p-6 rounded-2xl bg-card border border-border">
      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4 fill-warning text-warning"
          />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-foreground mb-6 flex-1">
        "{quote}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={author}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {author.charAt(0)}
            </span>
          </div>
        )}
        <div>
          <p className="font-semibold text-foreground text-sm">{author}</p>
          <p className="text-muted-foreground text-xs">
            {role} at {company}
          </p>
        </div>
      </div>
    </div>
  );
};

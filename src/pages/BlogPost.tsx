import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  og_image_url: string | null;
  category: string;
  author_name: string;
  author_avatar_url: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  reading_time_minutes: number | null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      
      if (error) throw error;
      return data as BlogPost | null;
    },
    enabled: !!slug,
  });

  const siteUrl = window.location.origin;
  const postUrl = `${siteUrl}/blog/${slug}`;
  const ogImage = post?.og_image_url || post?.cover_image_url || `${siteUrl}/og-image.png`;

  // JSON-LD structured data for SEO
  const jsonLd = post ? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.meta_description || post.excerpt,
    "image": ogImage,
    "author": {
      "@type": "Person",
      "name": post.author_name,
      "image": post.author_avatar_url
    },
    "publisher": {
      "@type": "Organization",
      "name": "GlobalyOS",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/favicon.png`
      }
    },
    "datePublished": post.published_at,
    "dateModified": post.published_at,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": postUrl
    },
    "keywords": post.focus_keyword,
    "wordCount": post.content?.split(/\s+/).length || 0,
    "timeRequired": post.reading_time_minutes ? `PT${post.reading_time_minutes}M` : undefined
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <WebsiteHeader />
        <div className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-6 w-48 mb-8" />
            <Skeleton className="h-64 w-full mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
        <WebsiteFooter />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Post Not Found | GlobalyOS Blog</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <WebsiteHeader />
        <div className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Post not found</h1>
            <p className="text-muted-foreground mb-8">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/blog")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </div>
        </div>
        <WebsiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{post.meta_title || post.title} | GlobalyOS Blog</title>
        <meta name="title" content={post.meta_title || post.title} />
        <meta name="description" content={post.meta_description || post.excerpt || ""} />
        {post.focus_keyword && <meta name="keywords" content={post.focus_keyword} />}
        {post.canonical_url && <link rel="canonical" href={post.canonical_url} />}
        {!post.canonical_url && <link rel="canonical" href={postUrl} />}

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={postUrl} />
        <meta property="og:title" content={post.meta_title || post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt || ""} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="GlobalyOS" />
        <meta property="article:published_time" content={post.published_at || ""} />
        <meta property="article:author" content={post.author_name} />
        <meta property="article:section" content={post.category} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={postUrl} />
        <meta property="twitter:title" content={post.meta_title || post.title} />
        <meta property="twitter:description" content={post.meta_description || post.excerpt || ""} />
        <meta property="twitter:image" content={ogImage} />

        {/* JSON-LD Structured Data */}
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>

      <WebsiteHeader />

      <article className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <Badge variant="secondary" className="mb-4">
            {post.category.replace("-", " ")}
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 flex-wrap">
            <div className="flex items-center gap-2">
              {post.author_avatar_url ? (
                <img
                  src={post.author_avatar_url}
                  alt={post.author_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {post.author_name.charAt(0)}
                  </span>
                </div>
              )}
              <span>{post.author_name}</span>
            </div>
            {post.published_at && (
              <div className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                <span>{format(new Date(post.published_at), "dd MMM yyyy")}</span>
              </div>
            )}
            {post.reading_time_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{post.reading_time_minutes} min read</span>
              </div>
            )}
          </div>

          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full rounded-2xl mb-8 object-cover max-h-96"
            />
          )}

          <style>{`
            .blog-content p {
              margin-bottom: 1.5rem !important;
              line-height: 1.8 !important;
            }
            .blog-content h2 {
              margin-top: 2.5rem !important;
              margin-bottom: 1rem !important;
              font-size: 1.5rem !important;
              font-weight: 700 !important;
            }
            .blog-content h3 {
              margin-top: 2rem !important;
              margin-bottom: 0.75rem !important;
              font-size: 1.25rem !important;
              font-weight: 600 !important;
            }
            .blog-content ul, .blog-content ol {
              margin-top: 1.5rem !important;
              margin-bottom: 1.5rem !important;
            }
            .blog-content li {
              margin-bottom: 0.5rem !important;
            }
            .blog-content figure {
              margin-top: 2rem !important;
              margin-bottom: 2rem !important;
            }
          `}</style>
          <div 
            className="blog-content prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-pre:bg-muted"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>

      <WebsiteFooter />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicFormRenderer } from '@/components/forms/PublicFormRenderer';
import { CheckCircle } from 'lucide-react';
import type { FormNode, FormTheme } from '@/types/forms';

interface PublicFormData {
  formId: string;
  name: string;
  slug: string;
  theme: FormTheme;
  layoutTree: FormNode[];
  confirmationMessage?: string;
}

export default function PublicFormPage() {
  const { orgSlug, formSlug } = useParams<{ orgSlug: string; formSlug: string }>();
  const [formData, setFormData] = useState<PublicFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadForm() {
      if (!orgSlug || !formSlug) {
        setError('Invalid form URL');
        setLoading(false);
        return;
      }

      try {
        // Look up org by code
        const { data: org } = await (supabase as any)
          .from('organizations')
          .select('id')
          .eq('slug', orgSlug)
          .maybeSingle();

        if (!org) {
          setError('Form not found');
          setLoading(false);
          return;
        }

        // Look up form
        const { data: form } = await supabase
          .from('forms')
          .select('id, name, slug, status, published_version_id, theme, settings')
          .eq('organization_id', org.id)
          .eq('slug', formSlug)
          .eq('status', 'published')
          .maybeSingle();

        if (!form || !form.published_version_id) {
          setError('Form not found or not published');
          setLoading(false);
          return;
        }

        // Load published version
        const { data: version } = await supabase
          .from('form_versions')
          .select('layout_tree')
          .eq('id', form.published_version_id)
          .single();

        if (!version) {
          setError('Form version not found');
          setLoading(false);
          return;
        }

        const settings = (form.settings || {}) as Record<string, unknown>;

        setFormData({
          formId: form.id,
          name: form.name,
          slug: form.slug,
          theme: (form.theme || {}) as FormTheme,
          layoutTree: (version.layout_tree as unknown as FormNode[]) || [],
          confirmationMessage: (settings.confirmationMessage as string) || undefined,
        });
      } catch (err) {
        setError('Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [orgSlug, formSlug]);

  async function handleSubmit(answers: Record<string, unknown>) {
    if (!formData) return;
    setSubmitting(true);

    try {
      const { error: subErr } = await supabase.functions.invoke('form-public-submit', {
        body: {
          formId: formData.formId,
          answers,
          submitterMeta: {
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            domain: window.location.hostname,
          },
        },
      });

      if (subErr) throw subErr;
      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Form Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center max-w-md mx-auto p-8">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
          <p className="text-muted-foreground">
            {formData?.confirmationMessage || 'Your response has been submitted successfully.'}
          </p>
        </div>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: formData.theme.backgroundColor }}
    >
      <div className="max-w-2xl mx-auto">
        <div
          className="bg-card rounded-lg shadow-sm p-6 md:p-8"
          style={{
            backgroundColor: formData.theme.formBackgroundColor,
            borderRadius: formData.theme.borderRadius ? `${formData.theme.borderRadius}px` : undefined,
          }}
        >
          <PublicFormRenderer
            nodes={formData.layoutTree}
            theme={formData.theme}
            formName={formData.name}
            onSubmit={handleSubmit}
          />
          {submitting && (
            <div className="flex justify-center mt-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by GlobalyOS
        </p>
      </div>
    </div>
  );
}

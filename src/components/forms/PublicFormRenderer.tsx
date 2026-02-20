import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FormNode, FormTheme } from '@/types/forms';

interface PublicFormRendererProps {
  nodes: FormNode[];
  theme: FormTheme;
  formName: string;
  preview?: boolean;
  onSubmit?: (answers: Record<string, unknown>) => void;
}

export function PublicFormRenderer({ nodes, theme, formName, preview, onSubmit }: PublicFormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  function setValue(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview && onSubmit) {
      onSubmit(values);
    }
  }

  const style: React.CSSProperties = {
    backgroundColor: theme.formBackgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    borderRadius: theme.borderRadius ? `${theme.borderRadius}px` : undefined,
  };

  return (
    <form onSubmit={handleSubmit} style={style} className="space-y-4">
      <h1 className="text-2xl font-bold">{formName || 'Untitled Form'}</h1>

      <div className="grid grid-cols-2 gap-4">
        {nodes.map((node) => {
          const isElement = ['heading', 'subheading', 'paragraph', 'image', 'section', 'divider'].includes(node.type);
          const isHalf = !isElement && node.properties.columns === 2;
          return (
            <div
              key={node.id}
              className={isHalf ? 'col-span-1' : 'col-span-2'}
              style={{ paddingLeft: node.spacing.paddingX, paddingRight: node.spacing.paddingX, paddingTop: node.spacing.paddingY, paddingBottom: node.spacing.paddingY }}
            >
              {renderNode(node, values, setValue)}
            </div>
          );
        })}
      </div>

      <Button
        type="submit"
        disabled={preview}
        style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor }}
      >
        Submit
      </Button>
    </form>
  );
}

function renderNode(
  node: FormNode,
  values: Record<string, unknown>,
  setValue: (id: string, v: unknown) => void
) {
  switch (node.type) {
    case 'heading':
      return <h2 className="text-xl font-bold">{node.properties.content || node.properties.label}</h2>;
    case 'subheading':
      return <h3 className="text-lg font-semibold">{node.properties.content || node.properties.label}</h3>;
    case 'paragraph':
      return <p className="text-sm text-muted-foreground">{node.properties.content}</p>;
    case 'divider':
      return <hr className="border-border" />;
    case 'image':
      return node.properties.imageUrl ? <img src={node.properties.imageUrl} alt="" className="max-w-full rounded" /> : <div className="bg-muted rounded p-8 text-center text-muted-foreground text-sm">Image placeholder</div>;
    case 'section':
      return (
        <div className="border border-border rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3">{node.properties.label}</h4>
          {node.children?.map((child) => (
            <div key={child.id}>{renderNode(child, values, setValue)}</div>
          ))}
        </div>
      );
    case 'text':
    case 'email':
    case 'phone':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          {node.properties.description && <p className="text-xs text-muted-foreground">{node.properties.description}</p>}
          <Input
            type={node.type === 'email' ? 'email' : node.type === 'phone' ? 'tel' : 'text'}
            placeholder={node.properties.placeholder}
            value={String(values[node.id] ?? '')}
            onChange={(e) => setValue(node.id, e.target.value)}
            required={node.validation.required}
          />
        </div>
      );
    case 'textarea':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          <Textarea
            placeholder={node.properties.placeholder}
            value={String(values[node.id] ?? '')}
            onChange={(e) => setValue(node.id, e.target.value)}
            required={node.validation.required}
          />
        </div>
      );
    case 'number':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          <Input
            type="number"
            placeholder={node.properties.placeholder}
            value={String(values[node.id] ?? '')}
            onChange={(e) => setValue(node.id, e.target.value)}
            min={node.validation.min}
            max={node.validation.max}
            required={node.validation.required}
          />
        </div>
      );
    case 'date':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          <Input
            type="date"
            value={String(values[node.id] ?? '')}
            onChange={(e) => setValue(node.id, e.target.value)}
            required={node.validation.required}
          />
        </div>
      );
    case 'dropdown':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          <Select value={String(values[node.id] ?? '')} onValueChange={(v) => setValue(node.id, v)}>
            <SelectTrigger><SelectValue placeholder={node.properties.placeholder || 'Select...'} /></SelectTrigger>
            <SelectContent>
              {(node.properties.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'multi_select': {
      const selected = (values[node.id] as string[] | undefined) || [];
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          <div className="space-y-1">
            {(node.properties.options || []).map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value);
                    setValue(node.id, next);
                  }}
                  id={`${node.id}-${opt.value}`}
                />
                <Label htmlFor={`${node.id}-${opt.value}`} className="text-sm font-normal">{opt.label}</Label>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={Boolean(values[node.id])}
            onCheckedChange={(v) => setValue(node.id, v)}
          />
          <Label>{node.properties.label}</Label>
        </div>
      );
    case 'radio':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          <RadioGroup value={String(values[node.id] ?? '')} onValueChange={(v) => setValue(node.id, v)}>
            {(node.properties.options || []).map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`${node.id}-${opt.value}`} />
                <Label htmlFor={`${node.id}-${opt.value}`}>{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    case 'file':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          <Input type="file" required={node.validation.required} />
        </div>
      );
    case 'formula':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label}</Label>
          <div className="bg-muted rounded px-3 py-2 text-sm font-mono">{String(values[node.id] ?? '—')}</div>
        </div>
      );
    case 'payment':
      return (
        <div className="space-y-1.5">
          <Label>{node.properties.label} {node.validation.required && <span className="text-destructive">*</span>}</Label>
          <div className="border border-border rounded-lg p-4 bg-muted/30 text-sm text-muted-foreground flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            <span>Payment will be collected via Stripe on submission</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

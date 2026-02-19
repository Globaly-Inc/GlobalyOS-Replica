/**
 * Block Properties Panel — Right panel
 * Shows editable properties for the currently selected block
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, AlignLeft, AlignCenter, AlignRight, MousePointer2 } from 'lucide-react';
import type {
  EmailBlock,
  HeaderBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  ColumnsBlock,
  SocialBlock,
  FooterBlock,
  SocialLink,
} from '@/types/campaigns';

interface Props {
  block: EmailBlock;
  onChange: (updated: EmailBlock) => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-8 w-10 rounded border border-border cursor-pointer p-0.5" />
      <Input value={value} onChange={e => onChange(e.target.value)} className="h-8 text-xs font-mono" />
    </div>
  </Field>
);

const SliderField = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) => (
  <Field label={`${label}: ${value}px`}>
    <Slider min={min} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} className="w-full" />
  </Field>
);

const AlignField = ({ value, onChange }: { value: 'left' | 'center' | 'right'; onChange: (v: 'left' | 'center' | 'right') => void }) => (
  <Field label="Alignment">
    <div className="flex gap-1">
      {(['left', 'center', 'right'] as const).map(a => {
        const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
        return (
          <Button key={a} size="sm" variant={value === a ? 'default' : 'outline'} className="h-7 w-7 p-0" onClick={() => onChange(a)}>
            <Icon className="h-3.5 w-3.5" />
          </Button>
        );
      })}
    </div>
  </Field>
);

const HeaderProps = ({ block, onChange }: { block: HeaderBlock; onChange: (b: EmailBlock) => void }) => {
  const update = (patch: Partial<HeaderBlock['props']>) => onChange({ ...block, props: { ...block.props, ...patch } });
  return (
    <div className="space-y-3">
      <Field label="Org Name"><Input value={block.props.orgName} onChange={e => update({ orgName: e.target.value })} className="h-8 text-sm" /></Field>
      <Field label="Logo URL"><Input value={block.props.logoUrl} onChange={e => update({ logoUrl: e.target.value })} className="h-8 text-sm" placeholder="https://..." /></Field>
      <ColorField label="Background" value={block.props.backgroundColor} onChange={v => update({ backgroundColor: v })} />
      <ColorField label="Text Color" value={block.props.textColor} onChange={v => update({ textColor: v })} />
      <SliderField label="Padding Top" value={block.props.paddingTop} min={0} max={80} onChange={v => update({ paddingTop: v })} />
      <SliderField label="Padding Bottom" value={block.props.paddingBottom} min={0} max={80} onChange={v => update({ paddingBottom: v })} />
    </div>
  );
};

const TextProps = ({ block, onChange }: { block: TextBlock; onChange: (b: EmailBlock) => void }) => {
  const update = (patch: Partial<TextBlock['props']>) => onChange({ ...block, props: { ...block.props, ...patch } });
  return (
    <div className="space-y-3">
      <Field label="Content (HTML)"><Textarea value={block.props.content} onChange={e => update({ content: e.target.value })} className="text-xs min-h-[100px] font-mono" /></Field>
      <AlignField value={block.props.textAlign} onChange={v => update({ textAlign: v })} />
      <ColorField label="Background" value={block.props.backgroundColor} onChange={v => update({ backgroundColor: v })} />
      <SliderField label="Font Size" value={block.props.fontSize} min={10} max={32} onChange={v => update({ fontSize: v })} />
      <SliderField label="Padding Top" value={block.props.paddingTop} min={0} max={80} onChange={v => update({ paddingTop: v })} />
      <SliderField label="Padding Bottom" value={block.props.paddingBottom} min={0} max={80} onChange={v => update({ paddingBottom: v })} />
      <SliderField label="Padding Left" value={block.props.paddingLeft} min={0} max={80} onChange={v => update({ paddingLeft: v })} />
      <SliderField label="Padding Right" value={block.props.paddingRight} min={0} max={80} onChange={v => update({ paddingRight: v })} />
    </div>
  );
};

const ImageProps = ({ block, onChange }: { block: ImageBlock; onChange: (b: EmailBlock) => void }) => {
  const update = (patch: Partial<ImageBlock['props']>) => onChange({ ...block, props: { ...block.props, ...patch } });
  return (
    <div className="space-y-3">
      <Field label="Image URL"><Input value={block.props.src} onChange={e => update({ src: e.target.value })} className="h-8 text-sm" placeholder="https://..." /></Field>
      <Field label="Alt Text"><Input value={block.props.alt} onChange={e => update({ alt: e.target.value })} className="h-8 text-sm" /></Field>
      <Field label="Link URL"><Input value={block.props.link} onChange={e => update({ link: e.target.value })} className="h-8 text-sm" placeholder="https://..." /></Field>
      <AlignField value={block.props.align} onChange={v => update({ align: v })} />
      <SliderField label="Width" value={block.props.width} min={10} max={100} onChange={v => update({ width: v })} />
      <SliderField label="Padding Top" value={block.props.paddingTop} min={0} max={80} onChange={v => update({ paddingTop: v })} />
      <SliderField label="Padding Bottom" value={block.props.paddingBottom} min={0} max={80} onChange={v => update({ paddingBottom: v })} />
    </div>
  );
};

const ButtonProps = ({ block, onChange }: { block: ButtonBlock; onChange: (b: EmailBlock) => void }) => {
  const update = (patch: Partial<ButtonBlock['props']>) => onChange({ ...block, props: { ...block.props, ...patch } });
  return (
    <div className="space-y-3">
      <Field label="Button Label"><Input value={block.props.label} onChange={e => update({ label: e.target.value })} className="h-8 text-sm" /></Field>
      <Field label="Link URL"><Input value={block.props.href} onChange={e => update({ href: e.target.value })} className="h-8 text-sm" placeholder="https://..." /></Field>
      <AlignField value={block.props.align} onChange={v => update({ align: v })} />
      <ColorField label="Background" value={block.props.backgroundColor} onChange={v => update({ backgroundColor: v })} />
      <ColorField label="Text Color" value={block.props.textColor} onChange={v => update({ textColor: v })} />
      <SliderField label="Border Radius" value={block.props.borderRadius} min={0} max={40} onChange={v => update({ borderRadius: v })} />
      <SliderField label="Font Size" value={block.props.fontSize} min={10} max={24} onChange={v => update({ fontSize: v })} />
      <SliderField label="Padding Top" value={block.props.paddingTop} min={0} max={80} onChange={v => update({ paddingTop: v })} />
      <SliderField label="Padding Bottom" value={block.props.paddingBottom} min={0} max={80} onChange={v => update({ paddingBottom: v })} />
    </div>
  );
};

const DividerProps = ({ block, onChange }: { block: DividerBlock; onChange: (b: EmailBlock) => void }) => {
  const update = (patch: Partial<DividerBlock['props']>) => onChange({ ...block, props: { ...block.props, ...patch } });
  return (
    <div className="space-y-3">
      <ColorField label="Color" value={block.props.color} onChange={v => update({ color: v })} />
      <SliderField label="Height" value={block.props.height} min={1} max={10} onChange={v => update({ height: v })} />
      <SliderField label="Padding Top" value={block.props.paddingTop} min={0} max={80} onChange={v => update({ paddingTop: v })} />
      <SliderField label="Padding Bottom" value={block.props.paddingBottom} min={0} max={80} onChange={v => update({ paddingBottom: v })} />
    </div>
  );
};

const SpacerProps = ({ block, onChange }: { block: SpacerBlock; onChange: (b: EmailBlock) => void }) => (
  <div className="space-y-3">
    <SliderField label="Height" value={block.props.height} min={4} max={200}
      onChange={v => onChange({ ...block, props: { height: v } })} />
  </div>
);

const ColumnsProps = ({ block, onChange }: { block: ColumnsBlock; onChange: (b: EmailBlock) => void }) => {
  const update = (patch: Partial<ColumnsBlock['props']>) => onChange({ ...block, props: { ...block.props, ...patch } });
  return (
    <div className="space-y-3">
      <Field label="Column 1 Content (HTML)">
        <Textarea value={block.props.column1.content} onChange={e => update({ column1: { ...block.props.column1, content: e.target.value } })} className="text-xs min-h-[80px] font-mono" />
      </Field>
      <Field label="Column 2 Content (HTML)">
        <Textarea value={block.props.column2.content} onChange={e => update({ column2: { ...block.props.column2, content: e.target.value } })} className="text-xs min-h-[80px] font-mono" />
      </Field>
      <ColorField label="Background" value={block.props.backgroundColor} onChange={v => update({ backgroundColor: v })} />
      <SliderField label="Padding Top" value={block.props.paddingTop} min={0} max={80} onChange={v => update({ paddingTop: v })} />
      <SliderField label="Padding Bottom" value={block.props.paddingBottom} min={0} max={80} onChange={v => update({ paddingBottom: v })} />
    </div>
  );
};

const socialPlatforms = ['linkedin', 'twitter', 'instagram', 'facebook', 'youtube'] as const;

const SocialProps = ({ block, onChange }: { block: SocialBlock; onChange: (b: EmailBlock) => void }) => {
  const update = (patch: Partial<SocialBlock['props']>) => onChange({ ...block, props: { ...block.props, ...patch } });
  const updateLink = (i: number, link: SocialLink) => { const links = [...block.props.links]; links[i] = link; update({ links }); };
  const addLink = () => update({ links: [...block.props.links, { platform: 'linkedin', url: '' }] });
  const removeLink = (i: number) => update({ links: block.props.links.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-3">
      {block.props.links.map((link, i) => (
        <div key={i} className="space-y-1.5 p-2 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <Select value={link.platform} onValueChange={v => updateLink(i, { ...link, platform: v as SocialLink['platform'] })}>
              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {socialPlatforms.map(p => <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeLink(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input value={link.url} onChange={e => updateLink(i, { ...link, url: e.target.value })} className="h-7 text-xs" placeholder="https://..." />
        </div>
      ))}
      <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={addLink}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
      </Button>
      <AlignField value={block.props.align} onChange={v => update({ align: v })} />
      <ColorField label="Background" value={block.props.backgroundColor} onChange={v => update({ backgroundColor: v })} />
    </div>
  );
};

const FooterProps = ({ block, onChange }: { block: FooterBlock; onChange: (b: EmailBlock) => void }) => {
  const update = (patch: Partial<FooterBlock['props']>) => onChange({ ...block, props: { ...block.props, ...patch } });
  return (
    <div className="space-y-3">
      <Field label="Company Name"><Input value={block.props.companyName} onChange={e => update({ companyName: e.target.value })} className="h-8 text-sm" /></Field>
      <Field label="Address"><Input value={block.props.address} onChange={e => update({ address: e.target.value })} className="h-8 text-sm" /></Field>
      <Field label="Unsubscribe Text"><Input value={block.props.unsubscribeText} onChange={e => update({ unsubscribeText: e.target.value })} className="h-8 text-sm" /></Field>
      <ColorField label="Background" value={block.props.backgroundColor} onChange={v => update({ backgroundColor: v })} />
      <ColorField label="Text Color" value={block.props.textColor} onChange={v => update({ textColor: v })} />
      <SliderField label="Padding Top" value={block.props.paddingTop} min={0} max={80} onChange={v => update({ paddingTop: v })} />
      <SliderField label="Padding Bottom" value={block.props.paddingBottom} min={0} max={80} onChange={v => update({ paddingBottom: v })} />
    </div>
  );
};

export const BlockPropertiesPanel = ({ block, onChange }: Props) => {
  if (!block) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 rounded-full bg-muted mb-3">
          <MousePointer2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No block selected</p>
        <p className="text-xs text-muted-foreground mt-1">Click a block on the canvas to edit its properties</p>
      </div>
    );
  }

  const label = block.type.charAt(0).toUpperCase() + block.type.slice(1);
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{label} block</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {block.type === 'header'  && <HeaderProps  block={block as HeaderBlock}  onChange={onChange} />}
        {block.type === 'text'    && <TextProps    block={block as TextBlock}    onChange={onChange} />}
        {block.type === 'image'   && <ImageProps   block={block as ImageBlock}   onChange={onChange} />}
        {block.type === 'button'  && <ButtonProps  block={block as ButtonBlock}  onChange={onChange} />}
        {block.type === 'divider' && <DividerProps block={block as DividerBlock} onChange={onChange} />}
        {block.type === 'spacer'  && <SpacerProps  block={block as SpacerBlock}  onChange={onChange} />}
        {block.type === 'columns' && <ColumnsProps block={block as ColumnsBlock} onChange={onChange} />}
        {block.type === 'social'  && <SocialProps  block={block as SocialBlock}  onChange={onChange} />}
        {block.type === 'footer'  && <FooterProps  block={block as FooterBlock}  onChange={onChange} />}
      </div>
    </div>
  );
};

/**
 * Block Renderer — Live JSX preview of a single email block
 */

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
} from '@/types/campaigns';

const socialLabels: Record<string, string> = {
  linkedin: 'in', twitter: 'X', instagram: 'IG', facebook: 'f', youtube: '▶',
};

const HeaderRenderer = ({ block }: { block: HeaderBlock }) => {
  const p = block.props;
  return (
    <div style={{ backgroundColor: p.backgroundColor, padding: `${p.paddingTop}px 24px ${p.paddingBottom}px`, textAlign: 'center' }}>
      {p.logoUrl && <img src={p.logoUrl} alt={p.orgName} style={{ maxHeight: 48, margin: '0 auto 8px', display: 'block' }} />}
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: p.textColor }}>{p.orgName}</p>
    </div>
  );
};

const TextRenderer = ({ block }: { block: TextBlock }) => {
  const p = block.props;
  return (
    <div
      style={{
        backgroundColor: p.backgroundColor,
        padding: `${p.paddingTop}px ${p.paddingRight}px ${p.paddingBottom}px ${p.paddingLeft}px`,
        fontSize: p.fontSize,
        textAlign: p.textAlign,
        lineHeight: 1.6,
        color: '#111827',
      }}
      dangerouslySetInnerHTML={{ __html: p.content }}
    />
  );
};

const ImageRenderer = ({ block }: { block: ImageBlock }) => {
  const p = block.props;
  const img = (
    <img
      src={p.src || 'https://via.placeholder.com/600x200/e5e7eb/9ca3af?text=Image'}
      alt={p.alt}
      style={{ display: 'block', maxWidth: '100%', width: `${p.width}%`, border: 'none' }}
    />
  );
  return (
    <div style={{ padding: `${p.paddingTop}px 0 ${p.paddingBottom}px`, textAlign: p.align }}>
      {p.link ? <a href={p.link} style={{ display: 'inline-block' }}>{img}</a> : img}
    </div>
  );
};

const ButtonRenderer = ({ block }: { block: ButtonBlock }) => {
  const p = block.props;
  return (
    <div style={{ padding: `${p.paddingTop}px 24px ${p.paddingBottom}px`, textAlign: p.align }}>
      <a
        href={p.href || '#'}
        style={{
          display: 'inline-block',
          backgroundColor: p.backgroundColor,
          color: p.textColor,
          fontSize: p.fontSize,
          fontWeight: 600,
          textDecoration: 'none',
          padding: '12px 28px',
          borderRadius: p.borderRadius,
        }}
      >
        {p.label}
      </a>
    </div>
  );
};

const DividerRenderer = ({ block }: { block: DividerBlock }) => {
  const p = block.props;
  return (
    <div style={{ padding: `${p.paddingTop}px 24px ${p.paddingBottom}px` }}>
      <hr style={{ border: 'none', borderTop: `${p.height}px solid ${p.color}`, margin: 0 }} />
    </div>
  );
};

const SpacerRenderer = ({ block }: { block: SpacerBlock }) => (
  <div style={{ height: block.props.height, backgroundColor: 'transparent' }} />
);

const ColumnsRenderer = ({ block }: { block: ColumnsBlock }) => {
  const p = block.props;
  return (
    <div style={{ backgroundColor: p.backgroundColor, padding: `${p.paddingTop}px 24px ${p.paddingBottom}px` }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div
          style={{ flex: 1, fontSize: 15, lineHeight: 1.6, color: '#111827', textAlign: p.column1.textAlign }}
          dangerouslySetInnerHTML={{ __html: p.column1.content }}
        />
        <div
          style={{ flex: 1, fontSize: 15, lineHeight: 1.6, color: '#111827', textAlign: p.column2.textAlign }}
          dangerouslySetInnerHTML={{ __html: p.column2.content }}
        />
      </div>
    </div>
  );
};

const SocialRenderer = ({ block }: { block: SocialBlock }) => {
  const p = block.props;
  return (
    <div style={{ backgroundColor: p.backgroundColor, padding: `${p.paddingTop}px 24px ${p.paddingBottom}px`, textAlign: p.align }}>
      {p.links.map((link, i) => (
        <a
          key={i}
          href={link.url || '#'}
          style={{
            display: 'inline-block',
            margin: '0 6px',
            backgroundColor: '#374151',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 700,
            width: 32,
            height: 32,
            lineHeight: '32px',
            textAlign: 'center',
            borderRadius: 4,
          }}
        >
          {socialLabels[link.platform] || link.platform}
        </a>
      ))}
    </div>
  );
};

const FooterRenderer = ({ block }: { block: FooterBlock }) => {
  const p = block.props;
  return (
    <div style={{ backgroundColor: p.backgroundColor, padding: `${p.paddingTop}px 24px ${p.paddingBottom}px`, textAlign: 'center', fontSize: 12, color: p.textColor, lineHeight: 1.6 }}>
      <p style={{ margin: '0 0 4px' }}>{p.companyName}</p>
      <p style={{ margin: '0 0 8px' }}>{p.address}</p>
      <p style={{ margin: 0 }}>
        <a href="#" style={{ color: p.textColor, textDecoration: 'underline' }}>{p.unsubscribeText}</a>
      </p>
    </div>
  );
};

interface Props {
  block: EmailBlock;
}

export const BlockRenderer = ({ block }: Props) => {
  switch (block.type) {
    case 'header':  return <HeaderRenderer block={block as HeaderBlock} />;
    case 'text':    return <TextRenderer block={block as TextBlock} />;
    case 'image':   return <ImageRenderer block={block as ImageBlock} />;
    case 'button':  return <ButtonRenderer block={block as ButtonBlock} />;
    case 'divider': return <DividerRenderer block={block as DividerBlock} />;
    case 'spacer':  return <SpacerRenderer block={block as SpacerBlock} />;
    case 'columns': return <ColumnsRenderer block={block as ColumnsBlock} />;
    case 'social':  return <SocialRenderer block={block as SocialBlock} />;
    case 'footer':  return <FooterRenderer block={block as FooterBlock} />;
    default: return null;
  }
};

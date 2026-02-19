/**
 * Email HTML Renderer
 * Converts EmailBuilderState JSON → email-client-safe inline-styled HTML
 * Used both client-side (preview) and referenced in edge functions (send)
 */

import type {
  EmailBuilderState,
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

const socialIcons: Record<string, string> = {
  linkedin: 'in',
  twitter: 'X',
  instagram: 'IG',
  facebook: 'f',
  youtube: '▶',
};

const renderHeader = (block: HeaderBlock): string => {
  const { logoUrl, orgName, backgroundColor, textColor, paddingTop, paddingBottom } = block.props;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="background-color:${backgroundColor};padding:${paddingTop}px 24px ${paddingBottom}px;">
        ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:48px;display:block;margin:0 auto 8px;" />` : ''}
        <p style="margin:0;font-size:20px;font-weight:700;color:${textColor};">${orgName}</p>
      </td>
    </tr>
  </table>`;
};

const renderText = (block: TextBlock): string => {
  const { content, backgroundColor, paddingTop, paddingBottom, paddingLeft, paddingRight, fontSize, textAlign } = block.props;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background-color:${backgroundColor};padding:${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px;font-size:${fontSize}px;line-height:1.6;text-align:${textAlign};color:#111827;">
        ${content}
      </td>
    </tr>
  </table>`;
};

const renderImage = (block: ImageBlock): string => {
  const { src, alt, link, width, align, paddingTop, paddingBottom } = block.props;
  const img = `<img src="${src}" alt="${alt}" style="display:block;max-width:100%;width:${width}%;border:0;" />`;
  const wrapped = link ? `<a href="${link}" style="display:block;">${img}</a>` : img;
  const alignMap = { left: 'left', center: 'center', right: 'right' };
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="${alignMap[align]}" style="padding:${paddingTop}px 0 ${paddingBottom}px;">
        ${wrapped}
      </td>
    </tr>
  </table>`;
};

const renderButton = (block: ButtonBlock): string => {
  const { label, href, backgroundColor, textColor, borderRadius, align, paddingTop, paddingBottom, fontSize } = block.props;
  const alignMap = { left: 'left', center: 'center', right: 'right' };
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="${alignMap[align]}" style="padding:${paddingTop}px 24px ${paddingBottom}px;">
        <a href="${href || '#'}" style="display:inline-block;background-color:${backgroundColor};color:${textColor};font-size:${fontSize}px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:${borderRadius}px;mso-padding-alt:0;text-align:center;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
};

const renderDivider = (block: DividerBlock): string => {
  const { color, height, paddingTop, paddingBottom } = block.props;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:${paddingTop}px 24px ${paddingBottom}px;">
        <hr style="border:none;border-top:${height}px solid ${color};margin:0;" />
      </td>
    </tr>
  </table>`;
};

const renderSpacer = (block: SpacerBlock): string => {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="height:${block.props.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`;
};

const renderColumns = (block: ColumnsBlock): string => {
  const { backgroundColor, paddingTop, paddingBottom, column1, column2 } = block.props;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background-color:${backgroundColor};padding:${paddingTop}px 24px ${paddingBottom}px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="48%" valign="top" style="text-align:${column1.textAlign};padding-right:12px;font-size:15px;line-height:1.6;color:#111827;">
              ${column1.content}
            </td>
            <td width="4%">&nbsp;</td>
            <td width="48%" valign="top" style="text-align:${column2.textAlign};padding-left:12px;font-size:15px;line-height:1.6;color:#111827;">
              ${column2.content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
};

const renderSocial = (block: SocialBlock): string => {
  const { links, align, paddingTop, paddingBottom, backgroundColor } = block.props;
  const icons = links
    .filter(l => l.url)
    .map(
      l =>
        `<a href="${l.url}" style="display:inline-block;margin:0 6px;background:#374151;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;width:32px;height:32px;line-height:32px;text-align:center;border-radius:4px;">
          ${socialIcons[l.platform] || l.platform}
        </a>`
    )
    .join('');
  const alignMap = { left: 'left', center: 'center', right: 'right' };
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="${alignMap[align]}" style="background-color:${backgroundColor};padding:${paddingTop}px 24px ${paddingBottom}px;">
        ${icons}
      </td>
    </tr>
  </table>`;
};

const renderFooter = (block: FooterBlock): string => {
  const { companyName, address, unsubscribeText, backgroundColor, textColor, paddingTop, paddingBottom } = block.props;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="background-color:${backgroundColor};padding:${paddingTop}px 24px ${paddingBottom}px;font-size:12px;color:${textColor};line-height:1.6;">
        <p style="margin:0 0 4px;">${companyName}</p>
        <p style="margin:0 0 8px;">${address}</p>
        <p style="margin:0;">
          <a href="{{unsubscribe_url}}" style="color:${textColor};text-decoration:underline;">${unsubscribeText}</a>
        </p>
      </td>
    </tr>
  </table>`;
};

const renderBlock = (block: EmailBlock): string => {
  switch (block.type) {
    case 'header':  return renderHeader(block as HeaderBlock);
    case 'text':    return renderText(block as TextBlock);
    case 'image':   return renderImage(block as ImageBlock);
    case 'button':  return renderButton(block as ButtonBlock);
    case 'divider': return renderDivider(block as DividerBlock);
    case 'spacer':  return renderSpacer(block as SpacerBlock);
    case 'columns': return renderColumns(block as ColumnsBlock);
    case 'social':  return renderSocial(block as SocialBlock);
    case 'footer':  return renderFooter(block as FooterBlock);
    default:        return '';
  }
};

export const renderEmailHtml = (state: EmailBuilderState, previewMode = false): string => {
  const { blocks, globalStyles } = state;
  const { backgroundColor, fontFamily, maxWidth } = globalStyles;

  const blocksHtml = blocks.map(renderBlock).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Email</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${backgroundColor};font-family:${fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${backgroundColor};">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table width="${maxWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width:${maxWidth}px;width:100%;">
          <tr>
            <td>
              ${blocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${previewMode ? '' : '<!-- TRACKING_PIXEL_PLACEHOLDER -->'}
</body>
</html>`;
};

/** Check if the builder state has a footer block (compliance gate) */
export const hasFooterBlock = (state: EmailBuilderState): boolean => {
  return state.blocks.some(b => b.type === 'footer');
};

/** Count of blocks for display */
export const getBlockCount = (state: EmailBuilderState): number => state.blocks.length;

/**
 * Formats position description and responsibilities as rich text HTML
 */
export const formatPositionAsRichText = (
  description: string | null | undefined,
  responsibilities: string[] | null | undefined
): string => {
  let html = '';

  if (description) {
    html += `<p>${description}</p>`;
  }

  if (responsibilities && responsibilities.length > 0) {
    if (description) {
      html += '<p><strong>Key Responsibilities:</strong></p>';
    }
    html += '<ul>';
    responsibilities.forEach((r) => {
      html += `<li>${r}</li>`;
    });
    html += '</ul>';
  }

  return html;
};

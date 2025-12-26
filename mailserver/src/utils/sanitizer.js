const sanitizeHtml = require('sanitize-html');

// Configure sanitize-html for email content
const sanitizeEmailHTML = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Custom configuration for email content
  // We allow most common email HTML tags but forbid dangerous ones
  const cleanHTML = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'html', 'head', 'body', 'meta', 'title', 'style', 'link', 'center', 
      'font', 'map', 'area', 'base', 'img', 'table', 'thead', 'tbody', 
      'tfoot', 'tr', 'th', 'td', 'caption', 'col', 'colgroup'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['align', 'valign', 'bgcolor', 'color', 'face', 'size', 
            'background', 'border', 'cellpadding', 'cellspacing',
            'width', 'height', 'id', 'class', 'style'],
      'a': ['href', 'name', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'style'],
      'link': ['rel', 'type', 'href'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'cid'],
    allowVulnerableTags: true,
    disallowedTagsMode: 'discard',
  });

  return cleanHTML;
};

// Text-to-HTML converter with basic formatting
const textToHTML = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/  /g, '&nbsp;&nbsp;');
};

module.exports = {
  sanitizeEmailHTML,
  textToHTML
};

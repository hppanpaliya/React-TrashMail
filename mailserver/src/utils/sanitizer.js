const sanitizeHtml = require('sanitize-html');

// Reusable safe-value regexes for the CSS property allowlist. Anything not
// matching is stripped, which blocks expression(), url(...), -moz-binding etc.
const COLOR = [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i, /^rgba\(/i, /^[a-z-]+$/i];
const LENGTH = [/^\d+(?:px|em|rem|%|pt)?$/i, /^auto$/i];

// Configure sanitize-html for email content
const sanitizeEmailHTML = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Custom configuration for email content. Email bodies are attacker-
  // controlled, so <style>/<link> are stripped and inline styles are limited
  // to an allowlist of presentational properties.
  const cleanHTML = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'html', 'head', 'body', 'meta', 'title', 'center',
      'font', 'map', 'area', 'base', 'img', 'table', 'thead', 'tbody',
      'tfoot', 'tr', 'th', 'td', 'caption', 'col', 'colgroup'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['align', 'valign', 'bgcolor', 'color', 'face', 'size',
            'background', 'border', 'cellpadding', 'cellspacing',
            'width', 'height', 'id', 'class', 'style'],
      'a': ['href', 'name', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'style'],
    },
    allowedStyles: {
      '*': {
        'color': COLOR,
        'background-color': COLOR,
        'text-align': [/^left$|^right$|^center$|^justify$/i],
        'font-size': LENGTH,
        'font-weight': [/^normal$|^bold$|^\d{3}$/i],
        'font-family': [/^[\w\s,'"-]+$/i],
        'line-height': LENGTH,
        'vertical-align': [/^[a-z-]+$/i],
        'width': LENGTH,
        'height': LENGTH,
        'border': [/^[\w\s#().,%-]+$/i],
        'padding': LENGTH,
        'margin': LENGTH,
      },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'cid'],
    disallowedTagsMode: 'discard',
    transformTags: {
      // Force safe rel on every anchor to prevent reverse tabnabbing;
      // overwrites any sender-supplied rel by design.
      'a': (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: 'noopener noreferrer nofollow' },
      }),
    },
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

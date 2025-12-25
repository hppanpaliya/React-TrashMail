const createDOMPurify = require('isomorphic-dompurify');

const DOMPurify = createDOMPurify();

// Configure DOMPurify for email content
const sanitizeEmailHTML = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Custom configuration for email content
  const cleanHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 
      'tr', 'td', 'th', 'div', 'span', 'a', 'img', 'hr'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'style', 'class', 'id', 'target',
      'width', 'height', 'border', 'cellpadding', 'cellspacing'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    KEEP_CONTENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false,
    IN_PLACE: false
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

const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify')(new JSDOM('').window);

// Configure DOMPurify for email content
const sanitizeEmailHTML = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Custom configuration for email content
  // We use ADD_TAGS and ADD_ATTR to extend defaults rather than restricting to a small set,
  // because emails can contain a wide variety of HTML for layout and styling.
  const cleanHTML = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true, // Preserve html, head, body
    ADD_TAGS: ['head', 'meta', 'title', 'style', 'link', 'center', 'font', 'map', 'area', 'base'],
    ADD_ATTR: [
      'align', 'valign', 'bgcolor', 'color', 'face', 'size', 
      'target', 'background', 'border', 'cellpadding', 'cellspacing',
      'width', 'height', 'id', 'class', 'style'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe', 'frame', 'frameset', 'applet'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup', 'ondblclick', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown', 'onkeypress', 'onkeyup'],
    KEEP_CONTENT: false,
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

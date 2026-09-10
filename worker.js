function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const mapsKey = String(env.GOOGLE_MAPS_API_KEY || '').trim();
    const response = await env.ASSETS.fetch(request);

    if (pathname !== '/contact' && pathname !== '/contact.html') {
      return response;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    const rewriter = new HTMLRewriter()
      // Rewrite the visible address field before the browser sees the HTML so
      // Chrome/Google address autofill does not compete with PPW's suggestions.
      .on('label[for="street"]', {
        element(element) {
          element.setAttribute('for', 'ppw-property-address-search');
        },
      })
      .on('input#street', {
        element(element) {
          element.setAttribute('id', 'ppw-property-address-search');
          element.setAttribute('name', 'property_address_lookup');
          element.setAttribute('type', 'search');
          element.setAttribute('autocomplete', 'off');
          element.setAttribute('data-form-type', 'other');
          element.setAttribute('data-lpignore', 'true');
          element.setAttribute('data-1p-ignore', 'true');
          element.setAttribute('spellcheck', 'false');
          element.setAttribute('autocapitalize', 'words');
        },
      })
      .on('script[src="assets/address-autocomplete.js"]', {
        element(element) {
          element.setAttribute('src', 'assets/address-autocomplete.js?v=google-places-20260910');
        },
      });

    if (mapsKey) {
      rewriter.on('head', {
        element(element) {
          element.append(
            `<meta name="ppw-google-maps-key" content="${escapeAttr(mapsKey)}">`,
            { html: true },
          );
        },
      });
    }

    return rewriter.transform(response);
  },
};

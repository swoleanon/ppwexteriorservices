export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const mapsKey = String(env.GOOGLE_MAPS_API_KEY || '').trim();
    const response = await env.ASSETS.fetch(request);

    if (pathname !== '/contact' && pathname !== '/contact.html') {
      return response;
    }

    if (!mapsKey) return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    return new HTMLRewriter()
      .on('meta[name="ppw-google-maps-key"]', {
        element(element) {
          element.setAttribute('content', mapsKey);
        },
      })
      .on('script[src="assets/address-autocomplete.js"]', {
        element(element) {
          element.setAttribute('src', 'assets/address-autocomplete.js?v=google-20260907');
        },
      })
      .transform(response);
  },
};

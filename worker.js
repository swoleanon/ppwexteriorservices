export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const mapsKey = String(env.GOOGLE_MAPS_API_KEY || '').trim();

    // Safe production diagnostic: confirms Worker execution and secret presence
    // without ever exposing the secret value.
    if (pathname === '/__ppw/maps-status') {
      return Response.json(
        {
          worker: true,
          googleMapsKeyConfigured: Boolean(mapsKey),
        },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

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
      .transform(response);
  },
};

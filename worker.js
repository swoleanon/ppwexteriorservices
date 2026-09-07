export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const mapsKey = String(env.GOOGLE_MAPS_API_KEY || '').trim();

    // Safe production diagnostic: confirms Worker execution and secret presence
    // without ever exposing the secret value.
    if (pathname === '/__ppw/maps-status') {
      const result = {
        worker: true,
        googleMapsKeyConfigured: Boolean(mapsKey),
      };

      if (url.searchParams.get('probe') === '1' && mapsKey) {
        try {
          const googleResponse = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': mapsKey,
              'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
              'Referer': 'https://ppwexteriorservices.com/contact',
            },
            body: JSON.stringify({
              input: '1525 northeast 26',
              includedRegionCodes: ['us'],
              locationRestriction: {
                rectangle: {
                  low: { latitude: 25.10, longitude: -80.95 },
                  high: { latitude: 27.10, longitude: -79.95 },
                },
              },
            }),
          });
          const payload = await googleResponse.json().catch(() => null);
          result.googlePlacesProbe = {
            status: googleResponse.status,
            ok: googleResponse.ok,
            errorStatus: payload?.error?.status || null,
            errorMessage: payload?.error?.message || null,
            suggestionsReturned: Array.isArray(payload?.suggestions) ? payload.suggestions.length : null,
          };
        } catch (error) {
          result.googlePlacesProbe = {
            status: null,
            ok: false,
            errorStatus: 'FETCH_FAILED',
            errorMessage: String(error?.message || error),
            suggestionsReturned: null,
          };
        }
      }

      return Response.json(result, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
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

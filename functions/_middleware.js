export async function onRequest({ request, env, next }) {
  const response = await next();
  const url = new URL(request.url);

  if (!url.pathname.endsWith('/contact.html') && url.pathname !== '/contact') {
    return response;
  }

  const mapsKey = String(env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!mapsKey) return response;

  return new HTMLRewriter()
    .on('meta[name="ppw-google-maps-key"]', {
      element(element) {
        element.setAttribute('content', mapsKey);
      },
    })
    .transform(response);
}

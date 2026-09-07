export async function onRequest({ request, env, next }) {
  const response = await next();
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (pathname !== '/contact' && pathname !== '/contact.html') {
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

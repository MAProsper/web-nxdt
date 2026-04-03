const MAGIC = 'NXDT';

async function resolve(request) {
    let response = await fetch(request).catch(() => Response.error());
    let cache = request.method == 'GET';
    if (!cache) return response;

    cache = await caches.open(MAGIC);
    if (response.ok) {
        await cache.put(request, response.clone());
    } else {
        response = await cache.match(request) || response;
    }

    return response;
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (url.origin !== location.origin) return;
    event.respondWith(resolve(request));
});
const MAGIC = 'NXDT';

async function process(request) {
    const url = new URL(request.url);

    let response = await fetch(request).catch(() => Response.error());

    if (request.method == 'GET' && url.host == location.host) {
        const cache = await caches.open(MAGIC);

        if (response.ok) {
            await cache.put(request, response.clone());
        } else {
            response = await cache.match(request) || response;
        }
    }

    return response;
}

self.addEventListener('fetch', event => {
    const request = event.request;
    const respone = process(request);
    event.respondWith(respone);
});
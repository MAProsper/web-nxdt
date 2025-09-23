const MAGIC = 'NXDT';

async function process(request) {
    const include = new URL(request.url).host == location.host;
    let response;

    try {
        response = await fetch(request);

        if (include && response.ok) {
            const cache = await caches.open(MAGIC);
            await cache.put(request, response.clone());
        }
    } catch (e) {
        console.warn(e);

        if (include) {
            response = await caches.match(request);
        }

        if (!response) {
            response = Response.error();
        }
    }

    return response;
}

self.addEventListener('fetch', event => {
    const request = event.request;
    const respone = process(request);
    event.respondWith(respone);
});
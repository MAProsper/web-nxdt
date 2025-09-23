const MAGIC = 'NXDT';

async function process(request) {
    let response;
    try {
        response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(MAGIC);
            cache.put(request, response.clone());
        }
    } catch (e) {
        console.warn(e);
        response = await caches.match(request);
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
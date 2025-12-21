const CACHE_NAME = 'dkapp-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Handle PDF files - cache first, then network
    if (url.endsWith('.pdf') || url.includes('/La-') || url.includes('poecdn.net')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) =>
                cache.match(event.request).then((cached) => {
                    if (cached) {
                        // Return cached version immediately
                        // Also try to update cache in background
                        fetch(event.request).then((response) => {
                            if (response.ok) {
                                cache.put(event.request, response.clone());
                            }
                        }).catch(() => {});
                        return cached;
                    }
                    // No cache, try network
                    return fetch(event.request).then((response) => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    }).catch(() => {
                        // Return empty response if offline and not cached
                        return new Response('Offline - PDF not cached', { status: 503 });
                    });
                })
            )
        );
        return;
    }

    // Handle JSON files (like index.json)
    if (url.endsWith('.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) =>
                fetch(event.request).then((response) => {
                    if (response.ok) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => cache.match(event.request))
            )
        );
        return;
    }

    // Network first, fallback to cache for other requests
    event.respondWith(
        fetch(event.request).then((response) => {
            if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => caches.match(event.request))
    );
});

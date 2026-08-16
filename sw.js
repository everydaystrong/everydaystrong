// Everyday Strong — update-control service worker.
//
// The job of this file is to make sure that whenever Heather uploads a new
// version of the site, everyone's phone actually shows it — instead of
// getting stuck on an old cached copy, which is a known iOS home-screen-app
// problem that plain HTML cache-control tags don't reliably fix.
//
// IMPORTANT DISTINCTION (this is the fix for the "photos cut off / different
// every time" bug from the first version of this file):
//   - App CONTENT (the HTML pages themselves) must always be fetched fresh,
//     every time — that's the whole point of this file.
//   - PHOTOS should NOT be force-refetched every time. They're large, and
//     forcing a full re-download of every photo on every visit means a slow
//     or spotty connection can leave an image only partially loaded — which
//     looks exactly like a broken/cut-off photo, and can look different each
//     time depending on the connection in that moment. Photos should cache
//     normally, the way virtually every website handles images, so they load
//     fast and reliably regardless of connection quality.
//
// skipWaiting()/clients.claim() make a newly-deployed version take over
// immediately instead of waiting for every open tab to close first — and the
// page itself listens for that handoff and reloads on its own.

var IMG_CACHE = "es-img-cache-v1";

self.addEventListener("install", function(event){
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys()
      .then(function(names){
        return Promise.all(names.filter(function(n){ return n !== IMG_CACHE; }).map(function(n){ return caches.delete(n); }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  var req = event.request;

  if(req.destination === "image"){
    // Images: cache-first, refreshing quietly in the background for next
    // time. Shows instantly from cache if we have one (fast, reliable even
    // on weak signal); always keeps the cache updated with the latest photo
    // for the visit after this one.
    event.respondWith(
      caches.open(IMG_CACHE).then(function(cache){
        return cache.match(req).then(function(cached){
          var networkFetch = fetch(req).then(function(resp){
            if(resp && resp.ok) cache.put(req, resp.clone());
            return resp;
          }).catch(function(){ return cached; });
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // Everything else (the app pages themselves): always fetch fresh, bypassing
  // the browser's HTTP cache entirely, so updates show up reliably.
  event.respondWith(
    fetch(req, {cache: "no-store"}).catch(function(){
      return new Response(
        "You're offline and this page hasn't loaded before, so there's nothing saved to show. Please check your connection and try again.",
        {status: 503, headers: {"Content-Type": "text/plain"}}
      );
    })
  );
});

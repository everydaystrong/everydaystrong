// Everyday Strong — update-control service worker.
//
// The ONLY job of this file is to make sure that whenever Heather uploads a
// new version of the site, everyone's phone actually shows it — instead of
// getting stuck on an old cached copy, which is a known iOS home-screen-app
// problem that plain HTML cache-control tags don't reliably fix.
//
// It does this two ways:
//   1. Every request is fetched fresh from the network (cache:'no-store'),
//      bypassing the browser's own HTTP cache entirely.
//   2. skipWaiting()/clients.claim() make a newly-deployed version take over
//      immediately instead of waiting for every open tab to close first —
//      and the page itself listens for that handoff and reloads on its own.
//
// This service worker intentionally does NOT cache anything for offline use.
// That's a deliberate simplicity/safety choice: a caching strategy that gets
// it wrong can trap people on a stale version even harder to escape than the
// original problem. If offline support is ever wanted, that's a separate,
// bigger feature to build carefully — not bundled in here.

self.addEventListener("install", function(event){
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys()
      .then(function(names){ return Promise.all(names.map(function(n){ return caches.delete(n); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  event.respondWith(
    fetch(event.request, {cache: "no-store"}).catch(function(){
      return new Response(
        "You're offline and this page hasn't loaded before, so there's nothing saved to show. Please check your connection and try again.",
        {status: 503, headers: {"Content-Type": "text/plain"}}
      );
    })
  );
});

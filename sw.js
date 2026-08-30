/**
 * Service Worker — Training Lab
 * Offline caching and app shell.
 */

const CACHE_NAME = 'training-lab-v1.4';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/modules/exercises.js',
  './js/modules/sessions.js',
  './js/modules/calendar.js',
  './js/modules/timer.js',
  './js/modules/players.js',
  './js/modules/share.js',
  './js/modules/storage.js',
  './js/modules/exercise-diagrams.js',
  './js/modules/field-editor.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first for navigation, cache first for assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});

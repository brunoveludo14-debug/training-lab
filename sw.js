/**
 * Service Worker — Training Lab
 * Offline caching and app shell.
 */

const CACHE_NAME = 'training-lab-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './modules/exercises.js',
  './modules/sessions.js',
  './modules/calendar.js',
  './modules/timer.js',
  './modules/players.js',
  './modules/share.js',
  './modules/storage.js',
  './modules/exercise-diagrams.js',
  './modules/field-editor.js',
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

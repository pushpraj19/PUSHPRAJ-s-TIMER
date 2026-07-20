if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(error => {
      console.warn('Offline mode could not be enabled.', error);
    });
  });
}

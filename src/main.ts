const app = document.getElementById('app');
if (app) {
  app.textContent = 'the-typist';
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === 'fixture') {
    void import('./dev/fixture').then((m) => m.startFixture(app));
  }
}

import { loadSprites } from './render/sprites';

const app = document.getElementById('app');
if (app) {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === 'fixture') {
    void import('./dev/fixture').then((m) => m.startFixture(app));
  } else {
    // placeholders are drawn until the sprites arrive
    loadSprites(import.meta.env.BASE_URL).catch((e) => console.error(e));
    void import('./ui/app').then((m) => m.startApp({ root: app }));
  }
}

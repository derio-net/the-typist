import { expect, test } from '@playwright/test';

const FIXTURE = 'tests/fixtures/lists/two-records.yaml';

// Typed per ship. Final '.' is pre-typed by the game, so it is left out.
const WRONG_KEYS = 'q'.repeat(20);

test('load a list, free-play it, and persist both Records', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('[data-panel=title]')).toBeVisible();

  await page.locator('[data-testid=list-file]').setInputFiles(FIXTURE);
  await page.locator('[data-list=fixture-two]').click();
  await page.locator('[data-action=free-play]').click();
  // a list without categories goes straight to play; with categories, pick the first
  const category = page.locator('[data-panel=category] [data-category]').first();
  if (await category.isVisible({ timeout: 1000 }).catch(() => false)) await category.click();

  const kb = page.keyboard;
  const settle = () => page.waitForTimeout(700);

  // Record 1 (noun, graded Hard): mothership with the oe fallback on the umlaut
  await page.waitForTimeout(1500);
  await kb.type('die Boerse');
  await settle();
  // forms ship, then the two ambiguous escorts (the lower ship locks first), then the third
  await kb.type('die Börsen');
  await settle();
  await kb.type('D' + WRONG_KEYS + 'ie Börsen in Asien öffnen früher');
  await settle();
  await kb.type('Die Börse schloss gestern mit leichten Verlusten');
  await settle();
  await kb.type('Sie arbeitet an der Börse');

  // Record 2 (verb, clean)
  await page.waitForTimeout(2500);
  await kb.type('anlegen');
  await settle();
  await kb.type('legte an, hat angelegt');
  await settle();
  await kb.type('Er legte das Geld sicher an');
  await settle();
  await kb.type('Wir haben viel Geld angelegt');
  await settle();
  await kb.type('Sie legt ihr Geld in Aktien an');

  const between = page.locator('[data-panel=between-wave]');
  await expect(between).toBeVisible({ timeout: 20_000 });
  await expect(between.locator('[data-card=noun-boerse]')).toBeVisible();
  await between.locator('[data-action=continue]').click();

  const summary = page.locator('[data-panel=summary]');
  await expect(summary).toBeVisible();
  await expect(summary.locator('[data-grade=Hard] b')).toHaveText('1');
  await summary.locator('[data-action=close]').click();

  const keys = await page.evaluate(
    () =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('typist');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('cards', 'readonly').objectStore('cards').getAllKeys();
          req.onsuccess = () => resolve(req.result as unknown[]);
          req.onerror = () => reject(req.error);
        };
      }),
  );
  expect(keys).toEqual(expect.arrayContaining([['fixture-two', 'noun-boerse'], ['fixture-two', 'verb-anlegen']]));
});

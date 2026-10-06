import { expect, test } from '@playwright/test';

const FIXTURE = 'tests/fixtures/lists/two-records.yaml';

// Once a ship is locked every non-matching key is a typo, which pushes the Record past the 10% Hard threshold.
const WRONG_KEYS = 'q'.repeat(20);

test('load a list, free-play it, and persist both Records', async ({ page }) => {
  // German TTS must stay silent on the operator's machine (--mute-audio does not cover system TTS)
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: string[] };
    w.__spoken = [];
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void w.__spoken.push(u.text);
    speechSynthesis.cancel = () => undefined;
  });

  await page.goto('./');
  await expect(page.locator('[data-panel=title]')).toBeVisible();

  await page.locator('[data-testid=list-file]').setInputFiles(FIXTURE);
  await page.locator('[data-list=fixture-two]').click();
  await page.locator('[data-action=free-play]').click();
  // the fixture has no categories, so play starts straight away
  await expect(page.locator('[data-panel]')).toHaveCount(0);

  const kb = page.keyboard;
  // Ships live on a canvas, so entry is not observable in the DOM: a mothership enters shortly after play
  // starts and keys typed before that are ignored. Children spawn synchronously when their mothership dies.
  await page.waitForTimeout(1500);
  await kb.type('die Boerse'); // oe fallback on the umlaut
  await kb.type('die Börsen');
  // two escorts share "Die Börse"; the lower ship locks first
  await kb.type('D' + WRONG_KEYS + 'ie Börsen in Asien öffnen früher');
  await kb.type('Die Börse schloss gestern mit leichten Verlusten');
  await kb.type('Sie arbeitet an der Börse');

  // the next Record's mothership enters after the previous Record's last ship is gone (not observable)
  await page.waitForTimeout(2500);
  await kb.type('anlegen');
  await kb.type('legte an, hat angelegt');
  await kb.type('Er legte das Geld sicher an');
  await kb.type('Wir haben viel Geld angelegt');
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

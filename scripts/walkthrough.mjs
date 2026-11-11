// Clicks through the Phase 1 walkthrough with Playwright and saves screenshots.
// Usage: npm run build && npx vite preview --port 4173 & npm run walkthrough
import { createRequire } from 'node:module';
// CommonJS require so a globally installed Playwright also resolves (via NODE_PATH).
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';

const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.OUT ?? 'docs/screenshots';
const SCALE = Number(process.env.SCALE ?? 2);
mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };

async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

const browser = await chromium.launch();

// ---------- Desktop ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SCALE, colorScheme: 'light' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`desktop: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`desktop console: ${m.text()}`));
  await page.goto(URL);
  await page.screenshot({ path: `${OUT}/desktop-01-home.png` });

  // Step 1: open project, switch files, return home
  await page.getByRole('button', { name: /^Data Study/ }).click();
  await page.getByRole('heading', { name: 'Files' }).waitFor();
  check('Project opens directly into its workspace', await page.getByRole('tab', { name: /clean_data\.py/ }).isVisible());
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/desktop-02-python-file.png` });
  await page.locator('.file-tree').getByRole('button', { name: /^analysis\.ipynb/ }).click();
  check('Notebook opens in a tab', await page.getByRole('tab', { name: /analysis\.ipynb/, selected: true }).isVisible());
  await page.screenshot({ path: `${OUT}/desktop-03-notebook.png` });
  await page.getByRole('tab', { name: /clean_data\.py/ }).click();
  check('Switch back to Python file', await page.getByRole('tab', { name: /clean_data\.py/, selected: true }).isVisible());

  // Run the python file
  await page.getByRole('button', { name: /^Run on this device/ }).click();
  await page.getByText('Loading Python…', { exact: false }).first().waitFor();
  await page.screenshot({ path: `${OUT}/desktop-04-runtime-loading.png` });
  await page.getByText('Wrote data/clean_survey.csv').waitFor({ timeout: 5000 });
  check('Python file run shows output panel', true);
  await page.screenshot({ path: `${OUT}/desktop-05-python-output.png` });

  await page.getByRole('button', { name: 'All projects' }).click();
  check('Return home via breadcrumb', await page.getByRole('heading', { name: 'Projects' }).isVisible());

  // Step 2: share
  await page.getByRole('button', { name: /^Data Study/ }).click();
  await page.getByRole('button', { name: 'Share project' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share Data Study' });
  check('Share dialog shows owner and members', (await dialog.getByText('Owner', { exact: true }).count()) === 1 && (await dialog.getByText('Member', { exact: true }).count()) === 3);
  await dialog.getByPlaceholder('name@example.com').fill('robin@example.com');
  await dialog.getByRole('button', { name: 'Invite as member' }).click();
  check('Invitation preview appears as pending', await dialog.getByText('robin@example.com').first().isVisible());
  await page.screenshot({ path: `${OUT}/desktop-06-share.png` });
  await page.keyboard.press('Escape');
  check('Esc closes the dialog', (await page.getByRole('dialog').count()) === 0);
  check('Focus returns to Share button', await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Share project'));

  // Step 3: add a cell and run 6 * 7
  await page.locator('.file-tree').getByRole('button', { name: /^analysis\.ipynb/ }).click();
  await page.locator('.cells__add').getByRole('button', { name: /Code cell/ }).click();
  await page.keyboard.type('6 * 7');
  await page.keyboard.press('Shift+Enter');
  await page.locator('.cell').last().getByText('42', { exact: true }).waitFor({ timeout: 5000 });
  check('6 * 7 shows 42 as preview output', true);
  await page.locator('.cell').last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/desktop-07-notebook-42.png` });

  // Step 4: reconnecting + runtime error via fixture controls
  await page.getByRole('tab', { name: 'Fixture states' }).click();
  await page.getByRole('button', { name: 'Changes pending' }).click();
  check('Reconnecting banner visible', await page.getByText('Reconnecting…').first().isVisible());
  await page.getByRole('button', { name: 'Error', exact: true }).click();
  check('Runtime error offers .ipynb download', await page.getByRole('button', { name: /Download \.ipynb/ }).first().isVisible());
  await page.locator('.nb-view__scroll').evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({ path: `${OUT}/desktop-08-reconnecting-and-error.png` });

  // Dark theme
  await page.getByRole('button', { name: 'Retry now' }).first().click();
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.locator('.file-tree').getByRole('button', { name: /^clean_data\.py/ }).click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/desktop-09-dark.png` });

  // Keyboard: file actions menu via keyboard
  await page.getByRole('button', { name: 'Actions for README.md' }).focus();
  await page.keyboard.press('Enter');
  const menuFocused = await page.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitem');
  await page.keyboard.press('ArrowDown');
  const second = await page.evaluate(() => document.activeElement?.textContent);
  await page.keyboard.press('Escape');
  check('File menu works with keyboard (Enter, arrows, Esc)', menuFocused && /Download/.test(second));
  await ctx.close();
}

// ---------- Mobile ----------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], colorScheme: 'light' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`mobile: ${e.message}`));
  await page.goto(URL);
  check('Mobile home: no horizontal page scroll', await noHorizontalScroll(page));
  await page.screenshot({ path: `${OUT}/mobile-01-home.png` });
  await page.getByRole('button', { name: /^Data Study/ }).click();
  await page.waitForTimeout(300);
  check('Mobile workspace: no horizontal page scroll', await noHorizontalScroll(page));
  check('Mobile: file tree hidden behind drawer', !(await page.locator('#file-sidebar').isVisible()));
  await page.screenshot({ path: `${OUT}/mobile-02-workspace.png` });
  await page.getByRole('button', { name: 'Show files' }).tap();
  await page.waitForTimeout(300);
  check('Mobile: drawer opens', await page.locator('#file-sidebar').isVisible());
  await page.screenshot({ path: `${OUT}/mobile-03-drawer.png` });
  await page.locator('.file-tree').getByRole('button', { name: /^analysis\.ipynb/ }).tap();
  await page.waitForTimeout(300);
  check('Mobile: drawer closes after choosing a file', !(await page.locator('#file-sidebar').isVisible()));
  const run = page.getByRole('button', { name: /^Run all/ });
  const box = await run.boundingBox();
  check('Mobile: Run control visible and ≥ 44px tall', box && box.height >= 44 && box.y + box.height <= 844);
  check('Mobile notebook: no horizontal page scroll', await noHorizontalScroll(page));
  await page.screenshot({ path: `${OUT}/mobile-04-notebook.png` });
  await page.getByRole('button', { name: /^Open prototype guide/ }).tap();
  await page.getByRole('button', { name: /^Do it: Run 6/ }).tap();
  await page.locator('.cell').last().getByText('42', { exact: true }).waitFor({ timeout: 5000 });
  await page.locator('.cell').last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/mobile-05-run-42.png` });
  await page.getByRole('button', { name: 'Share project' }).tap();
  check('Mobile share dialog fits viewport', await noHorizontalScroll(page));
  await page.screenshot({ path: `${OUT}/mobile-06-share.png` });
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
if (errors.length) console.log('\nRuntime errors:\n' + errors.join('\n'));
console.log(`\n${results.length - failed.length}/${results.length} checks passed; ${errors.length} runtime errors.`);
process.exit(failed.length || errors.length ? 1 : 0);

const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Starting Playwright test for ngsentra.com...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to https://ngsentra.com...');
    await page.goto('https://ngsentra.com', { waitUntil: 'networkidle' });
    
    console.log('Page loaded! Taking screenshot of login page...');
    await page.screenshot({ path: 'login_page.png' });
    
    console.log('Filling login credentials...');
    // The username is 'admin' or 'local-admin' and password is 'admin' (based on default seed)
    await page.fill('input[type="text"], input[name="username"]', 'local-admin');
    await page.fill('input[type="password"], input[name="password"]', 'admin');
    
    console.log('Clicking login...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for dashboard to load...');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    console.log('Taking screenshot of the dashboard...');
    await page.screenshot({ path: 'dashboard_page.png' });
    
    // Extract dashboard text
    const textContent = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('dashboard_text.txt', textContent);
    
    console.log('Test completed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
    await page.screenshot({ path: 'error_page.png' });
  } finally {
    await browser.close();
  }
})();

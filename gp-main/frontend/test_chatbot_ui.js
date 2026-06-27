const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright test...');
  const browser = await chromium.launch({ headless: true });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to http://testpharm.localhost:3000...');
  // .localhost domains automatically resolve to loopback in modern browsers
  await page.goto('http://testpharm.localhost:3000', { waitUntil: 'networkidle' });
  console.log('Page loaded.');
  
  try {
    console.log('Looking for chat widget button...');
    const chatButton = await page.waitForSelector('button.fixed.bottom-6.right-6', { timeout: 10000 });
    
    if (chatButton) {
      console.log('Found chat button! Clicking it...');
      await chatButton.click();
    } else {
      console.error('Could not find chat button.');
      process.exit(1);
    }
    
    console.log('Waiting for chat window to open...');
    const input = await page.waitForSelector('textarea[placeholder*="Type your message"]', { timeout: 10000 });
    
    console.log('Typing message...');
    await input.fill('What are the side effects of Betadine?');
    
    console.log('Sending message...');
    const sendButton = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    await sendButton.click();
    
    console.log('Waiting for response...');
    // The response should contain the word "Betadine"
    await page.waitForSelector('text=Betadine', { timeout: 15000 });
    
    console.log('SUCCESS! Chatbot responded correctly on the frontend.');
    
    const messages = await page.$$eval('div', divs => {
      return divs.map(d => d.textContent).filter(t => t && t.includes('Betadine'));
    });
    console.log('Extracted message content:', messages[0]);
    
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
})();

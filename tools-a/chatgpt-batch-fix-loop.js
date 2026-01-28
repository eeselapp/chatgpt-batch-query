const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// LIST OF QUESTIONS
const questions = [
  "zendesk ai review",
  "what are the best gorgias ai chatbot",
  "helpcrunch ai integration",
  "AI chat for e-commerce",
  "AI agents for customer support",
  "how much does forethought cost",
  "what are the best intercom ai chatbot",
  "what are the best ai customer support for shopify",
  "decagon review",
  "what are the best aisera alternatives"
];

const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const slugify = (text) => text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-').substring(0, 50);

(async () => {
  console.log("🕵️  Batch Scraping: EXTREME ISOLATION MODE (Restart Browser Every Query)...");

  // LOOPING OUTSIDE OF THE BROWSER
  for (let i = 0; i < questions.length; i++) {
    const currentQ = questions[i];
    console.log(`\n==================================================`);
    console.log(`[${i + 1}/${questions.length}] 🚀 Opening New Browser for: "${currentQ}"`);
    
    let browser = null;
    try {
      // 1. LAUNCH A NEW BROWSER FOR EVERY QUESTION
      // This ensures a 100 percent clean session, no memory leak or stuck tracking ID
      browser = await puppeteer.launch({
        headless: "new",
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 
        args: ['--start-maximized', '--no-sandbox', '--disable-gpu']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 }); 
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      console.log("   🔄 Accessing ChatGPT...");
      await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });

      // Handle Initial Input
      const inputSelector = '#prompt-textarea';
      try {
        await page.waitForSelector(inputSelector, { timeout: 15000 });
      } catch (e) {
        console.log("   ⚠️ Input did not appear (Maybe Cloudflare). Attempting reload...");
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForSelector(inputSelector, { timeout: 20000 });
      }

      // 2. TYPE & SEND
      await page.type(inputSelector, currentQ);
      await page.keyboard.press('Enter');

      // 3. WAIT FOR RESPONSE
      console.log("   ⏳ Waiting for response...");
      
      const stopButtonSelector = '[data-testid="stop-button"]';
      try {
        // Wait until stop button appears (means generating started)
        await page.waitForSelector(stopButtonSelector, { timeout: 10000 }); 
        // Wait until stop button disappears (means response finished)
        await page.waitForSelector(stopButtonSelector, { hidden: true, timeout: 120000 }); 
      } catch (e) {
        // Continue anyway, maybe already finished
      }

      // Required Pause (DOM Stabilization)
      await new Promise(r => setTimeout(r, 4000));

      console.log("   🔍 Hybrid Scraping (Inject & Footer)...");

      // 4. SCRAPING
      const resultData = await page.evaluate(async () => {
        // Take the newest article (Guaranteed correct since it's a new browser)
        const articles = document.querySelectorAll('article');
        // Filter bot answers
        const botArticles = Array.from(articles).filter(a => a.querySelector('.markdown') || a.querySelector('.prose'));
        const lastArticle = botArticles[botArticles.length - 1];

        if (!lastArticle) return null;

        // --- OPEN SOURCES PANEL ---
        const candidates = Array.from(lastArticle.querySelectorAll('button, div[role="button"], span[role="button"]'));
        const toggles = candidates.filter(el => {
            const txt = el.innerText.toLowerCase();
            return (txt.includes('searched') || txt.includes('telusuri') || txt.includes('sources') || txt.includes('sumber'));
        });
        toggles.forEach(t => { try { t.click() } catch(e){} });
        lastArticle.querySelectorAll('button[data-testid="source-citation-button"]').forEach(b => b.click());

        await new Promise(r => setTimeout(r, 2500));

        // --- CLONE & INJECT ---
        const markdownDiv = lastArticle.querySelector('.markdown') || lastArticle.querySelector('.prose');
        if (!markdownDiv) return "Markdown content not found.";
        
        const clone = markdownDiv.cloneNode(true);
        const links = clone.querySelectorAll('a');
        const uniqueMap = new Map();

        links.forEach(link => {
            const href = link.href;
            const text = link.innerText.trim();

            if (href && !href.includes('chatgpt.com/backend') && !href.includes('openai.com')) {
                if (!uniqueMap.has(href)) uniqueMap.set(href, text);

                if (text !== href) {
                    const listText = `\n- ${href}\n`; 
                    const listNode = document.createTextNode(listText);
                    if (link.nextSibling) {
                        link.parentNode.insertBefore(listNode, link.nextSibling);
                    } else {
                        link.parentNode.appendChild(listNode);
                    }
                }
            }
        });

        let mainContent = clone.innerText;
        mainContent = mainContent.replace(/\n\s*\n\s*\n/g, '\n\n');

        // --- FOOTER ---
        let footerOutput = "";
        if (uniqueMap.size > 0) {
            footerOutput = "\n\n--- 🔗 FULL SOURCE REFERENCES ---\n";
            let idx = 1;
            uniqueMap.forEach((title, url) => {
                let cleanTitle = title.replace(/Sources/gi, '').replace(/\+\d+/g, '').trim();
                if (!cleanTitle || cleanTitle.length < 2) {
                     try { cleanTitle = new URL(url).hostname; } catch(e){ cleanTitle = "Source Link"; }
                }
                footerOutput += `${idx}. [${cleanTitle}](${url})\n`;
                idx++;
            });
        } else {
            footerOutput = "";
        }

        return mainContent + footerOutput;
      });

      // Save file
      if (resultData) {
        const filename = `hasil-${i + 1}-${slugify(currentQ)}.md`;
        fs.writeFileSync(filename, `# QUERY: ${currentQ}\n\n${resultData}`);
        console.log(`   ✅ Saved: ${filename}`);
      } else {
        console.log("   ❌ Failed to scrape.");
        // Take screenshot if failed (Important for debugging)
        await page.screenshot({ path: `ERROR-SCREENSHOT-${i+1}.png` });
        console.log(`   📸 Error screenshot saved: ERROR-SCREENSHOT-${i+1}.png`);
      }

    } catch (err) {
      console.log(`   ❌ System Error: ${err.message}`);
    } finally {
      // 5. ALWAYS CLOSE THE BROWSER (SUCCESS OR FAIL)
      if (browser) {
        console.log("   🛑 Closing Browser...");
        await browser.close();
      }
    }

    // Pause between refreshes (To avoid being detected as DDOS)
    if (i < questions.length - 1) {
      const delay = randomDelay(5000, 10000); // 5 to 10 seconds
      console.log(`   💤 Resting ${delay/1000} seconds before next session...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  console.log("\n🎉 ALL DONE!");
})();

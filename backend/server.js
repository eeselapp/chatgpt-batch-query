import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

dotenv.config();
puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Global browser instance for persistent scraping (reuse same browser for all questions)
let persistentBrowser = null;
let persistentPage = null;
let browserInUse = false;

// Progress tracking for SSE
const progressStore = new Map(); // Map<sessionId, {current, total, startTime, results}>

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to extract URLs from text
const extractUrls = (text) => {
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  const urls = text.match(urlRegex) || [];
  // Filter out ChatGPT/OpenAI internal URLs
  const filteredUrls = urls.filter(url => 
    !url.includes('chatgpt.com/backend') && 
    !url.includes('openai.com') &&
    !url.includes('chatgpt.com/auth')
  );
  // Remove duplicates
  return [...new Set(filteredUrls)];
};

// Helper function to get or create persistent browser
const getPersistentBrowser = async () => {
  // Check if browser exists and is still connected
  if (persistentBrowser) {
    try {
      if (persistentBrowser.isConnected()) {
        // Verify page is still valid
        if (persistentPage && !persistentPage.isClosed()) {
          console.log('♻️ Reusing existing browser instance');
          return { browser: persistentBrowser, page: persistentPage, isNew: false };
        } else {
          // Page is closed, create new page
          console.log('⚠️ Page was closed, creating new page...');
          persistentPage = await persistentBrowser.newPage();
          persistentPage.setDefaultTimeout(180000);
          persistentPage.setDefaultNavigationTimeout(60000);
          await persistentPage.setViewport({ width: 1920, height: 1080 });
          await persistentPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          return { browser: persistentBrowser, page: persistentPage, isNew: false };
        }
      } else {
        // Browser disconnected, reset
        console.log('⚠️ Browser disconnected, resetting...');
        persistentBrowser = null;
        persistentPage = null;
      }
    } catch (e) {
      // Browser error, reset
      console.log('⚠️ Browser error, resetting:', e.message);
      persistentBrowser = null;
      persistentPage = null;
    }
  }
  
  // Find Chrome executable path
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  
  let executablePath = null;
  for (const path of chromePaths) {
    try {
      if (fs.existsSync(path)) {
        executablePath = path;
        console.log(`✅ Found Chrome at: ${path}`);
        break;
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  const defaultUserDataDir = path.join(__dirname, 'chrome-user-data');
  
  const launchOptions = {
    headless: process.env.HEADLESS !== 'false' ? "new" : false,
    ...(executablePath && { executablePath }),
    args: ['--start-maximized', '--no-sandbox', '--disable-gpu'],
    userDataDir: defaultUserDataDir
  };
  
  console.log('🆕 Creating new persistent browser instance...');
  const browser = await launchBrowserWithRetry(launchOptions, 3);
  const page = await browser.newPage();
  
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(60000);
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  persistentBrowser = browser;
  persistentPage = page;
  
  return { browser, page, isNew: true };
};

// Helper function to launch browser with retry
const launchBrowserWithRetry = async (launchOptions, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let browser = null;
    try {
      console.log(`🔄 Attempting to launch browser (attempt ${attempt}/${maxRetries})...`);
      
      // Add timeout to launch (increased to 60 seconds)
      const launchPromise = puppeteer.launch(launchOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Browser launch timeout after 60 seconds')), 60000)
      );
      
      browser = await Promise.race([launchPromise, timeoutPromise]);
      
      // Small delay to ensure browser is fully initialized
      await new Promise(r => setTimeout(r, 1000));
      
      // Verify browser is actually connected by trying to get pages
      try {
        const pages = await browser.pages();
        console.log(`✅ Browser launched successfully (${pages.length} pages)`);
        
        // Additional verification: try to get browser version
        try {
          const version = await browser.version();
          console.log(`✅ Browser version: ${version}`);
        } catch (versionError) {
          console.log(`⚠️ Could not get browser version:`, versionError.message);
        }
        
        return browser;
      } catch (verifyError) {
        // Browser launched but not connected properly
        console.log(`⚠️ Browser launched but connection failed:`, verifyError.message);
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
        throw new Error(`Browser connection failed: ${verifyError.message}`);
      }
    } catch (error) {
      lastError = error;
      const errorMsg = error.message || error.toString();
      console.log(`⚠️ Browser launch attempt ${attempt} failed:`, errorMsg);
      
      // Clean up any partial browser instance
      if (browser) {
        try {
          await browser.close();
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
      
      // If it's a socket hang up error, wait longer before retry
      const isSocketError = errorMsg.includes('socket hang up') || 
                           errorMsg.includes('ECONNRESET') ||
                           errorMsg.includes('WebSocket');
      
      if (attempt < maxRetries) {
        // Wait before retry (longer wait for socket errors)
        const baseWaitTime = isSocketError ? 3000 : 1000;
        const waitTime = Math.min(baseWaitTime * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(r => setTimeout(r, waitTime));
        
        // For socket errors, also try to kill any hanging Chrome processes
        if (isSocketError && attempt === 2) {
          console.log(`🧹 Attempting to clean up any hanging Chrome processes...`);
          try {
            const { exec } = await import('child_process');
            exec('pkill -f "Google Chrome.*--remote-debugging" || true', (err) => {
              if (!err) console.log('✅ Cleaned up hanging Chrome processes');
            });
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }
      }
    }
  }
  
  const finalError = lastError?.message || lastError?.toString() || 'Unknown error';
  throw new Error(`Failed to launch browser after ${maxRetries} attempts. Last error: ${finalError}`);
};

// Scraping function using persistent browser (reuses same browser instance)
const scrapeChatGPT = async (question, userDataDir = null) => {
  let browser = null;
  let page = null;
  let isNewBrowser = false;
  
  try {
    // Wait if browser is in use
    while (browserInUse) {
      console.log('⏳ Browser is in use, waiting...');
            await new Promise(r => setTimeout(r, 1000));
    }
    
    browserInUse = true;
    
    // Get or create persistent browser
    const browserInfo = await getPersistentBrowser();
    browser = browserInfo.browser;
    page = browserInfo.page;
    isNewBrowser = browserInfo.isNew;
    
    if (isNewBrowser) {
    // Wait a bit for browser to fully initialize and load session
    console.log('⏳ Waiting for browser to load session...');
    await new Promise(r => setTimeout(r, 3000));
    } else {
      // Just wait a bit for page to be ready
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`🔄 Accessing ChatGPT for: "${question}"`);
    
    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });

    // Wait for page to load
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if login is required - try multiple times as page might be loading
    let isLoginPage = false;
    let canUseChatGPT = false;
    
    for (let checkAttempt = 0; checkAttempt < 5; checkAttempt++) {
      const pageStatus = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        const hasLoginButton = bodyText.includes('log in') || 
                              bodyText.includes('sign up') || 
                              bodyText.includes('continue with google') ||
                              bodyText.includes('continue with apple') ||
                              bodyText.includes('continue with microsoft');
        const hasEmailInput = document.querySelector('input[type="email"]') !== null;
        const hasPromptTextarea = document.querySelector('#prompt-textarea') !== null;
        const hasModal = document.querySelector('[role="dialog"]') !== null || 
                        document.querySelector('.modal') !== null ||
                        bodyText.includes('thanks for trying');
        
        return {
          hasLoginButton,
          hasEmailInput,
          hasPromptTextarea,
          hasModal,
          url: window.location.href
        };
      });
      
      isLoginPage = (pageStatus.hasLoginButton || pageStatus.hasEmailInput) && !pageStatus.hasPromptTextarea;
      canUseChatGPT = pageStatus.hasPromptTextarea;
      
      if (canUseChatGPT) {
        console.log(`✅ Can use ChatGPT (detected on attempt ${checkAttempt + 1})`);
        console.log(`   - Prompt textarea: ${pageStatus.hasPromptTextarea}`);
        console.log(`   - URL: ${pageStatus.url}`);
        break;
      }
      
      // If modal still exists, try clicking "Stay logged out" again
      if (pageStatus.hasModal && checkAttempt < 2) {
        console.log('🔍 Modal still present, trying to click "Stay logged out" again...');
        try {
          const clicked = await page.evaluate(() => {
            // Try all strategies again
            const allElements = document.querySelectorAll('a, button, span, div, p');
            for (const el of allElements) {
              const text = (el.innerText || el.textContent || '').toLowerCase().trim();
              if (text === 'stay logged out' || text.includes('stay logged out')) {
                try {
                  if (el.click) {
                    el.click();
                    return true;
                  }
                  if (el.parentElement && el.parentElement.click) {
                    el.parentElement.click();
                    return true;
                  }
                  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                  el.dispatchEvent(event);
                  return true;
                } catch (e) {
                  // Continue
                }
              }
            }
            return false;
          });
          
          if (clicked) {
            console.log('✅ Clicked "Stay logged out" on retry');
          }
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          // Ignore
        }
      }
      
      if (checkAttempt < 4) {
        console.log(`⏳ Checking if ChatGPT is ready (attempt ${checkAttempt + 1}/5)...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (isLoginPage && !canUseChatGPT) {
      console.log('❌ Login page detected! Browser needs authentication.');
      throw new Error('LOGIN_REQUIRED: Please use the "Login to ChatGPT" button first. The "Stay logged out" option should be clicked automatically, but if login is still required, please login manually.');
    }

    // Handle Initial Input - if we got here and isLoginPage is false, we should be logged in
    const inputSelector = '#prompt-textarea';
    try {
      await page.waitForSelector(inputSelector, { timeout: 20000, visible: true });
      
      // Verify input is actually usable (not blocked by modal)
      const isInputUsable = await page.evaluate(() => {
        const textarea = document.querySelector('#prompt-textarea');
        if (!textarea) return false;
        
        const style = window.getComputedStyle(textarea);
        const rect = textarea.getBoundingClientRect();
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         style.opacity !== '0' &&
                         rect.width > 0 && 
                         rect.height > 0;
        
        // Check for login modal
        const bodyText = document.body.innerText.toLowerCase();
        const hasLoginModal = bodyText.includes('log in or sign up') ||
                             bodyText.includes('continue with google') ||
                             bodyText.includes('continue with apple') ||
                             bodyText.includes('continue with microsoft') ||
                             document.querySelector('input[type="email"]') !== null;
        
        return isVisible && !hasLoginModal;
      });
      
      if (!isInputUsable) {
        throw new Error('Input found but not usable - login modal may be present');
      }
      
      console.log('✅ Input field found and usable - logged in!');
    } catch (e) {
      console.log("⚠️ Input did not appear or not usable. Checking if login is required...");
      
      // Double check if it's a login page
      await new Promise(r => setTimeout(r, 3000));
      const isLoginPageAfterWait = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        const hasLoginButton = bodyText.includes('log in') || 
                              bodyText.includes('log in or sign up') ||
                              bodyText.includes('sign up') || 
                              bodyText.includes('continue with google') ||
                              bodyText.includes('continue with apple') ||
                              bodyText.includes('continue with microsoft');
        const hasEmailInput = document.querySelector('input[type="email"]') !== null;
        const hasPromptTextarea = document.querySelector('#prompt-textarea') !== null;
        const hasModal = document.querySelector('[role="dialog"]') !== null ||
                        document.querySelector('.modal') !== null;
        
        // If we have prompt textarea and no modal, we're logged in
        if (hasPromptTextarea && !hasModal && !hasLoginButton && !hasEmailInput) return false;
        
        return hasLoginButton || hasEmailInput || hasModal;
      });

      if (isLoginPageAfterWait) {
        console.log('❌ Login page/modal detected! Session may not have been loaded properly.');
        throw new Error('LOGIN_REQUIRED: Please login to ChatGPT first using the "Login to ChatGPT" button. The session may not have been saved properly. Make sure to wait a few seconds after login before scraping.');
      }

      // Try reloading as last resort
      console.log("⚠️ Attempting reload...");
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000));
      
      // Final check
      const finalCheck = await page.evaluate(() => {
        const textarea = document.querySelector('#prompt-textarea');
        if (!textarea) return false;
        
        const bodyText = document.body.innerText.toLowerCase();
        const hasLoginModal = bodyText.includes('log in or sign up') ||
                             bodyText.includes('continue with google') ||
                             bodyText.includes('continue with apple') ||
                             document.querySelector('input[type="email"]') !== null ||
                             document.querySelector('[role="dialog"]') !== null;
        
        return !hasLoginModal;
      });

      if (!finalCheck) {
        throw new Error('LOGIN_REQUIRED: Please login to ChatGPT first using the "Login to ChatGPT" button.');
      }

      console.log('✅ Input field found after reload');
    }

    // Double-check login status before submitting (check if input is actually usable)
    const isActuallyLoggedIn = await page.evaluate(() => {
      const textarea = document.querySelector('#prompt-textarea');
      if (!textarea) return false;
      
      // Check if textarea is visible and not blocked by modal
      const style = window.getComputedStyle(textarea);
      const rect = textarea.getBoundingClientRect();
      const isVisible = style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0' &&
                       rect.width > 0 && 
                       rect.height > 0;
      
      // Check if there's a login modal blocking the page
      const bodyText = document.body.innerText.toLowerCase();
      const hasLoginModal = bodyText.includes('log in or sign up') ||
                           bodyText.includes('continue with google') ||
                           bodyText.includes('continue with apple') ||
                           bodyText.includes('continue with microsoft') ||
                           document.querySelector('input[type="email"]') !== null;
      
      // Check for modal overlay
      const hasModalOverlay = document.querySelector('[role="dialog"]') !== null ||
                              document.querySelector('.modal') !== null ||
                              document.querySelector('[class*="modal"]') !== null;
      
      return isVisible && !hasLoginModal && !hasModalOverlay;
    });
    
    if (!isActuallyLoggedIn) {
      console.log('❌ Login check failed - login modal detected or input not usable');
      throw new Error('LOGIN_REQUIRED: Please login to ChatGPT first. A login modal was detected before submitting the question.');
    }

    // Type and send question
    await page.type(inputSelector, question);
    await page.keyboard.press('Enter');

    // Wait a bit and check if login modal appeared after submit
    await new Promise(r => setTimeout(r, 2000));
    const loginModalAfterSubmit = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return bodyText.includes('log in or sign up') ||
             bodyText.includes('continue with google') ||
             bodyText.includes('continue with apple') ||
             bodyText.includes('continue with microsoft') ||
             document.querySelector('input[type="email"]') !== null ||
             document.querySelector('[role="dialog"]') !== null;
    });
    
    if (loginModalAfterSubmit) {
      console.log('❌ Login modal appeared after submitting question');
      throw new Error('LOGIN_REQUIRED: ChatGPT requires login. Please login first using the "Login to ChatGPT" button.');
    }

    // Wait for response
    console.log('⏳ Waiting for response...');
    const stopButtonSelector = '[data-testid="stop-button"]';
    
    try {
      // Wait until stop button appears (generation started)
      await page.waitForSelector(stopButtonSelector, { timeout: 10000 });
      // Wait until stop button disappears (generation finished)
      await page.waitForSelector(stopButtonSelector, { hidden: true, timeout: 120000 });
    } catch (e) {
      // Continue anyway, maybe already finished
      console.log('⚠️ Stop button detection timeout, continuing anyway...');
    }

    // Required pause for DOM stabilization (increased)
    await new Promise(r => setTimeout(r, 6000));
    
    // Check again for login modal before extraction
    const loginModalBeforeExtraction = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return bodyText.includes('log in or sign up') ||
             bodyText.includes('continue with google') ||
             bodyText.includes('continue with apple') ||
             bodyText.includes('continue with microsoft') ||
             document.querySelector('input[type="email"]') !== null ||
             document.querySelector('[role="dialog"]') !== null;
    });
    
    if (loginModalBeforeExtraction) {
      console.log('❌ Login modal detected before extraction');
      throw new Error('LOGIN_REQUIRED: ChatGPT requires login. Please login first using the "Login to ChatGPT" button.');
    }

    // Scroll to ensure content is loaded
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight - 500);
      });
      await new Promise(r => setTimeout(r, 1000));
    } catch (scrollError) {
      console.log('⚠️ Error scrolling:', scrollError.message);
    }

    // Wait for article to appear
    try {
      await page.waitForSelector('article', { timeout: 15000 });
      console.log('✅ Article element found');
    } catch (waitError) {
      console.log('⚠️ Article not found immediately, will try extraction anyway...');
    }

    console.log('🔍 Extracting answer and sources...');

    // Scrape answer and sources with retry (following chatgpt-batch-fix-loop.js logic)
    let resultData = null;
    const maxRetries = 3;
    
    for (let retryAttempt = 1; retryAttempt <= maxRetries; retryAttempt++) {
      try {
        console.log(`🔄 Extraction attempt ${retryAttempt}/${maxRetries}...`);
        
        // Check for login modal before each extraction attempt
        const hasLoginModal = await page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          return bodyText.includes('log in or sign up') ||
                 bodyText.includes('continue with google') ||
                 bodyText.includes('continue with apple') ||
                 bodyText.includes('continue with microsoft') ||
                 document.querySelector('input[type="email"]') !== null ||
                 document.querySelector('[role="dialog"]') !== null;
        });
        
        if (hasLoginModal) {
          console.log('❌ Login modal detected during extraction attempt');
          throw new Error('LOGIN_REQUIRED: ChatGPT requires login. Please login first using the "Login to ChatGPT" button.');
        }
        
        resultData = await page.evaluate(async () => {
          // Check for login modal inside evaluation too
          const bodyText = document.body.innerText.toLowerCase();
          const hasLoginModal = bodyText.includes('log in or sign up') ||
                               bodyText.includes('continue with google') ||
                               bodyText.includes('continue with apple') ||
                               bodyText.includes('continue with microsoft') ||
                               document.querySelector('input[type="email"]') !== null ||
                               document.querySelector('[role="dialog"]') !== null;
          
          if (hasLoginModal) {
            return { error: 'LOGIN_REQUIRED', answer: null, sources: [] };
          }
          
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
        if (!markdownDiv) return { answer: "Markdown content not found.", sources: [] };
        
        const clone = markdownDiv.cloneNode(true);
        const links = clone.querySelectorAll('a');
        const uniqueUrls = new Set();

        links.forEach(link => {
            const href = link.href;
            if (href && !href.includes('chatgpt.com/backend') && !href.includes('openai.com')) {
                uniqueUrls.add(href);
            }
        });

        // Get clean answer text
        let answerText = clone.innerText;
        answerText = answerText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

          return {
            answer: answerText,
            sources: Array.from(uniqueUrls)
          };
        });

        // Check if resultData indicates login required
        if (resultData && resultData.error === 'LOGIN_REQUIRED') {
          console.log('❌ Login required detected in extraction result');
          throw new Error('LOGIN_REQUIRED: ChatGPT requires login. Please login first using the "Login to ChatGPT" button.');
        }
        
        if (resultData && resultData.answer) {
          console.log(`✅ Extraction successful on attempt ${retryAttempt}`);
          break;
        } else {
          console.log(`⚠️ Extraction returned null on attempt ${retryAttempt}`);
          if (retryAttempt < maxRetries) {
            console.log(`⏳ Waiting before retry...`);
            await new Promise(r => setTimeout(r, 3000));
            // Scroll again
            try {
              await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
              });
              await new Promise(r => setTimeout(r, 2000));
            } catch (scrollError) {
              // Ignore
            }
          }
        }
      } catch (evalError) {
        console.error(`❌ Error during page evaluation (attempt ${retryAttempt}):`, evalError.message);
        if (retryAttempt < maxRetries) {
          console.log(`⏳ Waiting before retry...`);
          await new Promise(r => setTimeout(r, 3000));
        } else {
          // Take screenshot for debugging on final failure
          try {
            const screenshotPath = path.join(__dirname, 'debug-screenshot.png');
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Debug screenshot saved to: ${screenshotPath}`);
          } catch (screenshotError) {
            console.log('⚠️ Could not take screenshot:', screenshotError.message);
          }
          throw new Error(`Failed to extract data from page after ${maxRetries} attempts: ${evalError.message}`);
        }
      }
    }

    if (!resultData) {
      console.log('⚠️ resultData is null after all retry attempts, taking screenshot for debugging...');
      // Take screenshot for debugging
      try {
        const screenshotPath = path.join(__dirname, 'debug-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Debug screenshot saved to: ${screenshotPath}`);
      } catch (screenshotError) {
        console.log('⚠️ Could not take screenshot:', screenshotError.message);
      }
      throw new Error(`Failed to extract answer from ChatGPT response after ${maxRetries} attempts. The response may not have loaded completely or the page structure may have changed.`);
    }

    console.log(`✅ Extraction successful! Answer length: ${resultData.answer?.length || 0}, Sources: ${resultData.sources?.length || 0}`);

    if (!resultData.answer || resultData.answer.length < 10) {
      console.log('⚠️ Answer is too short or empty, taking screenshot for debugging...');
      console.log(`⚠️ Answer preview: "${resultData.answer?.substring(0, 100)}"`);
      // Take screenshot for debugging
      try {
        const screenshotPath = path.join(__dirname, 'debug-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Debug screenshot saved to: ${screenshotPath}`);
      } catch (screenshotError) {
        console.log('⚠️ Could not take screenshot:', screenshotError.message);
      }
      throw new Error(`Failed to extract valid answer. Got: "${resultData.answer?.substring(0, 100)}"`);
    }

    // Extract additional URLs from answer text
    const additionalUrls = extractUrls(resultData.answer);
    const allSources = [...new Set([...resultData.sources, ...additionalUrls])];

    console.log(`✅ Final result: Answer (${resultData.answer.length} chars), Sources (${allSources.length} URLs)`);

    return {
      question,
      answer: resultData.answer,
      sources: allSources.join(', ')
    };

  } catch (error) {
    console.error(`❌ Error scraping "${question}":`, error.message);
    console.error('Error details:', error);
    // Re-throw with more context
    const errorMessage = error.message || 'Unknown error occurred during scraping';
    throw new Error(errorMessage);
  } finally {
    // Don't close browser - keep it persistent for next questions
    browserInUse = false;
    console.log('✅ Question processed, browser kept open for next question');
  }
};

// Helper function to check if user is logged in
const checkLoginStatus = async () => {
  const defaultUserDataDir = path.join(__dirname, 'chrome-user-data');
  
  // Check if userDataDir exists
  if (!fs.existsSync(defaultUserDataDir)) {
    return { isLoggedIn: false, reason: 'No session directory found' };
  }
  
  // Check for lock file - if exists, browser might be in use
  const lockFile = path.join(defaultUserDataDir, 'SingletonLock');
  if (fs.existsSync(lockFile)) {
    // Wait a bit and check again (browser might be closing)
    await new Promise(r => setTimeout(r, 3000));
    if (fs.existsSync(lockFile)) {
      // Lock still exists, might be in use - skip verification to avoid conflict
      console.log('⚠️ Browser lock file detected, skipping verification (assuming logged in)');
      return { isLoggedIn: true, reason: 'Browser in use (lock file detected)' };
    } else {
      // Lock was removed, wait a bit more for session to be saved
      console.log('ℹ️ Browser lock file removed, waiting for session to be saved...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  // Check if cookies file exists and has reasonable size (not empty)
  const cookiesPath = path.join(defaultUserDataDir, 'Default', 'Cookies');
  if (!fs.existsSync(cookiesPath)) {
    return { isLoggedIn: false, reason: 'No cookies file found' };
  }
  
  const stats = fs.statSync(cookiesPath);
  // If cookies file is too small, probably not logged in
  if (stats.size < 1000) {
    return { isLoggedIn: false, reason: 'Cookies file too small (likely not logged in)' };
  }
  
  // Try to verify by launching browser briefly (headless)
  let browser = null;
  try {
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    
    let executablePath = null;
    for (const path of chromePaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
        break;
      }
    }
    
    const launchOptions = {
      headless: true,
      ...(executablePath && { executablePath }),
      args: ['--no-sandbox', '--disable-gpu'],
      userDataDir: defaultUserDataDir
    };
    
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const loginStatus = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const hasLoginModal = bodyText.includes('log in or sign up') ||
                           bodyText.includes('continue with google') ||
                           bodyText.includes('continue with apple') ||
                           bodyText.includes('continue with microsoft') ||
                           document.querySelector('input[type="email"]') !== null;
      const hasPromptTextarea = document.querySelector('#prompt-textarea') !== null;
      
      return !hasLoginModal && hasPromptTextarea;
    });
    
    await browser.close();
    await new Promise(r => setTimeout(r, 2000)); // Wait for browser to release lock
    
    return { 
      isLoggedIn: loginStatus, 
      reason: loginStatus ? 'Session verified' : 'Login modal detected' 
    };
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        // Ignore
      }
    }
    // If verification fails, assume not logged in to be safe
    return { isLoggedIn: false, reason: `Verification failed: ${error.message}` };
  }
};

// Parse CSV file
const parseCSV = async (filePath, hasHeader = null) => {
  return new Promise((resolve, reject) => {
    const questions = [];
    let isFirstRow = true;
    let detectedHasHeader = null;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Get first column value
        const firstKey = Object.keys(row)[0];
        const firstValue = row[firstKey]?.trim();
        
        // Auto-detect header on first row if hasHeader is null
        if (isFirstRow) {
          if (hasHeader === null) {
            // Auto-detect: if first value looks like a header (common header names)
            const headerKeywords = ['question', 'questions', 'query', 'queries', 'text', 'prompt', 'input'];
            const isLikelyHeader = headerKeywords.some(keyword => 
              firstValue.toLowerCase() === keyword || 
              firstValue.toLowerCase().includes(keyword)
            );
            detectedHasHeader = isLikelyHeader;
            console.log(`📄 Auto-detected CSV format: ${detectedHasHeader ? 'with header' : 'without header'}`);
          } else {
            detectedHasHeader = hasHeader;
          }
          
          // Skip first row if it's a header
          if (detectedHasHeader) {
            isFirstRow = false;
            return;
          }
          isFirstRow = false;
        }
        
        // Add question if not empty
        if (firstValue && firstValue.length > 0) {
          questions.push(firstValue);
        }
      })
      .on('end', () => {
        console.log(`✅ Parsed ${questions.length} question(s) from CSV`);
        resolve(questions);
      })
      .on('error', reject);
  });
};

// Parse Excel file
const parseExcel = async (filePath, hasHeader = null) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // First sheet
  const worksheet = workbook.Sheets[sheetName];
  
  // If hasHeader is null, auto-detect by checking first row
  let skipFirstRow = false;
  if (hasHeader === null) {
    const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })[0];
    if (firstRow && firstRow[0]) {
      const firstValue = String(firstRow[0]).trim().toLowerCase();
      const headerKeywords = ['question', 'questions', 'query', 'queries', 'text', 'prompt', 'input'];
      skipFirstRow = headerKeywords.some(keyword => 
        firstValue === keyword || firstValue.includes(keyword)
      );
      console.log(`📄 Auto-detected Excel format: ${skipFirstRow ? 'with header' : 'without header'}`);
    }
  } else {
    skipFirstRow = hasHeader;
  }
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  // Get questions from first column, skip header if needed
  const questions = data
    .slice(skipFirstRow ? 1 : 0) // Skip first row if it's a header
    .map(row => {
      const firstValue = row[0];
      return firstValue ? String(firstValue).trim() : null;
    })
    .filter(q => q && q.length > 0); // Remove empty questions

  console.log(`✅ Parsed ${questions.length} question(s) from Excel`);
  return questions;
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ChatGPT Scraper API is running' });
});

// Check login status endpoint
app.get('/api/check-login', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const loginStatus = await checkLoginStatus();
    
    if (loginStatus.isLoggedIn) {
      return res.json({
        status: 'success',
        isLoggedIn: true,
        message: 'User is logged in'
      });
    } else {
      return res.status(401).json({
        status: 'error',
        isLoggedIn: false,
        error: 'LOGIN_REQUIRED',
        message: 'User is not logged in',
        reason: loginStatus.reason
      });
    }
  } catch (error) {
    console.error('Error checking login status:', error);
    return res.status(500).json({
      status: 'error',
      isLoggedIn: false,
      error: 'Failed to check login status',
      message: error.message
    });
  }
});

// Reset session endpoint - clears all cookies and cache
app.post('/api/reset-session', async (req, res) => {
  try {
    console.log('🔄 Resetting session...');
    
    // Ensure response is JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Close persistent browser if exists
    if (persistentBrowser) {
      try {
        if (persistentBrowser.isConnected()) {
          console.log('🛑 Closing persistent browser...');
          await persistentBrowser.close();
        }
      } catch (closeError) {
        console.log('⚠️ Error closing browser:', closeError.message);
      }
      persistentBrowser = null;
      persistentPage = null;
      browserInUse = false;
    }
    
    // Wait a bit to ensure browser releases locks
    await new Promise(r => setTimeout(r, 2000));
    
    // Delete chrome-user-data directory
    const defaultUserDataDir = path.join(__dirname, 'chrome-user-data');
    
    if (fs.existsSync(defaultUserDataDir)) {
      console.log('🗑️ Deleting session directory...');
      
      // Try to remove lock file first if exists
      const lockFile = path.join(defaultUserDataDir, 'SingletonLock');
      if (fs.existsSync(lockFile)) {
        try {
          fs.unlinkSync(lockFile);
          console.log('✅ Lock file removed');
          await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          console.log('⚠️ Could not remove lock file:', e.message);
        }
      }
      
      // Delete the entire directory
      try {
        fs.rmSync(defaultUserDataDir, { recursive: true, force: true });
        console.log('✅ Session directory deleted successfully');
      } catch (deleteError) {
        console.log('⚠️ Error deleting directory:', deleteError.message);
        // Try alternative method
        try {
          const { execSync } = await import('child_process');
          if (process.platform === 'win32') {
            execSync(`rmdir /s /q "${defaultUserDataDir}"`, { stdio: 'ignore' });
          } else {
            execSync(`rm -rf "${defaultUserDataDir}"`, { stdio: 'ignore' });
          }
          console.log('✅ Session directory deleted using alternative method');
        } catch (altError) {
          console.log('❌ Failed to delete directory:', altError.message);
          return res.status(500).json({
            status: 'error',
            error: 'Failed to delete session directory',
            message: 'Please manually delete the chrome-user-data folder and restart the server'
          });
        }
      }
    } else {
      console.log('ℹ️ No session directory found, nothing to delete');
    }
    
    console.log('✅ Session reset complete');
    return res.json({
      status: 'success',
      message: 'Session has been reset successfully. Please login again.'
    });
    
  } catch (error) {
    console.error('Error resetting session:', error);
    // Ensure error response is also JSON
    if (!res.headersSent) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to reset session',
        message: error.message || 'Unknown error occurred'
      });
    }
  }
});

// Login endpoint - opens browser for user to login
app.post('/api/login', async (req, res) => {
  let browser = null;
  
  try {
    // Find Chrome executable path
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    
    let executablePath = null;
    for (const path of chromePaths) {
      try {
        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }

    const defaultUserDataDir = path.join(__dirname, 'chrome-user-data');
    
    const launchOptions = {
      headless: false, // Non-headless so user can login
      ...(executablePath && { executablePath }),
      args: ['--start-maximized', '--no-sandbox', '--disable-gpu'],
      userDataDir: defaultUserDataDir
    };

    console.log('🔐 Opening browser for ChatGPT login...');
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://auth.openai.com/log-in', { waitUntil: 'networkidle2' });

    // Wait a bit for page to load
    await new Promise(r => setTimeout(r, 3000));

    // Check if already logged in (must verify thoroughly)
    const isAlreadyLoggedIn = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      
      // Check for any login-related elements (must be completely gone)
      const hasEmailInput = document.querySelector('input[type="email"]') !== null;
      const hasPasswordInput = document.querySelector('input[type="password"]') !== null;
      const hasLoginButton = bodyText.includes('log in') || 
                            bodyText.includes('sign up') ||
                            bodyText.includes('log in or sign up') ||
                            bodyText.includes('continue with google') ||
                            bodyText.includes('continue with apple') ||
                            bodyText.includes('continue with microsoft');
      
      // Check for login forms or modals
      const hasLoginForm = document.querySelector('form[action*="auth"]') !== null ||
                          document.querySelector('form[action*="login"]') !== null;
      const hasLoginModal = document.querySelector('[role="dialog"]') !== null &&
                           (bodyText.includes('log in') || bodyText.includes('sign up'));
      
      // Check for prompt textarea (must exist and be visible)
      const promptTextarea = document.querySelector('#prompt-textarea');
      let hasUsablePromptTextarea = false;
      
      if (promptTextarea) {
        const style = window.getComputedStyle(promptTextarea);
        const rect = promptTextarea.getBoundingClientRect();
        hasUsablePromptTextarea = style.display !== 'none' && 
                                 style.visibility !== 'hidden' && 
                                 style.opacity !== '0' &&
                                 rect.width > 0 && 
                                 rect.height > 0;
      }
      
      // Check if we're on a login/auth page
      const currentUrl = window.location.href.toLowerCase();
      const isOnAuthPage = currentUrl.includes('/auth') || 
                          currentUrl.includes('/login') ||
                          currentUrl.includes('/signup');
      
      // Only consider logged in if all login elements are gone and prompt is usable
      return !hasEmailInput && 
             !hasPasswordInput && 
             !hasLoginButton && 
             !hasLoginForm && 
             !hasLoginModal && 
             !isOnAuthPage &&
             hasUsablePromptTextarea;
    });

    if (isAlreadyLoggedIn) {
      console.log('✅ Already logged in!');
      res.json({ 
        status: 'success', 
        message: 'You are already logged in to ChatGPT! You can close the browser window and start scraping.',
        alreadyLoggedIn: true,
        importantNotes: [
          '✅ You are already logged in and ready to scrape',
          '💡 Please close the browser window manually when you are ready',
          '💡 If you encounter login issues during scraping, try logging in again'
        ]
      });
      // Don't auto close - let user close it themselves
      return;
    }

    // Check for "Stay logged out" modal and click it automatically
    console.log('🔍 Looking for "Stay logged out" option...');
    try {
      // Wait for modal to appear
      await new Promise(r => setTimeout(r, 2000));
      
      const stayLoggedOutClicked = await page.evaluate(() => {
        // Look for "Stay logged out" - try multiple strategies
        const strategies = [
          // Strategy 1: Look for exact text
          () => {
            const allElements = document.querySelectorAll('a, button, span, div, p');
            for (const el of allElements) {
              const text = (el.innerText || el.textContent || '').toLowerCase().trim();
              if (text === 'stay logged out' || text.includes('stay logged out')) {
                // Try to click
                try {
                  if (el.click) {
                    el.click();
                    return true;
                  }
                  // Try parent
                  if (el.parentElement && el.parentElement.click) {
                    el.parentElement.click();
                    return true;
                  }
                  // Try dispatch event
                  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                  el.dispatchEvent(event);
                  return true;
                } catch (e) {
                  // Continue
                }
              }
            }
            return false;
          },
          // Strategy 2: Look for links in modal
          () => {
            const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]');
            for (const modal of modals) {
              const links = modal.querySelectorAll('a');
              for (const link of links) {
                const text = (link.innerText || link.textContent || '').toLowerCase().trim();
                if (text.includes('stay logged')) {
                  try {
                    link.click();
                    return true;
                  } catch (e) {
                    // Continue
                  }
                }
              }
            }
            return false;
          },
          // Strategy 3: Look for blue links (usually "Stay logged out" is a blue link)
          () => {
            const blueLinks = document.querySelectorAll('a[class*="blue"], a[style*="blue"], a[href="#"]');
            for (const link of blueLinks) {
              const text = (link.innerText || link.textContent || '').toLowerCase().trim();
              if (text.includes('stay logged')) {
                try {
                  link.click();
                  return true;
                } catch (e) {
                  // Continue
                }
              }
            }
            return false;
          }
        ];

        for (const strategy of strategies) {
          try {
            if (strategy()) {
              return true;
            }
          } catch (e) {
            // Continue to next strategy
          }
        }
        return false;
      });

      if (stayLoggedOutClicked) {
        console.log('✅ Automatically clicked "Stay logged out"');
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('⚠️ "Stay logged out" option not found, may already be dismissed or not present');
      }
    } catch (clickError) {
      console.log('⚠️ Error clicking "Stay logged out":', clickError.message);
    }

    // Check again if we're on login page or can use ChatGPT (with strict check)
    const canUseChatGPT = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      
      // Check for any login-related elements (must be completely gone)
      const hasEmailInput = document.querySelector('input[type="email"]') !== null;
      const hasPasswordInput = document.querySelector('input[type="password"]') !== null;
      const hasLoginButton = bodyText.includes('log in') || 
                            bodyText.includes('sign up') ||
                            bodyText.includes('log in or sign up') ||
                            bodyText.includes('continue with google') ||
                            bodyText.includes('continue with apple') ||
                            bodyText.includes('continue with microsoft');
      
      // Check for login forms or modals
      const hasLoginForm = document.querySelector('form[action*="auth"]') !== null ||
                          document.querySelector('form[action*="login"]') !== null;
      const hasLoginModal = document.querySelector('[role="dialog"]') !== null &&
                           (bodyText.includes('log in') || bodyText.includes('sign up'));
      
      // Check for prompt textarea (must exist and be visible)
      const promptTextarea = document.querySelector('#prompt-textarea');
      let hasUsablePromptTextarea = false;
      
      if (promptTextarea) {
        const style = window.getComputedStyle(promptTextarea);
        const rect = promptTextarea.getBoundingClientRect();
        hasUsablePromptTextarea = style.display !== 'none' && 
                                 style.visibility !== 'hidden' && 
                                 style.opacity !== '0' &&
                                 rect.width > 0 && 
                                 rect.height > 0;
      }
      
      // Check if we're on a login/auth page
      const currentUrl = window.location.href.toLowerCase();
      const isOnAuthPage = currentUrl.includes('/auth') || 
                          currentUrl.includes('/login') ||
                          currentUrl.includes('/signup');
      
      // Only consider ready if all login elements are gone and prompt is usable
      return !hasEmailInput && 
             !hasPasswordInput && 
             !hasLoginButton && 
             !hasLoginForm && 
             !hasLoginModal && 
             !isOnAuthPage &&
             hasUsablePromptTextarea;
    });

    if (canUseChatGPT) {
      console.log('✅ Can use ChatGPT without login!');
      res.json({ 
        status: 'success', 
        message: 'ChatGPT is ready to use. Please close the browser window manually when you are ready.',
        alreadyLoggedIn: true,
        importantNotes: [
          '✅ ChatGPT is ready to use without login',
          '💡 Please close the browser window manually when you are ready',
          '💡 If you encounter issues during scraping, you may need to login'
        ]
      });
      // Don't auto close - let user close it themselves
      return;
    }

    console.log('⏳ Waiting for user to login...');
    res.json({ 
      status: 'success', 
      message: 'Browser opened. Please login in the browser window. The browser will automatically close after login is detected.',
      alreadyLoggedIn: false,
      importantNotes: [
        '⚠️ IMPORTANT: Login with Google/Apple/Microsoft may not work well with automation',
        '✅ RECOMMENDED: Use email/password login instead',
        '💡 TIP: If you have never logged in before, use email/password for best results',
        '⏳ Complete the login process in the browser window',
        '✅ After login, the browser will automatically close and your session will be saved'
      ]
    });

    // IMPORTANT: Don't close browser immediately after sending response
    // Keep browser open and wait for user to complete login
    // Wait for user to login (check every 5 seconds, max 10 minutes)
    let loggedIn = false;
    let pageClosed = false;
    
    // Monitor if page is closed by user (this is expected behavior)
    page.on('close', () => {
      pageClosed = true;
      console.log('ℹ️ Browser window was closed by user (expected - user should close after login)');
    });
    
    // Track consecutive successful login checks (need at least 3 consecutive checks)
    let consecutiveLoginChecks = 0;
    const requiredConsecutiveChecks = 3; // Need 3 consecutive checks (15 seconds) to confirm login
    
    for (let i = 0; i < 120; i++) {
      // Check if page was closed (user closed browser - this is expected)
      if (pageClosed || page.isClosed()) {
        console.log('ℹ️ Browser was closed by user, stopping login check (this is expected behavior)');
        break;
      }
      
      await new Promise(r => setTimeout(r, 5000));
      
      try {
        // More strict check - must verify login is truly complete
        const loginStatus = await page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          
          // Check for any login-related elements (must be completely gone)
          const hasEmailInput = document.querySelector('input[type="email"]') !== null;
          const hasPasswordInput = document.querySelector('input[type="password"]') !== null;
          const hasLoginButton = bodyText.includes('log in') || 
                                bodyText.includes('sign up') ||
                                bodyText.includes('log in or sign up') ||
                                bodyText.includes('continue with google') ||
                                bodyText.includes('continue with apple') ||
                                bodyText.includes('continue with microsoft') ||
                                bodyText.includes('continue with phone');
          
          // Check for login forms or modals
          const hasLoginForm = document.querySelector('form[action*="auth"]') !== null ||
                              document.querySelector('form[action*="login"]') !== null;
          const hasLoginModal = document.querySelector('[role="dialog"]') !== null &&
                               (bodyText.includes('log in') || bodyText.includes('sign up'));
          
          // Check for prompt textarea (must exist and be visible)
          const promptTextarea = document.querySelector('#prompt-textarea');
          let hasUsablePromptTextarea = false;
          
          if (promptTextarea) {
            const style = window.getComputedStyle(promptTextarea);
            const rect = promptTextarea.getBoundingClientRect();
            hasUsablePromptTextarea = style.display !== 'none' && 
                                     style.visibility !== 'hidden' && 
                                     style.opacity !== '0' &&
                                     rect.width > 0 && 
                                     rect.height > 0;
          }
          
          // Check if we're on a login/auth page
          const currentUrl = window.location.href.toLowerCase();
          const isOnAuthPage = currentUrl.includes('/auth') || 
                              currentUrl.includes('/login') ||
                              currentUrl.includes('/signup');
          
          // Login is complete only if:
          // 1. No login-related inputs/buttons/forms
          // 2. Prompt textarea exists and is usable
          // 3. Not on auth/login page
          const isFullyLoggedIn = !hasEmailInput && 
                                  !hasPasswordInput && 
                                  !hasLoginButton && 
                                  !hasLoginForm && 
                                  !hasLoginModal && 
                                  !isOnAuthPage &&
                                  hasUsablePromptTextarea;
          
          return {
            isFullyLoggedIn,
            hasEmailInput,
            hasPasswordInput,
            hasLoginButton,
            hasLoginForm,
            hasLoginModal,
            isOnAuthPage,
            hasUsablePromptTextarea,
            url: currentUrl
          };
        });
        
        if (loginStatus.isFullyLoggedIn) {
          consecutiveLoginChecks++;
          console.log(`✅ Login check passed (${consecutiveLoginChecks}/${requiredConsecutiveChecks})`);
          
          if (consecutiveLoginChecks >= requiredConsecutiveChecks) {
          loggedIn = true;
            console.log('✅ Login confirmed! ChatGPT is ready to use.');
          break;
          }
        } else {
          // Reset counter if login check fails
          if (consecutiveLoginChecks > 0) {
            console.log(`⚠️ Login check failed, resetting counter. Status:`, {
              hasEmailInput: loginStatus.hasEmailInput,
              hasPasswordInput: loginStatus.hasPasswordInput,
              hasLoginButton: loginStatus.hasLoginButton,
              hasLoginForm: loginStatus.hasLoginForm,
              hasLoginModal: loginStatus.hasLoginModal,
              isOnAuthPage: loginStatus.isOnAuthPage,
              hasUsablePromptTextarea: loginStatus.hasUsablePromptTextarea
            });
          }
          consecutiveLoginChecks = 0;
        }
      } catch (e) {
        // Page might have navigated or closed (user closed browser - expected)
        if (page.isClosed()) {
          console.log('ℹ️ Browser was closed by user during check (expected - user should close after login)');
          break;
        }
        
        // Reset counter on error
        consecutiveLoginChecks = 0;
        
        try {
          const currentUrl = page.url();
          if (currentUrl.includes('chatgpt.com') && !currentUrl.includes('auth') && !currentUrl.includes('login')) {
            // Double check with stricter criteria
            const strictCheck = await page.evaluate(() => {
              const hasEmailInput = document.querySelector('input[type="email"]') !== null;
              const hasPasswordInput = document.querySelector('input[type="password"]') !== null;
              const promptTextarea = document.querySelector('#prompt-textarea');
              
              if (!promptTextarea) return false;
              
              const style = window.getComputedStyle(promptTextarea);
              const rect = promptTextarea.getBoundingClientRect();
              const isUsable = style.display !== 'none' && 
                              style.visibility !== 'hidden' && 
                              style.opacity !== '0' &&
                              rect.width > 0 && 
                              rect.height > 0;
              
              return !hasEmailInput && !hasPasswordInput && isUsable;
            });
            
            if (strictCheck) {
              consecutiveLoginChecks++;
              if (consecutiveLoginChecks >= requiredConsecutiveChecks) {
            loggedIn = true;
                console.log('✅ Login confirmed (URL changed and strict check passed)!');
            break;
              }
            } else {
              consecutiveLoginChecks = 0;
            }
          }
        } catch (urlError) {
          consecutiveLoginChecks = 0;
          // Continue checking
        }
      }
    }

    if (loggedIn) {
      console.log('✅ Login successful! Verifying session is saved...');
      
      // Verify session by checking for cookies
      try {
        const cookies = await page.cookies();
        console.log(`🍪 Found ${cookies.length} cookie(s) in browser`);
        
        // Check for ChatGPT session cookies
        const chatgptCookies = cookies.filter(c => 
          c.domain.includes('chatgpt.com') || 
          c.domain.includes('openai.com')
        );
        console.log(`🍪 Found ${chatgptCookies.length} ChatGPT/OpenAI cookie(s)`);
      } catch (cookieError) {
        console.log('⚠️ Could not read cookies:', cookieError.message);
      }
      
      // Brief wait to let Chrome start saving (usually very fast)
      console.log('⏳ Saving session...');
      await new Promise(r => setTimeout(r, 1000));
      
      console.log('✅ Login successful! Closing browser...');
    } else {
      if (pageClosed || (page && page.isClosed())) {
        console.log('ℹ️ Browser was closed by user before login completed');
        console.log('💡 If login was completed before closing, session should be saved.');
      } else {
        console.log('⏳ Login timeout - user may not have logged in yet');
        console.log('⏳ Closing browser...');
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Close browser automatically after login or timeout
    if (browser) {
      try {
        console.log('🛑 Closing browser...');
      await browser.close();
      // Wait for Chrome to fully release the userDataDir lock
      console.log('⏳ Waiting for Chrome to release session lock...');
        await new Promise(r => setTimeout(r, 3000));
      console.log('✅ Browser closed and session lock released');
      } catch (closeError) {
        console.log('⚠️ Error closing browser (may already be closed):', closeError.message);
        // Wait anyway to ensure lock is released
        await new Promise(r => setTimeout(r, 2000));
      }
    }

  } catch (error) {
    console.error('Error in /api/login:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        // Ignore
      }
    }

    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to open login browser', 
        message: error.message 
      });
    }
  }
});

// Progress endpoint for SSE
app.get('/api/scrape-progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
  
  // Check progress every second
  const interval = setInterval(() => {
    const progress = progressStore.get(sessionId);
    if (progress) {
      const { current, total, startTime, currentQuestion, status } = progress;
      const elapsed = Date.now() - startTime;
      const progressPercent = total > 0 ? (current / total) * 100 : 0;
      
      // Calculate estimated time remaining
      let estimatedTimeRemaining = null;
      if (current > 0 && current < total) {
        const avgTimePerQuestion = elapsed / current;
        const remainingQuestions = total - current;
        estimatedTimeRemaining = Math.round(avgTimePerQuestion * remainingQuestions);
      }
      
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current,
        total,
        progressPercent,
        elapsed,
        estimatedTimeRemaining,
        currentQuestion,
        status
      })}\n\n`);
    }
  }, 1000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// Scrape single or multiple questions
app.post('/api/scrape', async (req, res) => {
  // Set longer timeout for this endpoint (10 minutes)
  req.setTimeout(600000);
  res.setTimeout(600000);

  // Handle client disconnect
  let isClientConnected = true;
  req.on('close', () => {
    isClientConnected = false;
    console.log('⚠️ Client disconnected before request completed');
  });

  try {
    const { questions, userDataDir, sessionId } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        error: 'Questions array is required and must not be empty' 
      });
    }

    // Generate session ID if not provided
    const scrapeSessionId = sessionId || `scrape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize progress tracking
    progressStore.set(scrapeSessionId, {
      current: 0,
      total: questions.length,
      startTime: Date.now(),
      currentQuestion: null,
      status: 'starting',
      results: []
    });

    // Check if user is logged in before scraping
    console.log('🔍 Checking login status...');
    const loginStatus = await checkLoginStatus();
    
    if (!loginStatus.isLoggedIn) {
      progressStore.delete(scrapeSessionId);
      console.log(`❌ User not logged in: ${loginStatus.reason}`);
      return res.status(401).json({
        error: 'LOGIN_REQUIRED',
        message: 'Please login to ChatGPT first using the "Login to ChatGPT" button.',
        reason: loginStatus.reason,
        loginInstructions: {
          title: 'Login Required',
          steps: [
            '1. Click the "Login to ChatGPT" button',
            '2. Complete the login process in the browser window',
            '3. Close the browser manually after login',
            '4. Return here and the status will update automatically'
          ],
          importantNotes: [
            '⚠️ IMPORTANT: Login with Google/Apple/Microsoft may not work well with automation',
            '✅ RECOMMENDED: Use email/password login instead',
            '💡 TIP: If you have never logged in before, use email/password for best results'
          ]
        }
      });
    }
    
    console.log('✅ Login status verified, proceeding with scraping...');

    // If no questions provided, just return success (for login check)
    if (questions.length === 0) {
      progressStore.delete(scrapeSessionId);
      return res.json({ results: [], sessionId: scrapeSessionId });
    }

    const results = [];
    
    // Process questions one by one with isolation mode
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i].trim();
      
      if (!question) {
        continue;
      }

      // Update progress
      progressStore.set(scrapeSessionId, {
        current: i,
        total: questions.length,
        startTime: progressStore.get(scrapeSessionId)?.startTime || Date.now(),
        currentQuestion: question,
        status: 'processing',
        results: [...results]
      });

      console.log(`\n[${i + 1}/${questions.length}] Processing: "${question}"`);

      try {
        const result = await scrapeChatGPT(question, userDataDir);
        results.push(result);
        
        // Update progress with completed result
        progressStore.set(scrapeSessionId, {
          current: i + 1,
          total: questions.length,
          startTime: progressStore.get(scrapeSessionId)?.startTime || Date.now(),
          currentQuestion: null,
          status: 'completed',
          results: [...results]
        });
        
        console.log(`✅ Question ${i + 1}/${questions.length} completed successfully`);

        // Delay between questions (5-10 seconds)
        if (i < questions.length - 1) {
          const delay = Math.floor(Math.random() * 5000) + 5000;
          console.log(`💤 Resting ${delay/1000} seconds before next question...`);
          
          // Update status during delay
          progressStore.set(scrapeSessionId, {
            current: i + 1,
            total: questions.length,
            startTime: progressStore.get(scrapeSessionId)?.startTime || Date.now(),
            currentQuestion: null,
            status: 'waiting',
            results: [...results]
          });
          
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (error) {
        console.error(`❌ Error processing question "${question}":`, error);
        console.error(`Error stack:`, error.stack);
        
        // Continue processing other questions instead of stopping
        // Add error result to show which question failed
        results.push({
          question,
          answer: `Error: ${error.message || 'Unknown error occurred'}`,
          sources: ''
        });
        
        // Update progress with error result
        progressStore.set(scrapeSessionId, {
          current: i + 1,
          total: questions.length,
          startTime: progressStore.get(scrapeSessionId)?.startTime || Date.now(),
          currentQuestion: null,
          status: 'error',
          results: [...results]
        });
        
        console.log(`⚠️ Question ${i + 1}/${questions.length} failed, continuing with next question...`);
        
        // Continue to next question instead of stopping
        continue;
      }
    }

    // Mark as finished
    progressStore.set(scrapeSessionId, {
      current: questions.length,
      total: questions.length,
      startTime: progressStore.get(scrapeSessionId)?.startTime || Date.now(),
      currentQuestion: null,
      status: 'finished',
      results: [...results]
    });

    // Send response with all completed results
    if (!res.headersSent) {
      console.log(`✅ Sending response with ${results.length} result(s) out of ${questions.length} question(s)`);
      res.json({ results, sessionId: scrapeSessionId });
    } else {
      console.log('⚠️ Response headers already sent, cannot send results');
    }
    
    // Clean up progress after a delay (to allow final progress update)
    setTimeout(() => {
      progressStore.delete(scrapeSessionId);
    }, 5000);
    
    // Log if client was disconnected but we still sent results
    if (!isClientConnected) {
      console.log('⚠️ Note: Client was disconnected during processing, but results were sent anyway');
    }
    
    // Close persistent browser after all questions are done
    if (persistentBrowser && persistentBrowser.isConnected()) {
      try {
        console.log('🛑 Closing persistent browser after all questions completed...');
        await persistentBrowser.close();
        persistentBrowser = null;
        persistentPage = null;
        console.log('✅ Browser closed');
      } catch (closeError) {
        console.log('⚠️ Error closing browser:', closeError.message);
        persistentBrowser = null;
        persistentPage = null;
      }
    }

  } catch (error) {
    console.error('Error in /api/scrape:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up progress on error
    const sessionId = req.body?.sessionId;
    if (sessionId) {
      progressStore.delete(sessionId);
    }
    
    // Check if client is still connected
    if (!isClientConnected) {
      console.log('⚠️ Client disconnected during error handling');
      return;
    }

    // Handle specific error types
    let errorMessage = error.message || 'Internal server error';
    let statusCode = 500;

    if (error.message && (
      error.message.includes('ECONNRESET') ||
      error.message.includes('socket hang up') ||
      error.message.includes('EPIPE')
    )) {
      errorMessage = 'Connection was lost. Please try again.';
      statusCode = 503;
    }

    // Only send response if client is still connected and response hasn't been sent
    if (isClientConnected && !res.headersSent) {
      res.status(statusCode).json({ 
        error: 'Internal server error', 
        message: errorMessage 
      });
    } else if (res.headersSent) {
      console.log('⚠️ Response already sent, cannot send error response');
    }
  }
});

// Upload and parse file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    console.log(`📤 Processing file: ${req.file.originalname} (auto-detecting header)`);

    let questions = [];

    if (fileExtension === '.csv') {
      questions = await parseCSV(filePath, null); // null = auto-detect
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      questions = await parseExcel(filePath, null); // null = auto-detect
    } else {
      // Clean up file
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: 'Unsupported file format. Please upload CSV or Excel file.' 
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (questions.length === 0) {
      return res.status(400).json({ 
        error: 'No questions found in file. Please ensure the first column contains questions.' 
      });
    }

    res.json({ 
      questions,
      count: questions.length 
    });

  } catch (error) {
    console.error('Error in /api/upload:', error);
    
    // Clean up file if exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Error processing file', 
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


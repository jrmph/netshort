// NetShort Ultimate Scraper by Jhames Martin
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const AUTHOR = "Jhames Martin";
const BASE_URL = "https://netshort.com";

/**
 * Universal Scraper Helper
 * Intercepts network requests and parses DOM
 */
async function deepScrape(targetUrl, isVideoMode = false) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080"
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  let videoUrl = null;
  
  // Kapag video mode, pakinggan ang lahat ng network traffic para makuha ang m3u8 link
  if (isVideoMode) {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.m3u8') || (url.includes('.mp4') && !url.includes('google'))) {
        videoUrl = url;
      }
      request.continue();
    });
  }
  
  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    
    // Scrape static info gamit ang evaluate (Browser Context)
    const staticData = await page.evaluate(() => {
      // Kunin ang lahat ng metadata mula sa __NEXT_DATA__ kung available
      const nextDataEl = document.getElementById('__NEXT_DATA__');
      if (nextDataEl) {
        return JSON.parse(nextDataEl.innerHTML);
      }
      
      // Fallback: Manual static scrape
      return {
        title: document.querySelector('h1')?.innerText || document.title,
        desc: document.querySelector('.description, .synopsis')?.innerText || "",
        poster: document.querySelector('img.cover, .poster img')?.src || ""
      };
    });
    
    // Kung video mode, maghintay ng konti para ma-intercept ang stream link
    if (isVideoMode && !videoUrl) {
      await page.evaluate(() => window.scrollBy(0, 300));
      await new Promise(r => setTimeout(r, 6000));
    }
    
    await browser.close();
    return { staticData, videoUrl };
  } catch (e) {
    await browser.close();
    throw e;
  }
}

// [API] Trending - Get all info and URLs for home page
app.get('/api/trending', async (req, res) => {
  try {
    const { staticData } = await deepScrape(BASE_URL);
    const list = staticData?.props?.pageProps?.initialData?.list || [];
    
    const results = list.map(item => ({
      id: item.id,
      title: item.title || item.name,
      cover_url: item.cover || item.vertical_cover,
      episodes: item.episode_count,
      info_url: `https://netshort.com/detail/${item.id}`
    }));
    
    res.json({ success: true, author: AUTHOR, results });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// [API] Video Bypass - Get info + direct video manifest URL
app.get('/api/video', async (req, res) => {
  const { id, ep = 1 } = req.query;
  if (!id) return res.status(400).json({ error: "Drama ID is required" });
  
  try {
    const { staticData, videoUrl } = await deepScrape(`${BASE_URL}/play/${id}/${ep}`, true);
    
    res.json({
      success: true,
      author: AUTHOR,
      details: {
        title: staticData?.props?.pageProps?.dramaInfo?.title || "Unknown",
        episode: ep,
        description: staticData?.props?.pageProps?.dramaInfo?.intro || "",
      },
      stream_url: videoUrl,
      status: videoUrl ? "BYPASS_SUCCESS" : "LOCKED_OR_NOT_FOUND"
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Serve the UI
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`[Jhames Martin] Ultimate API running on port ${PORT}`));
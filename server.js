const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const BASE_URL = 'https://netshort.com';
const DEV_NAME = "Jhames Martin";

// Standard Response Helper
const response = (res, data, status = 200) => {
  res.status(status).json({
    success: status === 200,
    author: DEV_NAME,
    timestamp: new Date().toISOString(),
    ...data
  });
};

/**
 * Endpoint: Trending
 * Scrapes the home page for dramas
 */
app.get('/api/trending', async (req, res) => {
  try {
    const { data: html } = await axios.get(BASE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' }
    });
    const $ = cheerio.load(html);
    const list = [];
    
    $('.item-box, .drama-card, a[href*="/detail/"]').each((i, el) => {
      const $el = $(el);
      const title = $el.find('.title, .name').text().trim() || $el.attr('title');
      const link = $el.attr('href') || $el.find('a').attr('href');
      const cover = $el.find('img').attr('src') || $el.find('img').attr('data-src');
      const id = link?.split('/').filter(Boolean).pop();
      
      if (title && id) {
        list.push({ id, title, cover: cover?.startsWith('http') ? cover : `${BASE_URL}${cover}`, url: link });
      }
    });
    
    response(res, { count: list.length, items: list.slice(0, 20) });
  } catch (err) {
    response(res, { message: "Scrape failed: " + err.message }, 500);
  }
});

/**
 * Endpoint: Video Unlock (Advanced Bypass)
 * Extracts the hidden .m3u8 manifest link
 */
app.get('/api/video', async (req, res) => {
  const { id, ep = 1 } = req.query;
  if (!id) return response(res, { message: "ID is required" }, 400);
  
  try {
    const targetUrl = `${BASE_URL}/play/${id}/${ep}`;
    const { data: html } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': BASE_URL
      }
    });
    
    const $ = cheerio.load(html);
    let streamUrl = null;
    
    // ADVANCED BYPASS: Searching within script tags for obfuscated JSON state
    $('script').each((i, s) => {
      const content = $(s).html();
      if (content && (content.includes('.m3u8') || content.includes('.mp4'))) {
        const match = content.match(/https?:\/\/[^"']+\.(m3u8|mp4)[^"']*/);
        if (match) {
          streamUrl = match[0].replace(/\\/g, ''); // Clean the URL
        }
      }
    });
    
    if (!streamUrl) {
      streamUrl = $('video source').attr('src') || $('video').attr('src');
    }
    
    if (!streamUrl) return response(res, { message: "Source locked or not found" }, 404);
    
    response(res, {
      unlocked: true,
      data: { id, episode: ep, stream: streamUrl, format: streamUrl.includes('m3u8') ? "HLS" : "MP4" }
    });
  } catch (err) {
    response(res, { message: "Bypass error: " + err.message }, 500);
  }
});

// Serve Frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`[${DEV_NAME}] Server Online on Port ${PORT}`));
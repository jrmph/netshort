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
const AUTHOR = "Jhames Martin";

// High-quality Browser Headers to avoid blocks
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://netshort.com/',
  'DNT': '1'
};

/**
 * Deep Scraper Logic
 * Focuses on extracting data from hidden script tags (JSON objects)
 */
const extractHiddenData = ($) => {
  let data = null;
  $('script').each((i, s) => {
    const content = $(s).html();
    // Target common JSON state names
    if (content.includes('__NEXT_DATA__') || content.includes('__INITIAL_STATE__')) {
      try {
        // Extract only the JSON part
        const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        data = JSON.parse(jsonStr);
      } catch (e) { /* ignore parse errors */ }
    }
  });
  return data;
};

/**
 * [GET] /api/trending
 */
app.get('/api/trending', async (req, res) => {
  try {
    const { data: html } = await axios.get(BASE_URL, { headers: HEADERS });
    const $ = cheerio.load(html);
    const results = [];
    
    // Method 1: Try JSON extraction first (Most Reliable)
    const hiddenData = extractHiddenData($);
    if (hiddenData) {
      // Traverse the JSON object (structure might vary slightly)
      const list = hiddenData?.props?.pageProps?.initialData?.list || hiddenData?.initialState?.home?.list;
      if (list) {
        list.forEach(item => {
          results.push({
            id: item.id || item.dramaId,
            title: item.title || item.name,
            cover: item.cover || item.vertical_cover,
            episodes: item.episode_count || item.total,
            url: `${BASE_URL}/detail/${item.id}`
          });
        });
      }
    }
    
    // Method 2: Fallback to DOM Scraping if JSON fails
    if (results.length === 0) {
      $('.item-box, .drama-card, a[href*="/detail/"]').each((i, el) => {
        const link = $(el).attr('href') || $(el).find('a').attr('href');
        const img = $(el).find('img');
        results.push({
          id: link?.split('/').pop(),
          title: img.attr('alt') || $(el).find('.title').text().trim(),
          cover: img.attr('data-src') || img.attr('src'),
          url: `${BASE_URL}${link}`
        });
      });
    }
    
    res.json({ success: true, author: AUTHOR, count: results.length, dramas: results });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * [GET] /api/video
 * Extracts direct stream URL (m3u8)
 */
app.get('/api/video', async (req, res) => {
  const { id, ep = 1 } = req.query;
  if (!id) return res.status(400).json({ error: "Missing ID" });
  
  try {
    const playUrl = `${BASE_URL}/play/${id}/${ep}`;
    const { data: html } = await axios.get(playUrl, { headers: HEADERS });
    const $ = cheerio.load(html);
    
    let directUrl = null;
    
    // Bypassing front-end lock by finding manifest in JS state
    const scripts = $('script').map((i, s) => $(s).html()).get();
    for (const script of scripts) {
      if (script && (script.includes('.m3u8') || script.includes('.mp4'))) {
        // Precision Regex for Stream URLs
        const match = script.match(/https?:\/\/[^"']+\.(m3u8|mp4)[^"']*/);
        if (match) {
          directUrl = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
          break;
        }
      }
    }
    
    if (!directUrl) {
      // DOM Fallback
      directUrl = $('video source').attr('src') || $('video').attr('src');
    }
    
    if (!directUrl) return res.status(404).json({ success: false, message: "Video link not found" });
    
    res.json({
      success: true,
      author: AUTHOR,
      data: {
        id,
        episode: ep,
        video_url: directUrl,
        type: directUrl.includes('m3u8') ? "HLS" : "MP4"
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`[${AUTHOR}] API Active on ${PORT}`));
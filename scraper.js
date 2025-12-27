/**
 * Movie Reels Scraper Skeleton
 * Author: Jhames Martin
 * Targeted Site: netshort.com
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const TARGET_URL = 'https://netshort.com';

async function scrapeNetShort() {
  console.log(`[Jhames Martin Scraper] Initializing scrape on ${TARGET_URL}...`);
  
  try {
    // 1. Fetch the landing page
    const { data } = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(data);
    const results = [];
    
    // 2. Locate Movie Cards (Selector skeleton - adjust based on site inspection)
    $('.movie-card, .series-item, [class*="item"]').each((i, el) => {
      const title = $(el).find('h3, .title').text().trim();
      const cover = $(el).find('img').attr('src');
      const link = $(el).find('a').attr('href');
      
      if (title && cover) {
        results.push({
          id: Date.now() + i,
          title,
          cover,
          url: TARGET_URL + link,
          scrapedAt: new Date().toISOString()
        });
      }
    });
    
    // 3. Save to local JSON for the server to pick up
    fs.writeFileSync('./reels_data.json', JSON.stringify(results, null, 2));
    console.log(`✅ Scraped ${results.length} items successfully.`);
    
  } catch (error) {
    console.error('❌ Scrape Failed:', error.message);
  }
}

// Run the scraper
scrapeNetShort();
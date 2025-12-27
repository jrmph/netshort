const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DATA_PATH = path.join(__dirname, 'reels_data.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * Jhames Martin Scraper Engine
 * Targets netshort.com to extract series metadata
 */
async function runScraper() {
    console.log("[Jhames Martin] Starting data extraction from NetShort...");
    try {
        const { data } = await axios.get('https://netshort.com', {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' }
        });
        const $ = cheerio.load(data);
        const results = [];
        
        // Selecting based on common patterns found in mobile short-drama sites
        $('div[class*="item"], div[class*="card"], .movie-item').each((i, el) => {
            if (i > 15) return; // Limit to 16 items for performance
            
            const title = $(el).find('h3, .title, p').first().text().trim();
            let cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
            
            // Clean up URLs
            if (cover && !cover.startsWith('http')) {
                cover = 'https://netshort.com' + (cover.startsWith('/') ? '' : '/') + cover;
            }
            
            if (title && cover) {
                results.push({
                    id: 1000 + i,
                    title: title,
                    cover: cover,
                    // Fallback high-quality vertical videos for the demo player
                    video: [
                        "https://assets.mixkit.co/videos/preview/mixkit-girl-walking-in-the-city-at-night-1540-large.mp4",
                        "https://assets.mixkit.co/videos/preview/mixkit-stunning-woman-in-a-red-dress-walking-in-a-field-41005-large.mp4",
                        "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-posing-in-a-futuristic-urban-setting-42797-large.mp4",
                        "https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-blue-hair-dancing-in-a-neon-room-41002-large.mp4"
                    ][i % 4],
                    likes: (Math.random() * 2).toFixed(1) + "M",
                    episodes: Math.floor(Math.random() * 50) + 50,
                    rating: (Math.random() * 1 + 8.9).toFixed(1)
                });
            }
        });
        
        fs.writeFileSync(DATA_PATH, JSON.stringify(results, null, 2));
        console.log(`[Jhames Martin] Success! Scraped ${results.length} series.`);
        return results;
    } catch (error) {
        console.error("[Jhames Martin] Scrape failed:", error.message);
        return [];
    }
}

// API Endpoints
app.get('/api/reels', async (req, res) => {
    if (fs.existsSync(DATA_PATH)) {
        const data = JSON.parse(fs.readFileSync(DATA_PATH));
        // Add artificial delay to demonstrate premium skeleton rendering
        return setTimeout(() => res.json(data), 1200);
    }
    const data = await runScraper();
    res.json(data);
});

app.get('/api/scrape-now', async (req, res) => {
    const data = await runScraper();
    res.json({ status: "success", count: data.length });
});

// Serve Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
    🎥 MOVIE REELS PRO RUNNING
    ---------------------------
    URL: http://localhost:${PORT}
    Admin: Jhames Martin
    Status: Active & Ready to Stream
    `);
    
    // Initial scrape on boot
    runScraper();
});
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const BASE_URL = 'https://netshort.com';
const DEV = "Jhames Martin";

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
};

// Helper: Extract JSON from Next.js Script tag
const getNextData = ($) => {
    const script = $('#__NEXT_DATA__').html();
    if (!script) return null;
    return JSON.parse(script);
};

// [GET] /api/trending
app.get('/api/trending', async (req, res) => {
    try {
        const { data: html } = await axios.get(BASE_URL, { headers });
        const $ = cheerio.load(html);
        const nextData = getNextData($);
        
        // Extracting from Next.js internal state
        const list = nextData?.props?.pageProps?.initialData?.list || [];
        const results = list.map(item => ({
            id: item.id,
            title: item.title,
            cover: item.vertical_cover || item.cover,
            episodes: item.episode_count,
            url: `${BASE_URL}/detail/${item.id}`
        }));

        res.json({ success: true, dev: DEV, count: results.length, items: results });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// [GET] /api/video (Bypass via String Analysis)
app.get('/api/video', async (req, res) => {
    const { id, ep = 1 } = req.query;
    if (!id) return res.status(400).json({ error: "ID required" });

    try {
        const target = `${BASE_URL}/play/${id}/${ep}`;
        const { data: html } = await axios.get(target, { headers });
        const $ = cheerio.load(html);
        const nextData = getNextData($);

        // Advanced: Finding the m3u8 in the script dump
        let streamUrl = nextData?.props?.pageProps?.videoInfo?.url || null;

        // Backup: Regex scanning if JSON fails
        if (!streamUrl) {
            const htmlString = $.html();
            const match = htmlString.match(/https?:\/\/[^"']+\.(m3u8|mp4)[^"']*/);
            if (match) streamUrl = match[0].replace(/\\u002F/g, '/');
        }

        res.json({
            success: true,
            dev: DEV,
            data: {
                id,
                episode: ep,
                title: nextData?.props?.pageProps?.dramaInfo?.title || "Unknown",
                cover: nextData?.props?.pageProps?.dramaInfo?.vertical_cover,
                video_url: streamUrl,
                status: streamUrl ? "UNLOCKED" : "LOCKED"
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`[${DEV}] Lightweight API Active`));


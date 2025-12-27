const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Mock API for Scraped Data
app.get('/api/reels', (req, res) => {
    const mockData = [
        {
            id: 1,
            title: "The CEO's Hidden Wife",
            cover: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=400",
            video: "https://assets.mixkit.co/videos/preview/mixkit-girl-walking-in-the-city-at-night-1540-large.mp4",
            likes: "1.2M",
            episodes: 90
        },
        {
            id: 2,
            title: "Revenge of the Billionaire",
            cover: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400",
            video: "https://assets.mixkit.co/videos/preview/mixkit-stunning-woman-in-a-red-dress-walking-in-a-field-41005-large.mp4",
            likes: "890K",
            episodes: 120
        }
    ];
    // Artificial delay to show off the Skeleton Loaders
    setTimeout(() => res.json(mockData), 1500);
});

// Stream Proxy (Advanced Rendering Logic)
app.get('/stream', (req, res) => {
    // In a real scenario, this would handle HLS/M3U8 headers 
    // and proxy the request to bypass CORS from netshort.com
    res.status(200).send("Stream Proxy Active");
});

app.listen(PORT, () => {
    console.log(`🚀 Movie Reels Server running at http://localhost:${PORT}`);
    console.log(`🛠 Scraper ready. Run 'npm run scrape' to populate data.`);
});
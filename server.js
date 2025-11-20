import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// Facebook profile ID
const FB_PROFILE_ID = "61577926411770";

// ==============================
// FETCH FACEBOOK VIA SCRAPERAPI
// ==============================
async function fetchFacebookHTML() {
  const SCRAPER_API_KEY = "84c0bdaa20ad21e3925d0604da7a8221";

  const target = `https://mbasic.facebook.com/profile.php?id=${FB_PROFILE_ID}`;
  const url =
    `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=` +
    encodeURIComponent(target);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Fetch FB failed via ScraperAPI: ${res.status}`);
  }

  return await res.text();
}

// ==============================
// PARSE POSTS
// ==============================
function parsePosts(html) {
  const $ = cheerio.load(html);
  const posts = [];

  // mbasic dùng link story.php
  $('a[href*="story.php"]').each((i, el) => {
    if (posts.length >= 10) return;

    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    if (!href.includes("story.php")) return;
    if (!text) return;

    const link = "https://www.facebook.com" + href;

    posts.push({
      title: text.slice(0, 120),
      link: link,
      description: text,
      pubDate: new Date().toUTCString(),
    });
  });

  return posts;
}

// ==============================
// BUILD RSS XML
// ==============================
function buildRSS(posts) {
  const escapeXML = (str = "") =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const itemsXml = posts
    .map(
      (p) => `
    <item>
      <title>${escapeXML(p.title)}</title>
      <link>${escapeXML(p.link)}</link>
      <description>${escapeXML(p.description)}</description>
      <pubDate>${p.pubDate}</pubDate>
      <guid>${escapeXML(p.link)}</guid>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Facebook Profile Feed</title>
  <link>https://www.facebook.com/profile.php?id=${FB_PROFILE_ID}</link>
  <description>Bài viết mới từ Facebook (Scraped via ScraperAPI)</description>
  ${itemsXml}
</channel>
</rss>`;
}

// ==============================
// MAIN ENDPOINT /feed.xml
// ==============================
app.get("/feed.xml", async (req, res) => {
  try {
    const html = await fetchFacebookHTML();
    const posts = parsePosts(html);
    const rss = buildRSS(posts);

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(rss);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating RSS");
  }
});

// ==============================
// HOME PAGE
// ==============================
app.get("/", (req, res) => {
  res.send("RSS FB Dong Ninh Hoa 24h is running. Use /feed.xml");
});

// ==============================
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

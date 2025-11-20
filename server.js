import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// ID Facebook
const FB_PROFILE_ID = "61577926411770";

// Lấy HTML từ mbasic.facebook.com
async function fetchFacebookHTML() {
  const url = `https://mbasic.facebook.com/profile.php?id=${FB_PROFILE_ID}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cache-Control": "no-cache",
      "Upgrade-Insecure-Requests": "1",
      "Pragma": "no-cache",
      "Connection": "keep-alive"
    }
  });

  if (!res.ok) {
    throw new Error(`Fetch FB failed: ${res.status}`);
  }

  return await res.text();
}

// Parse bài viết
function parsePosts(html) {
  const $ = cheerio.load(html);
  const posts = [];

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

// Tạo RSS XML
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
  <description>Bài viết mới từ Facebook</description>
  ${itemsXml}
</channel>
</rss>`;
}

// Endpoint chính
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

// Trang test
app.get("/", (req, res) => {
  res.send("RSS FB Dong Ninh Hoa 24h is running. Use /feed.xml");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

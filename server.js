// server.js
import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// ID profile bạn muốn lấy bài
const FB_PROFILE_ID = "61577926411770";

// Hàm lấy HTML trang mobile của Facebook
async function fetchFacebookHTML() {
  const url = `https://mbasic.facebook.com/profile.php?id=${FB_PROFILE_ID}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Fetch FB failed: ${res.status}`);
  }
  return await res.text();
}

// Hàm parse HTML thành danh sách bài viết đơn giản
function parsePosts(html) {
  const $ = cheerio.load(html);
  const posts = [];

  // FB mobile dùng link "story.php" cho từng bài
  $('a[href*="story.php"]').each((i, el) => {
    if (posts.length >= 10) return; // tối đa 10 bài

    const $a = $(el);
    const href = $a.attr("href") || "";
    const text = $a.text().trim();

    if (!href.includes("story.php")) return;
    if (!text) return;

    const link = "https://www.facebook.com" + href;

    posts.push({
      title: text.slice(0, 80), // cắt bớt cho gọn
      link,
      description: text,
      pubDate: new Date().toUTCString(), // tạm dùng thời gian crawl
    });
  });

  return posts;
}

// Tạo RSS XML từ danh sách bài
function buildRSS(posts) {
  const escapeXML = (str = "") =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

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
  <title>Facebook profile ${FB_PROFILE_ID}</title>
  <link>https://www.facebook.com/profile.php?id=${FB_PROFILE_ID}</link>
  <description>Bài viết mới từ Facebook profile</description>
  ${itemsXml}
</channel>
</rss>`;
}

// Endpoint chính trả RSS
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

import { chromium } from "playwright";

function parseCount(text) {
  // "1.234", "10,2 mil", "10.2K", etc. -> tenta normalizar (bem básico)
  if (!text) return null;
  const t = text.toLowerCase().trim();

  // pt-BR "mil" / "mi"
  if (t.includes("mil")) return Math.round(parseFloat(t.replace(",", ".").replace(/[^\d.]/g, "")) * 1000);
  if (t.includes("mi"))  return Math.round(parseFloat(t.replace(",", ".").replace(/[^\d.]/g, "")) * 1_000_000);

  // K / M
  if (t.includes("k")) return Math.round(parseFloat(t.replace(",", ".").replace(/[^\d.]/g, "")) * 1000);
  if (t.includes("m")) return Math.round(parseFloat(t.replace(",", ".").replace(/[^\d.]/g, "")) * 1_000_000);

  // número puro com separadores
  const n = parseInt(t.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export async function scrapeInstagramProfile(req, res) {
  const username = String(req.query.username || "marcafy.oficial").replace("@", "").trim();
  if (!username) return res.status(400).json({ error: "username_required" });

  const url = `https://www.instagram.com/${username}/`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      locale: "pt-BR",
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // tenta aguardar um header do perfil (se não aparecer, pode ser bloqueio/login)
    await page.waitForTimeout(1500);

    // pega OG (quando existe)
    const og = await page.evaluate(() => {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null;
      const ogDesc  = document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? null;
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null;
      return { ogTitle, ogDesc, ogImage };
    });

    // tenta pegar contagens no layout atual (pode mudar)
    // No Instagram web, costuma ter um <header> com <ul><li> ... </li></ul>
    const counts = await page.evaluate(() => {
      // tenta achar os spans de números no header
      const header = document.querySelector("header");
      if (!header) return { posts: null, followers: null, following: null };

      // tenta via lista do header
      const items = Array.from(header.querySelectorAll("ul li"));
      const getNum = (li) => {
        // às vezes vem em <span title="1234"> ou texto
        const spanTitle = li.querySelector("span")?.getAttribute("title");
        if (spanTitle) return spanTitle;
        const txt = li.textContent || "";
        return txt;
      };

      // normalmente: [posts, followers, following]
      const values = items.map(getNum);
      return {
        posts: values[0] ?? null,
        followers: values[1] ?? null,
        following: values[2] ?? null,
      };
    });

    // fallback: se ogDesc tiver "Followers / Following / Posts"
    let followers = null, following = null, posts = null;
    if (og.ogDesc) {
      const m = og.ogDesc.match(/([\d.,]+)\s*Followers?.*?([\d.,]+)\s*Following.*?([\d.,]+)\s*Posts?/i);
      if (m) {
        followers = m[1];
        following = m[2];
        posts = m[3];
      }
    }

    // prioriza DOM counts se vierem
    const finalFollowers = parseCount(counts.followers) ?? parseCount(followers);
    const finalFollowing = parseCount(counts.following) ?? parseCount(following);
    const finalPosts = parseCount(counts.posts) ?? parseCount(posts);

    // foto: tenta OG image, senão tenta img do header
    let profilePic = og.ogImage;
    if (!profilePic) {
      profilePic = await page.evaluate(() => {
        const header = document.querySelector("header");
        const img = header?.querySelector("img");
        return img?.getAttribute("src") ?? null;
      });
    }

    // se ainda assim tudo null, é bem provável que caiu em login/challenge
    return res.json({
      success: true,
      username,
      profile_pic_url: profilePic,
      title: og.ogTitle,
      followers: finalFollowers,
      following: finalFollowing,
      posts: finalPosts,
      raw: { ogTitle: og.ogTitle, ogDesc: og.ogDesc },
    });
  } catch (err) {
    return res.status(500).json({
      error: "scrape_failed",
      message: err?.message || "Erro desconhecido",
    });
  } finally {
    if (browser) await browser.close();
  }
}

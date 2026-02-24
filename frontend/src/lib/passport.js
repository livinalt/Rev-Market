// src/lib/passport.js

const SCORER_API = "https://api.passport.xyz/v2/stamps";   // ← new base
const API_KEY    = "tz5fxQ89.rR39568xFj4CeRFa9qIf1Gvdp9upz2B4";
const SCORER_ID  = "11945";   // confirm this is still valid for you
const MIN_SCORE  = 20;

export async function getPassportScore(address) {
  try {
    const url = `${SCORER_API}/${SCORER_ID}/score/${address}`;

    const res = await fetch(url, {
      method: "GET",           // explicit is clearer
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
    });

    if (!res.ok) {
      let err;
      try {
        err = await res.json();
      } catch {
        err = { detail: `HTTP ${res.status}` };
      }
      console.error("Passport API error:", err);
      return { score: 0, passing: false };
    }

    const data = await res.json();
    const score = parseFloat(data?.score ?? "0");

    return {
      score: score.toFixed(2),
      passing: data?.passing_score ?? score >= MIN_SCORE,
    };
  } catch (e) {
    console.error("Passport check failed:", e);
    return { score: 0, passing: false };
  }
}

export const PASSPORT_MIN_SCORE = MIN_SCORE;
export const PASSPORT_URL = "https://passport.gitcoin.co";
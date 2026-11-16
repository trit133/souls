// Gems stack and sell (traders.js): you carry a count of each; Brother Vesk buys them (Mother Grist doesn't), at his
// rate for a legendary; selling takes them from your gems, not your stash; a door wants only one. node scripts/gems.mjs
import { TRADERS, dealsIn, sell, buyPrice, levelOf, stockLimits } from '../src/traders.js';
// (Varek's door: regions.js missingGems, the same check: every gem it needs carried, one is enough)
const AREAS = { r1f: { needs: ['gem_hask', 'gem_vael', 'gem_gorrath'] } }, missingGems = (A, data) => A.needs.filter((g) => !data?.gems?.[g]);
const grist = TRADERS.find((t) => t.id === 'grist'), vesk = TRADERS.find((t) => t.id === 'vesk');
const d = { gold: 0, gems: { gem_hask: 3, gem_vael: 1, gem_gorrath: 1 }, items: { scrap_iron: 2 } };
const out = {
  gristBuys: dealsIn(grist, 'gem_hask'), veskBuys: dealsIn(vesk, 'gem_hask'),
  veskStocksGems: Object.keys(stockLimits(vesk, 5)).some((id) => id.startsWith('gem_')),
  veskLocked: vesk.unlocked({}), veskKey: vesk.unlocked({ traderKeys: { vesk: 1 } }), veskVarek: vesk.unlocked({ raids: { r1f: 1 } }),
};
const price = buyPrice(vesk, 'gem_hask', 1);
out.sold2 = sell(d, vesk, 'gem_hask', 2); out.left = d.gems.gem_hask; out.gold = d.gold; out.price = price;
out.doorOpen = missingGems(AREAS.r1f, d).length === 0;
sell(d, vesk, 'gem_vael', 1); out.afterLast = { vael: d.gems.gem_vael, missing: missingGems(AREAS.r1f, d) };
out.itemsUntouched = d.items.scrap_iron === 2;
console.log(JSON.stringify(out, null, 1));
const ok = !out.gristBuys && out.veskBuys && !out.veskStocksGems && !out.veskLocked && out.veskKey && out.veskVarek && out.sold2 === price * 2 && out.left === 1 && out.doorOpen && out.afterLast.vael === 0 && out.afterLast.missing.join() === 'gem_vael' && out.itemsUntouched;
console.log(ok ? 'PASS' : 'FAIL'); process.exit(ok ? 0 : 1);

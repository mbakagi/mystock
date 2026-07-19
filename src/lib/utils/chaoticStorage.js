import { fetchAllBins } from '../firestore/data';

const ZONE_WEIGHT = 3.0;
const AISLE_WEIGHT = 2.0;
const SHELF_WEIGHT = 1.5;
const CATEGORY_AFFINITY = {
  electronics: { electronics: 5.0, hardware: 2.0, consumables: 0.5, other: 1.0 },
  hardware: { electronics: 2.0, hardware: 5.0, consumables: 1.5, other: 1.0 },
  consumables: { electronics: 0.5, hardware: 1.5, consumables: 5.0, other: 1.0 },
  other: { electronics: 1.0, hardware: 1.0, consumables: 1.0, other: 5.0 }
};

function proximityScore(bin, targetZone, targetAisle, targetCategory) {
  let score = 0;

  if (bin.zone === targetZone) score += ZONE_WEIGHT;
  else score += Math.max(0, ZONE_WEIGHT - Math.abs((bin.zone || 0) - (targetZone || 0)));

  if (bin.aisle === targetAisle) score += AISLE_WEIGHT;
  else score += Math.max(0, AISLE_WEIGHT - Math.abs((bin.aisle || 0) - (targetAisle || 0)));

  score += Math.max(0, SHELF_WEIGHT - Math.abs((bin.shelf || 0) - 1));

  const aff = CATEGORY_AFFINITY[targetCategory] || CATEGORY_AFFINITY.other;
  score += aff[bin.category] || aff.other || 1.0;

  const fillRate = (bin.itemCount || 0) / (bin.maxCapacity || 100);
  score -= fillRate * 2.0;

  return score;
}

export async function findBestBin(targetZone, targetAisle, category, maxCapacity) {
  const bins = await fetchAllBins();
  const candidates = bins.filter((b) => (b.itemCount || 0) < (maxCapacity ?? 100));

  if (candidates.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;

  for (const bin of candidates) {
    const score = proximityScore(bin, targetZone, targetAisle, category);
    if (score > bestScore) {
      bestScore = score;
      best = bin;
    }
  }

  return best;
}

export function scoreBin(bin, targetZone, targetAisle, category) {
  return proximityScore(bin, targetZone, targetAisle, category);
}

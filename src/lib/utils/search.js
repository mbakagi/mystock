import Fuse from 'fuse.js';

let fuseInstance = null;
let lastSnapshot = [];
let lastBuildTime = 0;
const SNAPSHOT_TTL = 5000;

export function buildSearchIndex(bins, items, assignments) {
  const data = [];

  for (const bin of bins) {
    data.push({
      type: 'bin',
      id: bin.id,
      label: bin.label,
      zone: `Zone ${bin.zone}`,
      aisle: `Aisle ${bin.aisle}`,
      shelf: `Shelf ${bin.shelf}`,
      position: `Pos ${bin.position}`,
      itemCount: bin.itemCount,
      searchKey: `${bin.label} ${bin.zone} ${bin.aisle} ${bin.shelf} ${bin.position}`
    });
  }

  for (const item of items) {
    data.push({
      type: 'item',
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      description: item.description,
      unit: item.unit,
      searchKey: `${item.sku} ${item.name} ${item.category} ${item.description}`
    });
  }

  for (const a of assignments) {
    const item = items.find((i) => i.id === a.itemId);
    const bin = bins.find((b) => b.id === a.binId);
    data.push({
      type: 'assignment',
      id: a.id,
      sku: item?.sku ?? '',
      itemName: item?.name ?? '',
      binLabel: bin?.label ?? '',
      quantity: a.quantity,
      lotNumber: a.lotNumber,
      status: a.status,
      searchKey: `${item?.sku} ${item?.name} ${bin?.label} ${a.lotNumber}`
    });
  }

  lastSnapshot = data;
  lastBuildTime = Date.now();

  fuseInstance = new Fuse(data, {
    keys: ['searchKey', 'label', 'name', 'sku', 'binLabel'],
    threshold: 0.35,
    includeScore: true,
    minMatchCharLength: 2
  });

  return fuseInstance;
}

export function search(query) {
  if (!fuseInstance || !query || query.trim().length < 1) return [];
  return fuseInstance.search(query.trim()).map((r) => r.item).slice(0, 20);
}

export function isSnapshotStale() {
  return Date.now() - lastBuildTime > SNAPSHOT_TTL;
}

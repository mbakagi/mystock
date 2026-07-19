class MinHeap {
  constructor() {
    this.data = [];
  }
  push(node) {
    this.data.push(node);
    this._bubbleUp(this.data.length - 1);
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }
  get length() {
    return this.data.length;
  }
  _bubbleUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[i].f >= this.data[p].f) break;
      [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
      i = p;
    }
  }
  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let best = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].f < this.data[best].f) best = l;
      if (r < n && this.data[r].f < this.data[best].f) best = r;
      if (best === i) break;
      [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
      i = best;
    }
  }
}

function heuristic(a, b) {
  return Math.abs(a.aisle - b.aisle) * 10 + Math.abs(a.shelf - b.shelf) * 5 + Math.abs(a.position - b.position);
}

function getNeighbors(node, grid) {
  const neighbors = [];
  const dirs = [
    { aisle: 0, shelf: 0, position: 1 },
    { aisle: 0, shelf: 0, position: -1 },
    { aisle: 0, shelf: 1, position: 0 },
    { aisle: 0, shelf: -1, position: 0 },
    { aisle: 1, shelf: 0, position: 0 },
    { aisle: -1, shelf: 0, position: 0 }
  ];

  for (const d of dirs) {
    const key = `${node.aisle + d.aisle},${node.shelf + d.shelf},${node.position + d.position}`;
    if (grid.has(key)) {
      neighbors.push(grid.get(key));
    }
  }
  return neighbors;
}

export function findPath(bins, startBinId, orderedBinIds) {
  if (orderedBinIds.length === 0) return { orderedBinIds: [], svgPath: '', totalDistance: 0 };

  const grid = new Map();
  for (const bin of bins) {
    const key = `${bin.aisle},${bin.shelf},${bin.position}`;
    grid.set(key, bin);
  }

  const start = bins.find((b) => b.id === startBinId);
  if (!start) return { orderedBinIds: [], svgPath: '', totalDistance: 0 };

  const result = [start];
  let current = start;
  let totalDistance = 0;
  const visited = new Set([start.id]);

  for (const targetId of orderedBinIds) {
    if (visited.has(targetId)) continue;
    const target = bins.find((b) => b.id === targetId);
    if (!target) continue;

    const path = astar(current, target, grid);
    if (path.length > 0) {
      for (let i = 1; i < path.length; i++) {
        if (!visited.has(path[i].id)) {
          result.push(path[i]);
          visited.add(path[i].id);
        }
      }
      totalDistance += heuristic(current, target);
      current = target;
    }
  }

  const svgPath = buildSvgPath(result);
  return {
    orderedBinIds: result.map((b) => b.id),
    svgPath,
    totalDistance
  };
}

function astar(start, goal, grid) {
  const open = new MinHeap();
  const closed = new Set();
  const gScore = new Map();
  const cameFrom = new Map();

  const startKey = `${start.aisle},${start.shelf},${start.position}`;
  const goalKey = `${goal.aisle},${goal.shelf},${goal.position}`;

  gScore.set(startKey, 0);
  open.push({ ...start, f: heuristic(start, goal) });

  while (open.length > 0) {
    const current = open.pop();
    const cKey = `${current.aisle},${current.shelf},${current.position}`;

    if (cKey === goalKey) {
      const path = [];
      let k = cKey;
      while (k) {
        const b = grid.get(k);
        if (b) path.unshift(b);
        k = cameFrom.get(k);
      }
      return path;
    }

    closed.add(cKey);

    for (const neighbor of getNeighbors(current, grid)) {
      const nKey = `${neighbor.aisle},${neighbor.shelf},${neighbor.position}`;
      if (closed.has(nKey)) continue;

      const congestion = neighbor.congestion || 1;
      const tentG = gScore.get(cKey) + heuristic(current, neighbor) * congestion;

      if (tentG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, cKey);
        gScore.set(nKey, tentG);
        open.push({ ...neighbor, f: tentG + heuristic(neighbor, goal) });
      }
    }
  }

  return [start];
}

function buildSvgPath(bins) {
  if (bins.length < 2) return '';
  const points = bins.map((b) => ({
    x: (b.aisle || 0) * 60 + 30,
    y: (b.shelf || 0) * 40 + (b.position || 0) * 20 + 20
  }));

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x},${points[i].y}`;
  }
  return d;
}

export function buildGridFromBins(bins) {
  const grid = new Map();
  for (const bin of bins) {
    const key = `${bin.aisle},${bin.shelf},${bin.position}`;
    grid.set(key, bin);
  }
  return grid;
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  increment,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './client';

const INVENTORY = collection(db, 'inventory');
const LOCATIONS = collection(db, 'locations');
const TRANSACTIONS = collection(db, 'transactions');
const COUNTS = collection(db, 'counts');

const COMPOSITE_RE = /^[A-Za-z0-9\-_]+_R[^_]+_A[^_]+_B[^_]+_B[^_]+$/;
const MAX_BIN_CAPACITY = 100;

function isCompositeId(id) {
  return COMPOSITE_RE.test(id);
}

function makeCompositeId(sku, room, aisle, bay, bin) {
  return `${sku}_R${room}_A${aisle}_B${bay}_B${bin}`;
}

function parseCompositeId(id) {
  const m = id.match(/^(.+?)_R([^_]+)_A([^_]+)_B([^_]+)_B([^_]+)$/);
  if (!m) return null;
  return { sku: m[1], room: m[2], aisle: m[3], bay: m[4], bin: m[5] };
}

export function binRef(id) {
  return doc(db, 'locations', id);
}

export function itemRef(id) {
  return doc(db, 'inventory', id);
}

export function assignmentRef(id) {
  return doc(db, 'inventory', id);
}

export function countRef(id) {
  return doc(db, 'counts', id);
}

export async function fetchAllBins() {
  const snap = await getDocs(LOCATIONS);
  const invSnap = await getDocs(INVENTORY);
  const binItemCounts = {};
  for (const d of invSnap.docs) {
    if (isCompositeId(d.id)) {
      const p = parseCompositeId(d.id);
      if (p) {
        const key = p.room + '|' + p.aisle + '|' + p.bay + '|' + p.bin;
        binItemCounts[key] = (binItemCounts[key] || 0) + 1;
      }
    }
  }
  return snap.docs.map((d) => {
    const bin = { id: d.id, ...d.data() };
    return {
      id: bin.id,
      label: bin.name || bin.label || bin.id,
      zone: bin.zone ?? (parseInt(bin.name?.match(/Z(\d+)/)?.[1]) || 0),
      aisle: bin.aisle ?? (parseInt(bin.name?.match(/A(\d+)/)?.[1]) || 0),
      shelf: bin.shelf ?? (parseInt(bin.name?.match(/S(\d+)/)?.[1]) || 0),
      position: bin.position ?? (parseInt(bin.name?.match(/P(\d+)/)?.[1]) || 0),
      itemCount: binItemCounts[bin.zone + '|' + bin.aisle + '|' + bin.shelf + '|' + bin.position] ||
                 binItemCounts[bin.name || bin.id] ||
                 bin.itemCount ||
                 0,
      name: bin.name,
      order: bin.order
    };
  });
}

export async function fetchAllItems() {
  const snap = await getDocs(INVENTORY);
  const items = [];
  for (const d of snap.docs) {
    if (!isCompositeId(d.id)) {
      const data = d.data();
      items.push({
        id: d.id,
        sku: data.sku || '',
        name: data.name || '',
        description: data.description || '',
        category: data.category || 'other',
        unit: data.unit || 'pcs',
        totalStock: data.totalStock ?? 0,
        maxCapacity: data.maxCapacity ?? 100
      });
    }
  }
  return items;
}

export async function fetchAllAssignments() {
  const snap = await getDocs(INVENTORY);
  const locSnap = await getDocs(LOCATIONS);
  const locMap = {};
  for (const d of locSnap.docs) {
    const data = d.data();
    locMap[data.name || d.id] = d.id;
  }

  const invSnap2 = await getDocs(INVENTORY);
  const itemSkus = {};
  for (const d of invSnap2.docs) {
    if (!isCompositeId(d.id)) {
      const data = d.data();
      if (data.sku) itemSkus[data.sku] = d.id;
    }
  }

  const assignments = [];
  for (const d of snap.docs) {
    if (isCompositeId(d.id)) {
      const parsed = parseCompositeId(d.id);
      const data = d.data();
      const binLabel = parsed?.room || data.room || '0';
      const itemSku = parsed?.sku || data.sku || '';
      assignments.push({
        id: d.id,
        binId: locMap[binLabel] || binLabel,
        itemId: itemSkus[itemSku] || itemSku,
        quantity: data.quantity || 0,
        lotNumber: data.lotNumber || null,
        status: data.status || 'active',
        sku: itemSku,
        _room: parsed?.room,
        _aisle: parsed?.aisle,
        _bay: parsed?.bay,
        _bin: parsed?.bin
      });
    }
  }
  return assignments;
}

export async function fetchBin(binId) {
  const snap = await getDoc(binRef(binId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fetchItem(itemId) {
  const snap = await getDoc(itemRef(itemId));
  if (!snap.exists()) return null;
  if (isCompositeId(snap.id)) return null;
  return { id: snap.id, ...snap.data() };
}

export async function fetchAssignment(assignmentId) {
  const snap = await getDoc(assignmentRef(assignmentId));
  if (!snap.exists()) return null;
  if (!isCompositeId(snap.id)) return null;
  const parsed = parseCompositeId(snap.id);
  const data = snap.data();
  return {
    id: snap.id,
    binId: data.room || parsed?.room || '',
    itemId: data.sku || parsed?.sku || '',
    quantity: data.quantity || 0,
    lotNumber: data.lotNumber || null,
    status: data.status || 'active',
    sku: data.sku || parsed?.sku || ''
  };
}

export async function createBin(data) {
  const ref = doc(LOCATIONS);
  await setDoc(ref, {
    name: data.label,
    zone: data.zone ?? 0,
    aisle: data.aisle ?? 0,
    shelf: data.shelf ?? 0,
    position: data.position ?? 0,
    order: data.order ?? 0
  }, { merge: true });
  return ref.id;
}

export async function createItem(data) {
  const ref = doc(INVENTORY);
  await setDoc(ref, {
    sku: data.sku,
    name: data.name,
    description: data.description || '',
    category: data.category || 'other',
    unit: data.unit || 'pcs',
    totalStock: 0,
    carrierTrigger: 0,
    maxCapacity: data.maxCapacity ?? 100,
    purchasingTrigger: 0
  }, { merge: true });
  return ref.id;
}

export async function assignItem(binId, itemId, quantity, lotNumber, expiryDate, room, aisle, bay, binLabel) {
  const item = await fetchItem(itemId);
  if (!item) throw new Error('Item not found');

  const compositeId = makeCompositeId(
    item.sku,
    room || '0',
    aisle || '0',
    bay || '0',
    binLabel || '0'
  );

  const ref = doc(INVENTORY, compositeId);
  await setDoc(ref, {
    sku: item.sku,
    room: room || '0',
    aisle: aisle || '0',
    bay: bay || '0',
    bin: binLabel || '0',
    quantity: quantity,
    lotNumber: lotNumber ?? null,
    lastCounted: serverTimestamp(),
    lastCountedBy: auth.currentUser?.uid ?? null
  }, { merge: true });

  await createTransaction(itemId, item.sku, quantity, 'transfer');

  return compositeId;
}

async function createTransaction(itemId, sku, qtyOut, type) {
  const ref = doc(TRANSACTIONS);
  await setDoc(ref, {
    itemId,
    sku,
    qtyOut,
    type,
    timestamp: serverTimestamp()
  }, { merge: true });
}

export async function updateAssignmentQuantity(assignmentId, newQuantity) {
  const assigned = await fetchAssignment(assignmentId);
  if (!assigned) throw new Error('Assignment not found');
  const delta = newQuantity - (assigned.quantity || 0);
  await updateDoc(assignmentRef(assignmentId), { quantity: newQuantity });
  if (delta !== 0) {
    await createTransaction(
      assigned.itemId || assigned._sku || assignmentId,
      assigned.sku || assigned._sku || '',
      Math.abs(delta),
      'adjust'
    );
  }
}

export async function updateBinLabel(binId, label) {
  await updateDoc(binRef(binId), { name: label, label: label });
}

export async function createCount(userId, discrepancies) {
  const ref = doc(COUNTS);
  await setDoc(ref, {
    userId,
    binCode: 'bulk',
    completedAt: serverTimestamp(),
    discrepancies: discrepancies ?? []
  }, { merge: true });
  return ref.id;
}

export async function batchUpdateAssignments(updates) {
  const locSnap = await getDocs(LOCATIONS);
  const locMap = {};
  for (const d of locSnap.docs) {
    const data = d.data();
    locMap[d.id] = data.name || d.id;
  }

  const chunks = [];
  for (let i = 0; i < updates.length; i += 500) {
    chunks.push(updates.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const u of chunk) {
      const fields = {};
      if (u.fields.binId !== undefined) {
        fields.room = locMap[u.fields.binId] || u.fields.binId;
      }
      if (u.fields.quantity !== undefined) {
        fields.quantity = u.fields.quantity;
      }
      if (u.fields.lastCounted !== undefined) {
        fields.lastCounted = u.fields.lastCounted;
      }
      if (u.fields.lastCountedBy !== undefined) {
        fields.lastCountedBy = u.fields.lastCountedBy;
      }
      if (u.fields.status !== undefined) {
        fields.status = u.fields.status;
      }
      if (Object.keys(fields).length > 0) {
        batch.update(assignmentRef(u.id), fields);
      }
    }
    await batch.commit();
  }
}

export async function batchCreateCounts(counts) {
  const chunks = [];
  for (let i = 0; i < counts.length; i += 500) {
    chunks.push(counts.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const c of chunk) {
      const ref = doc(COUNTS);
      batch.set(ref, c, { merge: true });
    }
    await batch.commit();
  }
}

export async function fetchAssignmentsForBin(binId) {
  const bin = await fetchBin(binId);
  if (!bin) return [];

  const snap = await getDocs(INVENTORY);
  const invSnap2 = await getDocs(INVENTORY);
  const itemSkus = {};
  for (const d of invSnap2.docs) {
    if (!isCompositeId(d.id)) {
      const data = d.data();
      if (data.sku) itemSkus[data.sku] = d.id;
    }
  }

  const locLabel = bin.label || bin.name || binId;
  const assignments = [];
  for (const d of snap.docs) {
    if (isCompositeId(d.id)) {
      const parsed = parseCompositeId(d.id);
      const data = d.data();
      const roomStr = parsed?.room || data.room || '';
      const skuStr = parsed?.sku || data.sku || '';
      if (roomStr === locLabel) {
        assignments.push({
          id: d.id,
          binId: binId,
          itemId: itemSkus[skuStr] || skuStr,
          quantity: data.quantity || 0,
          lotNumber: data.lotNumber || null,
          status: data.status || 'active',
          sku: skuStr
        });
      }
    }
  }
  return assignments;
}

export { MAX_BIN_CAPACITY };

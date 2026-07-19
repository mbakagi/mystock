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

const BINS = collection(db, 'bins');
const ITEMS = collection(db, 'items');
const ASSIGNMENTS = collection(db, 'assignments');
const COUNTS = collection(db, 'counts');

const MAX_BIN_CAPACITY = 100;

export function binRef(id) {
  return doc(db, 'bins', id);
}

export function itemRef(id) {
  return doc(db, 'items', id);
}

export function assignmentRef(id) {
  return doc(db, 'assignments', id);
}

export function countRef(id) {
  return doc(db, 'counts', id);
}

export async function fetchAllBins() {
  const snap = await getDocs(BINS);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchAllItems() {
  const snap = await getDocs(ITEMS);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchAllAssignments() {
  const snap = await getDocs(ASSIGNMENTS);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchBin(binId) {
  const snap = await getDoc(binRef(binId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fetchItem(itemId) {
  const snap = await getDoc(itemRef(itemId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fetchAssignment(assignmentId) {
  const snap = await getDoc(assignmentRef(assignmentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createBin(data) {
  const ref = doc(BINS);
  await setDoc(ref, { ...data, itemCount: 0 }, { merge: true });
  return ref.id;
}

export async function createItem(data) {
  const ref = doc(ITEMS);
  await setDoc(ref, data, { merge: true });
  return ref.id;
}

export async function assignItem(binId, itemId, quantity, lotNumber, expiryDate) {
  const ref = doc(ASSIGNMENTS);
  await setDoc(ref, {
    binId,
    itemId,
    quantity,
    lotNumber: lotNumber ?? null,
    expiryDate: expiryDate ?? null,
    lastCounted: serverTimestamp(),
    lastCountedBy: auth.currentUser?.uid ?? null,
    status: 'active'
  }, { merge: true });
  await updateDoc(binRef(binId), { itemCount: increment(1) });
  return ref.id;
}

export async function updateAssignmentQuantity(assignmentId, newQuantity) {
  await updateDoc(assignmentRef(assignmentId), { quantity: newQuantity });
}

export async function updateBinLabel(binId, label) {
  await updateDoc(binRef(binId), { label });
}

export async function createCount(userId, discrepancies) {
  const ref = doc(COUNTS);
  await setDoc(ref, {
    userId,
    startedAt: serverTimestamp(),
    completedAt: serverTimestamp(),
    discrepancies: discrepancies ?? []
  }, { merge: true });
  return ref.id;
}

export async function batchUpdateAssignments(updates) {
  const chunks = [];
  for (let i = 0; i < updates.length; i += 500) {
    chunks.push(updates.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const u of chunk) {
      batch.update(assignmentRef(u.id), u.fields);
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
  const q = query(ASSIGNMENTS, where('binId', '==', binId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export { MAX_BIN_CAPACITY };

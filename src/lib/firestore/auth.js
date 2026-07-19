import {
  signInAnonymously,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './client';

export function authSubscribe(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInAnon() {
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function signInEmail(email) {
  const actionCodeSettings = {
    url: `${window.location.origin}${location.pathname.startsWith('/mystock') ? '/mystock' : ''}/auth/callback`,
    handleCodeInApp: true
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

export async function confirmEmailLink(email, link) {
  const cred = await signInWithEmailLink(auth, email, link);
  return cred.user;
}

export function isEmailLink(link) {
  return isSignInWithEmailLink(auth, link);
}

export async function doSignOut() {
  await signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

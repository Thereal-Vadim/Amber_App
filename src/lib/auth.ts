"use client";

import {
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "./firebase";

export type AuthProfile = {
  uid: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  color: string;
};

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "•";
}

export function profileFromUser(user: User, fallbackName = "Участник"): AuthProfile {
  const name = user.displayName?.trim() || fallbackName;
  return {
    uid: user.uid,
    name,
    initials: initialsFrom(name),
    phone: user.phoneNumber ?? "",
    email: user.email ?? "",
    color: "#9c613d",
  };
}

async function ensureUserDoc(user: User, profile: AuthProfile) {
  const db = getFirestoreDb();
  if (!db) return;
  await setDoc(
    doc(db, "users", user.uid),
    {
      name: profile.name,
      initials: profile.initials,
      phone: profile.phone,
      email: profile.email,
      color: profile.color,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

async function finishSignIn(user: User, name?: string) {
  if (name?.trim() && user.displayName !== name.trim()) {
    await updateProfile(user, { displayName: name.trim() });
  }
  const profile = profileFromUser(user, name?.trim() || "Участник");
  await ensureUserDoc(user, profile);
  return profile;
}

/** Apple when configured; otherwise Google; otherwise anonymous guest. */
export async function signInWithAppleOrFallback(displayName?: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth недоступен");
  try {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    const result = await signInWithPopup(auth, provider);
    return finishSignIn(result.user, displayName || result.user.displayName || undefined);
  } catch (appleError) {
    const code = (appleError as { code?: string }).code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") throw appleError;
    try {
      const google = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, google);
      return finishSignIn(result.user, displayName || result.user.displayName || undefined);
    } catch (googleError) {
      const gCode = (googleError as { code?: string }).code;
      if (gCode === "auth/popup-closed-by-user" || gCode === "auth/cancelled-popup-request") throw googleError;
      const result = await signInAnonymously(auth);
      return finishSignIn(result.user, displayName || "Гость Amber");
    }
  }
}

export async function signInAsGuest(displayName: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth недоступен");
  const result = await signInAnonymously(auth);
  return finishSignIn(result.user, displayName || "Гость Amber");
}

let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

export function clearPhoneVerifier() {
  verifier?.clear();
  verifier = null;
  confirmation = null;
}

export async function startPhoneSignIn(phone: string, containerId = "recaptcha-container") {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth недоступен");
  clearPhoneVerifier();
  verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  confirmation = await signInWithPhoneNumber(auth, phone, verifier);
  return true;
}

export async function confirmPhoneSignIn(code: string, displayName?: string) {
  if (!confirmation) throw new Error("Сначала запросите код");
  const result = await confirmation.confirm(code);
  confirmation = null;
  return finishSignIn(result.user, displayName);
}

/** When Phone Auth is not enabled — anonymous + store phone on profile. */
export async function signInWithPhoneFallback(phone: string, displayName?: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth недоступен");
  try {
    await startPhoneSignIn(phone);
    return { needsCode: true as const };
  } catch {
    clearPhoneVerifier();
    const result = await signInAnonymously(auth);
    const profile = await finishSignIn(result.user, displayName || "Участник");
    const db = getFirestoreDb();
    if (db) await setDoc(doc(db, "users", result.user.uid), { phone }, { merge: true });
    return { needsCode: false as const, profile: { ...profile, phone } };
  }
}

export async function signOutUser() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  clearPhoneVerifier();
  await firebaseSignOut(auth);
}

export function listenAuth(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

export async function linkPhoneCredential(_credential: never) {
  return linkWithCredential;
}

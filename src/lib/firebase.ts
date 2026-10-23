"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyBuc_U0aSabJUMYfZv8ysv462xOBA3hWJg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "sportai-9e337.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "sportai-9e337",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "sportai-9e337.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "409254404219",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:409254404219:web:5d5cf04f5aaf66df0a82de",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-N23XHB00SQ",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let messaging: Messaging | undefined;

export function getFirebaseApp() {
  if (typeof window === "undefined") return undefined;
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth() {
  const current = getFirebaseApp();
  if (!current) return undefined;
  if (!auth) auth = getAuth(current);
  return auth;
}

export function getFirestoreDb() {
  const current = getFirebaseApp();
  if (!current) return undefined;
  if (!db) db = getFirestore(current);
  return db;
}

export async function getFirebaseMessaging() {
  const current = getFirebaseApp();
  if (!current) return undefined;
  if (!(await isSupported())) return undefined;
  if (!messaging) messaging = getMessaging(current);
  return messaging;
}

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

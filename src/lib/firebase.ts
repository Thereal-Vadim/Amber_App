"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyDy9qQW4CfaaYqhOEJSm7USckJAir2fQBE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "amber-events-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "amber-events-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "amber-events-app.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "452141028475",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:452141028475:web:6cdcee1eff8434fd3f3ede",
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

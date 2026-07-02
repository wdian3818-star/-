import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import fs from "fs";
import path from "path";

let db: any = null;

export function getDb() {
  if (db) return db;

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("firebase-applet-config.json not found! Falling back to local/memory mode.");
      return null;
    }
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Check if firestoreDatabaseId is defined to use specific database
    if (config.firestoreDatabaseId) {
      db = getFirestore(app, config.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
    console.log("Firebase initialized successfully with database id:", config.firestoreDatabaseId || "(default)");
    return db;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    return null;
  }
}

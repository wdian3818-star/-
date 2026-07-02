import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let db: any = null;

export function getDb() {
  if (db) return db;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Missing Firebase Admin SDK environment variables. Firebase operations will fall back to local mode.");
      return null;
    }

    let app;
    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
    } else {
      app = getApp();
    }

    // Try to read databaseId from environment or firebase-applet-config.json
    let databaseId = process.env.FIREBASE_DATABASE_ID;
    if (!databaseId) {
      try {
        const configPath = path.join(process.cwd(), "firebase-applet-config.json");
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          databaseId = config.firestoreDatabaseId;
        }
      } catch (err) {
        console.warn("Could not read databaseId from firebase-applet-config.json:", err);
      }
    }

    if (databaseId) {
      console.log(`Initializing Firestore with custom databaseId: ${databaseId}`);
      db = getFirestore(app, databaseId);
    } else {
      console.log("Initializing Firestore with default databaseId");
      db = getFirestore(app);
    }

    console.log("Firebase Admin SDK initialized successfully.");
    return db;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

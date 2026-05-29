import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clean() {
  const codesSnap = await getDocs(collection(db, 'accessCodes'));
  const validCodes = new Set(codesSnap.docs.map(d => d.id));
  
  const studentsSnap = await getDocs(collection(db, 'students'));
  for (const stu of studentsSnap.docs) {
    const data = stu.data();
    if (!validCodes.has(data.accessCode)) {
      console.log('Orphaned student:', data.name, stu.id, data.accessCode);
      await deleteDoc(doc(db, 'students', stu.id));
      console.log('Deleted.');
    }
  }
}

clean().catch(console.error);

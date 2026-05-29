import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function check() {
  const c = await getDocs(collection(db, 'accessCodes'));
  console.log('Access Codes: ', c.docs.map(x => ({ id: x.id, ...x.data() })));
  
  const s = await getDocs(collection(db, 'students'));
  console.log('Students: ', s.docs.map(x => ({ id: x.id, ...x.data() })));
  
  const g = await getDocs(collection(db, 'game_sessions'));
  console.log('Game Sessions: ', g.docs.map(x => ({ id: x.id, ...x.data() })));
}

check().catch(console.error);

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBMA7zmhpq66DBjacenKzZIub_-YCZWegk',
  authDomain: 'lisa-518f0.firebaseapp.com',
  databaseURL: 'https://lisa-518f0-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'lisa-518f0',
  storageBucket: 'lisa-518f0.firebasestorage.app',
  messagingSenderId: '873280730927',
  appId: '1:873280730927:web:68548536ebbcc91da593da',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

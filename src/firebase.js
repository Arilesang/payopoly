import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCySXky6F477uFFhEEe_L3oDx0Qj62Z2o8",
  authDomain: "payopoly.firebaseapp.com",
  databaseURL: "https://payopoly-default-rtdb.firebaseio.com",
  projectId: "payopoly",
  storageBucket: "payopoly.firebasestorage.app",
  messagingSenderId: "803877757952",
  appId: "1:803877757952:web:d915c84491137b958624e5",
  measurementId: "G-QKZ3CJ1PHY",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

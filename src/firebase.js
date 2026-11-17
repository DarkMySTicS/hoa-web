import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVEE-45FBEgkNAq8GcxEA9bquMC2k8eA4",
  authDomain: "house-of-ambi.firebaseapp.com",
  projectId: "house-of-ambi",
  messagingSenderId: "47439132057",
  appId: "1:47439132057:web:55b9a880fb5cac7d964f08",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;

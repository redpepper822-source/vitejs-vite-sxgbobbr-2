import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; // 로그인 기능 추가

const firebaseConfig = {
  apiKey: "AIzaSyD5983sG69Szb_Mx8gM9tqc_bqpvj9EZ1U",
  authDomain: "ensemble-7f317.firebaseapp.com",
  databaseURL: "https://ensemble-7f317-default-rtdb.firebaseio.com",
  projectId: "ensemble-7f317",
  storageBucket: "ensemble-7f317.firebasestorage.app",
  messagingSenderId: "778065602788",
  appId: "1:778065602788:web:6b81c4877cd020083ea4f1",
  measurementId: "G-PZWRF8V6TM"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app); // 앱 전체에서 auth를 사용할 수 있도록 내보냄

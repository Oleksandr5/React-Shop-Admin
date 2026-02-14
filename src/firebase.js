// src/firebase.js
import firebase from "firebase/app";
import "firebase/database";

const firebaseConfig = {
	apiKey: "AIzaSyCTUkCqutmrXTdzkG6I4O9v8AHwcj0n-Qg",
	authDomain: "project-react-shop.firebaseapp.com",
	databaseURL: "https://project-react-shop-default-rtdb.firebaseio.com",
	projectId: "project-react-shop",
	storageBucket: "project-react-shop.firebasestorage.app",
	messagingSenderId: "424014729575",
	appId: "1:424014729575:web:8f440530c56b53d36f1fc2"
};

// Перевірка, щоб не ініціалізувати Firebase більше одного разу
if (!firebase.apps.length) {
	firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();

export { firebase, database };

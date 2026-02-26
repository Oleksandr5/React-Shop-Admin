const firebase = require("firebase");

// Конфігурація Firebase (як у твоєму проєкті)

const firebaseConfig = {
	apiKey: "AIzaSyCTUkCqutmrXTdzkG6I4O9v8AHwcj0n-Qg",
	authDomain: "project-react-shop.firebaseapp.com",
	databaseURL: "https://project-react-shop-default-rtdb.firebaseio.com",
	projectId: "project-react-shop",
	storageBucket: "project-react-shop.appspot.com",
	messagingSenderId: "424014729575",
	appId: "1:424014729575:web:8f440530c56b53d36f1fc2"
}

if (!firebase.apps.length) {
	firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

const adminIds = ["139", "155", "156"];
const usedMaterialsAdminIds = ["155"];

const saveAdminArrays = async () => {
	try {
		await db.ref("settings/isAdmin").set(adminIds);
		await db.ref("settings/isAdminUsedMaterials").set(usedMaterialsAdminIds);

		const historyRef = db.ref("settings/adminHistory");
		await historyRef.push({
			isAdmin: adminIds,
			isAdminUsedMaterials: usedMaterialsAdminIds,
			createdAt: firebase.database.ServerValue.TIMESTAMP,
		});

		console.log("Масиви admin успішно збережено!");
	} catch (error) {
		console.error("Error saving admin arrays:", error);
	}
};

// saveAdminArrays();
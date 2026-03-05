import firebase from "firebase";

// 1️⃣ Константи дій
export const UPDATE_INVOICES = "UPDATE_INVOICES";
export const UPDATE_INVOICES_SUMMARY = "UPDATE_INVOICES_SUMMARY";
export const SET_NOTIFICATIONS = "SET_NOTIFICATIONS";
export const SET_USED_MATERIALS = "SET_USED_MATERIALS";
export const ARCHIVE_DATA_SUCCESS = "ARCHIVE_DATA_SUCCESS";


// 2️⃣ Функції-екшени
export function fetchInvoices(customerId) {
	return async (dispatch) => {
		try {
			const snapshot = await firebase.database().ref(`invoices/${customerId}`).once("value");
			const data = snapshot.val();
			console.log("Fetched raw invoices from Firebase:", data)
			dispatch({
				type: UPDATE_INVOICES,
				payload: data ? Object.values(data) : []
			});
			console.log("Fetched invoices:", data);
		} catch (error) {
			console.log("Error fetching invoices:", error);
		}
	};
}

// ЗМІНЕНО: тепер повертає об'єкт для зручного пошуку за ID
// export function fetchInvoicesSummary(customerId) {
// 	return async (dispatch) => {
// 		try {
// 			const snapshot = await firebase.database().ref(`invoicesSummary/${customerId}`).once("value");
// 			const data = snapshot.val();
// 			dispatch({
// 				type: UPDATE_INVOICES_SUMMARY,
// 				payload: data || {}
// 			});
// 		} catch (error) {
// 			console.log("Error fetching invoices summary:", error);
// 		}
// 	};
// }

export function fetchInvoicesSummary(customerId) {
	return async (dispatch) => {
		try {
			const snapshot = await firebase.database().ref(`invoicesSummary/${customerId}`).once("value");
			const data = snapshot.val();
			console.log("Fetched raw invoicesSummary from Firebase:", data)
			dispatch({
				type: UPDATE_INVOICES_SUMMARY,
				// Додаємо productId з ключа, якщо його немає в самому об'єкті
				payload: data ? Object.keys(data).map(key => ({
					...data[key],
					productId: data[key].productId || Number(key)
				})) : []
			});
			console.log("Fetched invoices summary:", data);
		} catch (error) {
			console.log("Error fetching invoices summary:", error);
		}
	};
}

export function fetchOrderNotifications() {
	return async (dispatch) => {
		try {
			const snapshot = await firebase
				.database()
				.ref('orderNotifications')
				.once("value");

			const data = snapshot.val();
			let allNotifications = [];

			if (data) {
				Object.values(data).forEach(customerNotifications => {
					allNotifications.push(...Object.values(customerNotifications));
				});
			}

			// сортування (нові зверху)
			allNotifications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

			dispatch({
				type: SET_NOTIFICATIONS,
				payload: allNotifications
			});

		} catch (error) {
			console.log("Error fetching notifications:", error);
		}
	};
}

export function deleteNotification(order) {
	return async dispatch => {
		if (!order?.customerId || !order?.orderId) return;

		await firebase
			.database()
			.ref(`orderNotifications/${order.customerId}/${order.orderId}`)
			.remove();

		// після видалення оновлюємо notifications
		dispatch(fetchOrderNotifications());
	};
}

export function clearNotifications(customerId) {
	return async dispatch => {
		if (customerId) {
			// тільки для конкретного користувача
			await firebase.database().ref(`orderNotifications/${customerId}`).remove();
		} else {
			// для адміна – видалити всі notifications
			const snapshot = await firebase.database().ref('orderNotifications').once('value');
			const data = snapshot.val();
			if (data) {
				const updates = {};
				Object.keys(data).forEach(cId => {
					updates[cId] = null;
				});
				await firebase.database().ref('orderNotifications').update(updates);
			}
		}

		dispatch(fetchOrderNotifications());
	};
}

export function fetchUsedMaterials(customerId) {
	return async (dispatch) => {
		try {
			if (!customerId) return;

			const snapshot = await firebase
				.database()
				.ref(`usedMaterials/${customerId}`)
				.once("value");

			dispatch({
				type: SET_USED_MATERIALS,
				payload: snapshot.val() || {}
			});
		} catch (error) {
			console.log("Error fetching used materials:", error);
		}
	};
}

export const addUsedMaterial = (customerId, productId, value = null, agreement = null, rollbackToValue = null) => async (dispatch) => {
	try {
		const dbRef = firebase.database().ref(`usedMaterials/${customerId}/${productId}`);
		const historyRef = firebase.database().ref(`usedMaterialsHistory/${customerId}/${productId}`);

		if (rollbackToValue !== null) {
			// Логіка відкату (Rollback)
			const snapshot = await historyRef.once("value");
			const history = snapshot.val() || {};
			const sortedHistory = Object.entries(history).sort((a, b) => a[1].createdAt - b[1].createdAt);

			let newTotal = 0;
			const updates = {};
			for (const [id, h] of sortedHistory) {
				if (newTotal + h.value <= rollbackToValue) {
					newTotal += h.value;
				} else {
					updates[id] = null;
				}
			}
			await historyRef.update(updates);
			await dbRef.set(newTotal);
		} else if (value) {
			// Логіка додавання
			const snapshot = await dbRef.once("value");
			const currentValue = snapshot.val() || 0;
			const newTotal = currentValue + Number(value);

			await dbRef.set(newTotal);
			await historyRef.push({
				value: Number(value),
				currentValue: newTotal,
				createdAt: firebase.database.ServerValue.TIMESTAMP,
				agreement
			});
		}

		// Оновлюємо основний стейт через існуючий екшен
		await dispatch(fetchUsedMaterials(customerId));
	} catch (error) {
		console.error("Error in addUsedMaterial:", error);
	}
};

export const fetchUsedMaterialsHistory = async (customerId, productId) => {

	console.log("--- ПЕРЕВІРКА ВЕРСІЇ КОДУ 2.0 ---"); // Додайте цей рядок
	if (!customerId || !productId) return [];
	try {
		const snapshot = await firebase
			.database()
			.ref(`usedMaterialsHistory/${customerId}/${productId}`)
			.once("value");

		const data = snapshot.val();
		if (!data) return [];

		// Пряме повернення масиву даних для await у компоненті
		return Object.values(data).sort((a, b) => a.createdAt - b.createdAt);
	} catch (error) {
		console.error("Error in fetchUsedMaterialsHistory:", error);
		return [];
	}
};

// Функція архівації
export const archiveAllDataMonthly = () => {
	return async (dispatch, getState) => {
		try {
			const date = new Date();

			// Формуємо основний ключ місяця: "2026-03"
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

			// Додаємо точний час для унікальності запису: "02_14-30" (день_години-хвилини)
			const timeStamp = `${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;

			const db = firebase.database();

			// Отримуємо поточний стан продуктів (складу) з Redux
			const currentStock = getState().products.products;

			const paths = {
				invoices: "invoices",
				invoicesSummary: "invoicesSummary",
				usedMaterials: "usedMaterials",
				usedMaterialsHistory: "usedMaterialsHistory"
			};

			const archiveData = {};

			// Збираємо дані з усіх гілок паралельно
			await Promise.all(Object.keys(paths).map(async (key) => {
				const snapshot = await db.ref(paths[key]).once('value');
				archiveData[key] = snapshot.val();
			}));

			// Записуємо в архів за шляхом: archive/2026-03/02_14-30
			// Тепер кожен запис — це окрема папка всередині місяця
			await db.ref(`archive/${monthKey}/${timeStamp}`).set({
				archivedAt: date.toISOString(), // Додаємо точну дату для історії
				invoicesHistory: archiveData.invoices || {},
				invoicesSummaryHistory: archiveData.invoicesSummary || {},
				usedMaterialsHistory: archiveData.usedMaterials || {},
				usedMaterialsHistoryHistory: archiveData.usedMaterialsHistory || {},
				stockAtThatTime: currentStock || {}
			});

			dispatch({ type: ARCHIVE_DATA_SUCCESS });
			alert(`✅ Архів створено: archive/${monthKey}/${timeStamp}`);

		} catch (error) {
			console.error("Помилка архівації:", error);
			alert("Помилка при створенні архіву: " + error.message);
		}
	};
};
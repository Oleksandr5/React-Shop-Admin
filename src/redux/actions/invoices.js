import firebase from "firebase";

import {
	UPDATE_INVOICES,
	UPDATE_INVOICES_RETURN,
	UPDATE_INVOICES_SUMMARY,
	UPDATE_INVOICES_SUMMARY_RETURN,
	SET_NOTIFICATIONS,
	SET_USED_MATERIALS,
	ARCHIVE_DATA_SUCCESS,
	UPDATE_USED_MATERIAL_SUCCESS
} from "./actionTypes";

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

export function fetchInvoicesReturn(customerId) {
	return async (dispatch) => {
		try {
			const snapshot = await firebase.database().ref(`invoicesReturn/${customerId}`).once("value");
			const data = snapshot.val();
			dispatch({
				type: UPDATE_INVOICES_RETURN,
				payload: data ? Object.values(data) : []
			});
		} catch (error) {
			console.log("Error fetching invoices return:", error);
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

export function fetchInvoicesSummaryReturn(customerId) {
	return async (dispatch) => {
		try {
			const snapshot = await firebase.database().ref(`invoicesSummaryReturn/${customerId}`).once("value");
			const data = snapshot.val();
			dispatch({
				type: UPDATE_INVOICES_SUMMARY_RETURN,
				payload: data ? Object.keys(data).map(key => ({
					...data[key],
					productId: data[key].productId || Number(key)
				})) : []
			});
		} catch (error) {
			console.log("Error fetching invoices summary return:", error);
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

		// Формуємо правильний ID для Firebase
		// Якщо тип 'return', додаємо приписку '_return', інакше залишаємо просто число
		const firebaseId = order.type === 'return'
			? `${order.orderId}_return`
			: order.orderId;

		await firebase
			.database()
			.ref(`orderNotifications/${order.customerId}/${firebaseId}`)
			.remove();

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

// export const addUsedMaterial = (customerId, productId, value = null, agreement = null, rollbackToValue = null) => async (dispatch) => {
// 	try {
// 		const dbRef = firebase.database().ref(`usedMaterials/${customerId}/${productId}`);
// 		const historyRef = firebase.database().ref(`usedMaterialsHistory/${customerId}/${productId}`);

// 		if (rollbackToValue !== null) {
// 			// Логіка відкату (Rollback)
// 			const snapshot = await historyRef.once("value");
// 			const history = snapshot.val() || {};
// 			const sortedHistory = Object.entries(history).sort((a, b) => a[1].createdAt - b[1].createdAt);

// 			let newTotal = 0;
// 			const updates = {};
// 			for (const [id, h] of sortedHistory) {
// 				if (newTotal + h.value <= rollbackToValue) {
// 					newTotal += h.value;
// 				} else {
// 					updates[id] = null;
// 				}
// 			}
// 			await historyRef.update(updates);
// 			await dbRef.set(newTotal);
// 		} else if (value) {
// 			// Логіка додавання
// 			const snapshot = await dbRef.once("value");
// 			const currentValue = snapshot.val() || 0;
// 			const newTotal = currentValue + Number(value);

// 			await dbRef.set(newTotal);
// 			await historyRef.push({
// 				value: Number(value),
// 				currentValue: newTotal,
// 				createdAt: firebase.database.ServerValue.TIMESTAMP,
// 				agreement
// 			});
// 		}

// 		// Оновлюємо основний стейт через існуючий екшен
// 		await dispatch(fetchUsedMaterials(customerId));
// 	} catch (error) {
// 		console.error("Error in addUsedMaterial:", error);
// 	}
// };

export const addUsedMaterial = (customerId, productId, value = null, agreement = null, rollbackToValue = null, editId = null, comment = null) => async (dispatch) => {
	try {
		const dbRef = firebase.database().ref(`usedMaterials/${customerId}/${productId}`);
		const historyRef = firebase.database().ref(`usedMaterialsHistory/${customerId}/${productId}`);

		// --- ЛОГІКА ВІДКАТУ АБО РЕДАГУВАННЯ (Повний перерахунок) ---
		if (rollbackToValue !== null || editId !== null) {
			const snapshot = await historyRef.once("value");
			const history = snapshot.val() || {};

			// Сортуємо історію за часом створення
			const entries = Object.entries(history).sort((a, b) => a[1].createdAt - b[1].createdAt);

			let runningTotal = 0;
			const updates = {};

			for (const [id, data] of entries) {
				let itemValue = Number(data.value);

				// Якщо ми редагуємо конкретний запис
				if (id === editId) {
					itemValue = Number(value);
					updates[`${id}/value`] = itemValue;
					if (agreement) updates[`${id}/agreement`] = agreement;
					// Виправити: Додаємо оновлення коментаря при редагуванні існуючого запису
					if (comment !== null) updates[`${id}/comment`] = comment;
				}

				// Логіка ВІДКАТУ (твоя стара логіка): видаляємо все, що перевищує ліміт
				if (rollbackToValue !== null && (runningTotal + itemValue) > Number(rollbackToValue)) {
					updates[id] = null; // Видаляємо запис
				} else {
					// Оновлюємо накопичувальну суму (щоб історія була красивою)
					runningTotal += itemValue;
					updates[`${id}/currentValue`] = runningTotal;
				}
			}

			// Застосовуємо всі зміни в історії одним махом
			await historyRef.update(updates);
			// Оновлюємо головний лічильник
			await dbRef.set(runningTotal);

			// --- ЛОГІКА ДОДАВАННЯ (Нова, безпечна транзакція) ---
		} else if (value !== null) {
			const numericValue = Number(value);

			// Транзакція гарантує, що якщо 2 майстри натиснуть "Додати" одночасно,
			// дані не загубляться і не перезапишуться помилково.
			const { snapshot } = await dbRef.transaction((current) => {
				return (current || 0) + numericValue;
			});

			const newTotal = snapshot.val();

			// Додаємо новий запис в історію
			await historyRef.push({
				value: numericValue,
				currentValue: newTotal,
				createdAt: firebase.database.ServerValue.TIMESTAMP,
				agreement,
				comment: comment || "" // Обов'язково записуємо коментар
			});
		}

		// Оновлюємо Redux-стор
		await dispatch(fetchUsedMaterials(customerId));
	} catch (error) {
		console.error("Помилка в addUsedMaterial:", error);
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
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			const timeStamp = `${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;

			const db = firebase.database();
			const currentStock = getState().products.products;

			// Визначаємо всі шляхи, які потрібно зчитати з бази
			const paths = {
				invoices: "invoices",
				invoicesReturn: "invoicesReturn",
				invoicesSummary: "invoicesSummary",
				invoicesSummaryReturn: "invoicesSummaryReturn",
				usedMaterials: "usedMaterials",
				usedMaterialsHistory: "usedMaterialsHistory",
				orderNotifications: "orderNotifications",
				remainingMaterials: "remainingMaterials",
				remainingMaterialsStart: "remainingMaterialsStart",
				// ✅ НОВІ ГІЛКИ:
				invoiceStock: "invoiceStock",
				orders: "orders",
				ordersHistory: "ordersHistory"
			};

			const archiveData = {};

			// Збираємо дані паралельно для швидкості
			await Promise.all(Object.keys(paths).map(async (key) => {
				const snapshot = await db.ref(paths[key]).once('value');
				archiveData[key] = snapshot.val();
			}));

			// Записуємо все в папку архіву
			await db.ref(`archive/${monthKey}/${timeStamp}`).set({
				archivedAt: date.toISOString(),
				stockAtThatTime: currentStock || [],

				// Історія інвойсів та матеріалів
				invoicesHistory: archiveData.invoices || {},
				invoicesReturnHistory: archiveData.invoicesReturn || {},
				invoicesSummaryHistory: archiveData.invoicesSummary || {},
				invoicesSummaryReturnHistory: archiveData.invoicesSummaryReturn || {},
				usedMaterialsHistory: archiveData.usedMaterials || {},
				usedMaterialsHistoryHistory: archiveData.usedMaterialsHistory || {},

				// Стан звітів та сповіщення
				orderNotificationsHistory: archiveData.orderNotifications || {},
				remainingMaterialsHistory: archiveData.remainingMaterials || {},
				remainingMaterialsStartHistory: archiveData.remainingMaterialsStart || {},

				// ✅ ЗАПИС НОВИХ ГІЛОК:
				invoiceStockHistory: archiveData.invoiceStock || [],
				ordersHistory: archiveData.orders || [],
				ordersHistoryArchive: archiveData.ordersHistory || []
			});

			dispatch({ type: ARCHIVE_DATA_SUCCESS });
			alert(`✅ Повний системний архів створено: archive/${monthKey}/${timeStamp}`);

		} catch (error) {
			console.error("Помилка архівації:", error);
			alert("Помилка при створенні архіву: " + error.message);
		}
	};
};

export const updateUsedMaterialLocal = (workerId, productId, value) => ({
	type: UPDATE_USED_MATERIAL_SUCCESS,
	payload: { workerId, productId, value }
});
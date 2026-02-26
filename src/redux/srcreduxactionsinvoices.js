import firebase from "firebase";

// 1️⃣ Константи дій
export const UPDATE_INVOICES = "UPDATE_INVOICES";
export const UPDATE_INVOICES_SUMMARY = "UPDATE_INVOICES_SUMMARY";
export const SET_NOTIFICATIONS = "SET_NOTIFICATIONS";
export const SET_USED_MATERIALS = "SET_USED_MATERIALS";


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

export function fetchInvoicesSummary(customerId) {
	return async (dispatch) => {
		try {
			const snapshot = await firebase.database().ref(`invoicesSummary/${customerId}`).once("value");
			const data = snapshot.val();
			console.log("Fetched raw invoicesSummary from Firebase:", data)
			dispatch({
				type: UPDATE_INVOICES_SUMMARY,
				payload: data ? Object.values(data) : []
			});
			console.log("Fetched invoices summary:", data);
		} catch (error) {
			console.log("Error fetching invoices summary:", error);
		}
	};
}

export function fetchOrderNotifications(selectedUser) {
	return async (dispatch, getState) => {
		try {
			const authAdmin = window.localStorage.getItem("authAdmin");
			const idThisCustomers = window.localStorage.getItem("idThisCustomers");

			const isAdmin =
				(authAdmin === "true") ||
				["139", "155", "156"].includes(idThisCustomers);

			let allNotifications = [];

			if (isAdmin) {
				// адмін: беремо notifications всіх клієнтів
				const snapshot = await firebase.database().ref('orderNotifications').once("value");
				const data = snapshot.val();

				if (data) {
					Object.values(data).forEach(customerNotifications => {
						allNotifications.push(...Object.values(customerNotifications));
					});
				}
			} else if (selectedUser) {
				// звичайний користувач: тільки свої
				const snapshot = await firebase.database().ref(`orderNotifications/${selectedUser}`).once("value");
				const data = snapshot.val();
				if (data) {
					allNotifications = Object.values(data);
				}
			}

			// сортуємо за createdAt (останні зверху)
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


export function addUsedMaterial(customerId, productId, value = null, agreement = null, rollbackToValue = null) {
	return async (dispatch) => {
		try {
			const ref = firebase.database().ref(`usedMaterials/${customerId}/${productId}`);
			const historyRef = firebase.database().ref(`usedMaterialsHistory/${customerId}/${productId}`);

			if (rollbackToValue !== null) {
				// Відкат до конкретного значення
				const snapshot = await historyRef.once("value");
				const history = snapshot.val() || {};
				const sortedHistory = Object.entries(history).sort((a, b) => a[1].createdAt - b[1].createdAt);

				let newTotal = 0;
				const updates = {};

				for (const [id, h] of sortedHistory) {
					if (newTotal + h.value <= rollbackToValue) {
						newTotal += h.value;
					} else {
						updates[id] = null; // видаляємо записи після rollback
					}
				}

				await historyRef.update(updates);
				await ref.set(newTotal);

			} else if (value) {
				// Миттєве додавання нового запису
				const snapshot = await ref.once("value");
				const currentValue = snapshot.val() || 0;
				const newTotal = currentValue + value;
				await ref.set(newTotal);

				// Додаємо історію з currentValue
				await historyRef.push({
					value,                // що списано
					currentValue: newTotal, // залишок після списання
					createdAt: firebase.database.ServerValue.TIMESTAMP,
					agreement
				});
			}

			// Оновлення Redux state
			if (dispatch) await dispatch(fetchUsedMaterials(customerId));

		} catch (error) {
			console.error("Error in addUsedMaterial:", error);
		}
	};
}


export function fetchUsedMaterialsHistory(customerId, productId) {
	return async () => {
		if (!customerId || !productId) return [];

		const snapshot = await firebase
			.database()
			.ref(`usedMaterialsHistory/${customerId}/${productId}`)
			.once("value");

		const data = snapshot.val();
		if (!data) return [];

		return Object.values(data).sort(
			(a, b) => a.createdAt - b.createdAt
		);
	};
}

import firebase from "firebase";

import {
	UPDATE_INVOICES,
	UPDATE_ALL_INVOICES,
	UPDATE_INVOICES_RETURN,
	UPDATE_ALL_INVOICES_RETURN,
	UPDATE_INVOICES_SUMMARY,
	UPDATE_INVOICES_SUMMARY_RETURN,
	SET_NOTIFICATIONS,
	SET_USED_MATERIALS,
	SET_USED_MATERIALS_HISTORY,
	ARCHIVE_DATA_SUCCESS,
	UPDATE_USED_MATERIAL_SUCCESS,
	SET_REMAINING_MATERIALS_START,
	SET_ALL_USED_MATERIALS_HISTORY
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

export function fetchAllInvoices() {
	return async (dispatch) => {
		try {
			// Беремо ВСІ інвойси з бази
			const snapshot = await firebase.database().ref(`invoices`).once("value");
			const data = snapshot.val() || {};

			// Оскільки в базі вони лежать як {userId: {invoiceId: {...}}}, 
			// нам треба перетворити це на один плоский масив для пошуку
			const allList = [];
			Object.keys(data).forEach(userId => {
				Object.values(data[userId]).forEach(inv => {
					allList.push({ ...inv, customerId: userId });
				});
			});

			dispatch({
				type: UPDATE_ALL_INVOICES,
				payload: allList
			});

			console.log('allList', allList)
		} catch (error) {
			console.log("Error fetching ALL invoices:", error);
		}
	};
}

export function fetchAllInvoicesReturn() {
	return async (dispatch) => {
		try {
			const snapshot = await firebase.database().ref(`invoicesReturn`).once("value");
			const data = snapshot.val() || {};

			const allReturns = [];
			Object.keys(data).forEach(userId => {
				Object.values(data[userId]).forEach(ret => {
					allReturns.push({ ...ret, customerId: userId });
				});
			});

			console.log('allReturns', allReturns)

			dispatch({
				type: UPDATE_ALL_INVOICES_RETURN,
				payload: allReturns
			});
		} catch (error) {
			console.log("Error fetching ALL returns:", error);
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
export const archiveAllDataMonthly = async () => {
	try {
		// 1. Отримуємо повний зліпок бази (Стиль v8: .ref().once('value'))
		const rootRef = firebase.database().ref("/");
		const snapshot = await rootRef.once("value");
		const data = snapshot.val();

		if (!data) {
			console.warn("Дані в базі відсутні");
			return;
		}

		const {
			invoices = {},
			invoicesReturn = {},
			invoicesSummary = {},
			invoicesSummaryReturn = {},
			usedMaterials = {},
			usedMaterialsHistory = {},
			orderNotifications = {},
			remainingMaterials = {},
			remainingMaterialsStart = {},
			invoiceStock = [],
			products = [],
			ordersHistory = [],
			settings = {}
		} = data;

		console.log('data_1', data);

		const clientIds = settings?.clientsForWorkOrders || [];
		const productIds = settings?.productsForWorkOrders || [];

		// --- ФОРМУВАННЯ ШЛЯХУ ---
		const date = new Date();
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const timeStamp = `${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;

		const archivePath = `archive/${monthKey}/${timeStamp}`;

		const newRemainingMaterialsStart = {};

		// --- 2. ЛОГІКА РОЗРАХУНКУ ЗАЛИШКІВ ---
		clientIds.forEach((cid) => {
			newRemainingMaterialsStart[cid] = {};
			productIds.forEach((pid) => {
				const factualValue = remainingMaterials?.[cid]?.[pid];
				if (factualValue !== undefined && factualValue !== null && factualValue !== "") {
					newRemainingMaterialsStart[cid][pid] = Number(factualValue);
				} else {
					const start = Number(remainingMaterialsStart?.[cid]?.[pid] || 0);
					const added = Number(invoicesSummary?.[cid]?.[pid]?.totalQuantity || 0);
					const returned = Number(invoicesSummaryReturn?.[cid]?.[pid]?.totalQuantity || 0);
					const spent = Number(usedMaterials?.[cid]?.[pid] || 0);

					let calc = start + added - returned - spent;
					newRemainingMaterialsStart[cid][pid] = calc < 0 ? 0 : calc;
				}
			});
		});

		// --- 3. РОЗДІЛЕННЯ ORDERS HISTORY ---
		const completedOrdersHistory = [];
		const activeOrdersHistory = [];

		if (Array.isArray(ordersHistory)) {
			ordersHistory.forEach((customerData) => {
				const completedCarts = [];
				const activeCarts = [];
				const completedStock = [];
				const activeStock = [];

				if (customerData.cartsHistory) {
					customerData.cartsHistory.forEach((item) => {
						item.status === "completed" ? completedCarts.push(item) : activeCarts.push(item);
					});
				}
				if (customerData.stockHistory) {
					customerData.stockHistory.forEach((item) => {
						item.status === "completed" ? completedStock.push(item) : activeStock.push(item);
					});
				}

				if (completedCarts.length > 0 || completedStock.length > 0) {
					completedOrdersHistory.push({
						...customerData,
						cartsHistory: completedCarts,
						stockHistory: completedStock
					});
				}
				if (activeCarts.length > 0 || activeStock.length > 0) {
					activeOrdersHistory.push({
						...customerData,
						cartsHistory: activeCarts,
						stockHistory: activeStock
					});
				}
			});
		}

		// --- 4. ПАКЕТНЕ ОНОВЛЕННЯ БАЗИ (Стиль v8: об'єкт updates) ---
		const updates = {};

		// ЗАПИС В АРХІВ
		updates[`${archivePath}/archivedAt`] = date.toISOString();
		updates[`${archivePath}/stockAtThatTime`] = products;
		updates[`${archivePath}/invoicesHistory`] = invoices;
		updates[`${archivePath}/invoicesReturnHistory`] = invoicesReturn;
		updates[`${archivePath}/invoicesSummaryHistory`] = invoicesSummary;
		updates[`${archivePath}/invoicesSummaryReturnHistory`] = invoicesSummaryReturn;
		updates[`${archivePath}/usedMaterialsHistory`] = usedMaterials;
		updates[`${archivePath}/usedMaterialsHistoryHistory`] = usedMaterialsHistory;
		updates[`${archivePath}/orderNotificationsHistory`] = orderNotifications;
		updates[`${archivePath}/remainingMaterialsHistory`] = remainingMaterials;
		updates[`${archivePath}/remainingMaterialsStartHistory`] = remainingMaterialsStart;
		updates[`${archivePath}/invoiceStockHistory`] = invoiceStock;
		updates[`${archivePath}/ordersHistoryArchive`] = completedOrdersHistory;

		// ОНОВЛЕННЯ РОБОЧИХ ГІЛОК
		updates["ordersHistory"] = activeOrdersHistory;

		// Ці рядки встановлюють null, що очищує "живі" гілки для нового місяця.
		// Якщо ти хочеш залишити старі дані в робочих гілках, просто закоментуй ці рядки:
		updates["invoices"] = null;
		updates["invoicesReturn"] = null;
		updates["invoicesSummary"] = null;
		updates["invoicesSummaryReturn"] = null;
		updates["usedMaterials"] = null;
		updates["usedMaterialsHistory"] = null;
		updates["orderNotifications"] = null;
		updates["remainingMaterials"] = null;
		// updates["invoiceStock"] = null;

		// Встановлюємо новий старт
		updates["remainingMaterialsStart"] = newRemainingMaterialsStart;

		// Виконуємо оновлення (Стиль v8)
		await firebase.database().ref().update(updates);

		console.log(`✅ Системний архів створено (v8): ${archivePath}`);

		return true;

	} catch (error) {
		console.error("Помилка при виконанні архівації:", error);
	}
};

// Можливо треба замінити на цю версію з транзакцією:

// export const archiveAllDataMonthly = async () => {
// 	const rootRef = firebase.database().ref("/");

// 	try {
// 		// Використовуємо транзакцію для гарантії цілісності даних
// 		const result = await rootRef.transaction((currentData) => {
// 			// 1. ПЕРЕВІРКА НАЯВНОСТІ ДАНИХ (замість snapshot.val())
// 			if (!currentData) {
// 				console.warn("Дані в базі відсутні");
// 				return currentData;
// 			}

// 			// Деструктуризація з дефолтними значеннями
// 			const {
// 				invoices = {},
// 				invoicesReturn = {},
// 				invoicesSummary = {},
// 				invoicesSummaryReturn = {},
// 				usedMaterials = {},
// 				usedMaterialsHistory = {},
// 				orderNotifications = {},
// 				remainingMaterials = {},
// 				remainingMaterialsStart = {},
// 				invoiceStock = [],
// 				products = [],
// 				ordersHistory = [],
// 				settings = {}
// 			} = currentData;

// 			const clientIds = settings?.clientsForWorkOrders || [];
// 			const productIds = settings?.productsForWorkOrders || [];

// 			// --- ФОРМУВАННЯ ШЛЯХУ ---
// 			const date = new Date();
// 			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
// 			const timeStamp = `${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
// 			const archivePath = `archive/${monthKey}/${timeStamp}`;

// 			// --- 2. ЛОГІКА РОЗРАХУНКУ ЗАЛИШКІВ ---
// 			const newRemainingMaterialsStart = {};
// 			clientIds.forEach((cid) => {
// 				newRemainingMaterialsStart[cid] = {};
// 				productIds.forEach((pid) => {
// 					const factualValue = remainingMaterials?.[cid]?.[pid];
// 					if (factualValue !== undefined && factualValue !== null && factualValue !== "") {
// 						newRemainingMaterialsStart[cid][pid] = Number(factualValue);
// 					} else {
// 						const start = Number(remainingMaterialsStart?.[cid]?.[pid] || 0);
// 						const added = Number(invoicesSummary?.[cid]?.[pid]?.totalQuantity || 0);
// 						const returned = Number(invoicesSummaryReturn?.[cid]?.[pid]?.totalQuantity || 0);
// 						const spent = Number(usedMaterials?.[cid]?.[pid] || 0);

// 						let calc = start + added - returned - spent;
// 						newRemainingMaterialsStart[cid][pid] = calc < 0 ? 0 : calc;
// 					}
// 				});
// 			});

// 			// --- 3. РОЗДІЛЕННЯ ORDERS HISTORY (з перевіркою на об'єкт/масив) ---
// 			const completedOrdersHistory = [];
// 			const activeOrdersHistory = [];

// 			// Безпечно перетворюємо ordersHistory у масив для обробки
// 			const historyArray = Array.isArray(ordersHistory)
// 				? ordersHistory
// 				: Object.values(ordersHistory || {});

// 			historyArray.forEach((customerData) => {
// 				if (!customerData) return;

// 				const completedCarts = (customerData.cartsHistory || []).filter(item => item.status === "completed");
// 				const activeCarts = (customerData.cartsHistory || []).filter(item => item.status !== "completed");

// 				const completedStock = (customerData.stockHistory || []).filter(item => item.status === "completed");
// 				const activeStock = (customerData.stockHistory || []).filter(item => item.status !== "completed");

// 				if (completedCarts.length > 0 || completedStock.length > 0) {
// 					completedOrdersHistory.push({
// 						...customerData,
// 						cartsHistory: completedCarts,
// 						stockHistory: completedStock
// 					});
// 				}
// 				if (activeCarts.length > 0 || activeStock.length > 0) {
// 					activeOrdersHistory.push({
// 						...customerData,
// 						cartsHistory: activeCarts,
// 						stockHistory: activeStock
// 					});
// 				}
// 			});

// 			// --- 4. ОНОВЛЕННЯ СТРУКТУРИ ДАНИХ ПЕРЕД ЗБЕРЕЖЕННЯМ ---

// 			// Створюємо шлях в архіві, якщо його немає
// 			if (!currentData.archive) currentData.archive = {};
// 			if (!currentData.archive[monthKey]) currentData.archive[monthKey] = {};

// 			// Записуємо архівні дані
// 			currentData.archive[monthKey][timeStamp] = {
// 				archivedAt: date.toISOString(),
// 				stockAtThatTime: products,
// 				invoicesHistory: invoices,
// 				invoicesReturnHistory: invoicesReturn,
// 				invoicesSummaryHistory: invoicesSummary,
// 				invoicesSummaryReturnHistory: invoicesSummaryReturn,
// 				usedMaterialsHistory: usedMaterials,
// 				usedMaterialsHistoryHistory: usedMaterialsHistory,
// 				orderNotificationsHistory: orderNotifications,
// 				remainingMaterialsHistory: remainingMaterials,
// 				remainingMaterialsStartHistory: remainingMaterialsStart,
// 				invoiceStockHistory: invoiceStock,
// 				ordersHistoryArchive: completedOrdersHistory
// 			};

// 			// Очищуємо робочі гілки (аналог ваших updates = null)
// 			currentData.ordersHistory = activeOrdersHistory;
// 			currentData.invoices = null;
// 			currentData.invoicesReturn = null;
// 			currentData.invoicesSummary = null;
// 			currentData.invoicesSummaryReturn = null;
// 			currentData.usedMaterials = null;
// 			currentData.usedMaterialsHistory = null;
// 			currentData.orderNotifications = null;
// 			currentData.remainingMaterials = null;
// 			currentData.remainingMaterialsStart = newRemainingMaterialsStart;

// 			// Повертаємо змінений об'єкт для фіксації транзакції
// 			return currentData;
// 		});

// 		if (result.committed) {
// 			console.log("✅ Архів успішно створено та дані оновлено");
// 			return true;
// 		} else {
// 			console.warn("❌ Транзакцію не було зафіксовано");
// 			return false;
// 		}

// 	} catch (error) {
// 		console.error("Критична помилка при архівації:", error);
// 		throw error;
// 	}
// };

export const updateUsedMaterialLocal = (workerId, productId, value) => ({
	type: UPDATE_USED_MATERIAL_SUCCESS,
	payload: { workerId, productId, value }
});

export function fetchUsedMaterialsHistoryAction(customerId) {
	return async (dispatch) => {
		try {
			console.log("--- [Action Start] fetchUsedMaterialsHistoryAction для ID:", customerId);
			if (!customerId) {
				console.warn("--- [Action] ПЕРЕРВАНО: customerId відсутній");
				return;
			}

			const snapshot = await firebase
				.database()
				.ref(`usedMaterialsHistory/${customerId}`)
				.once("value");

			const data = snapshot.val();
			console.log("--- [Action Success] Дані з Firebase отримано:", data);

			dispatch({
				type: SET_USED_MATERIALS_HISTORY,
				payload: data || {}
			});
			console.log("--- [Action Dispatch] SET_USED_MATERIALS_HISTORY виконано");
			// ОБОВ'ЯЗКОВО ПОВЕРТАЄМО ДАНІ АБО TRUE
			return data || {};
		} catch (error) {
			console.error("--- [Action Error] Помилка завантаження історії:", error);
			console.log("Error fetching full used materials history:", error);
		}
	};
}

export function fetchAllUsedMaterialsHistoryAction() {
	return async (dispatch) => {
		try {
			const snapshot = await firebase.database().ref(`usedMaterialsHistory`).once("value");
			const data = snapshot.val();
			console.log('data_2', data);
			dispatch({
				type: SET_ALL_USED_MATERIALS_HISTORY, // НОВИЙ ТИП ТУТ
				payload: data || {}
			});

			return data || {};
		} catch (error) {
			console.error("Помилка завантаження всієї історії:", error);
		}
	};
}

// Екшен для запису в стор
export const setRemainingMaterialsStart = (data) => ({
	type: SET_REMAINING_MATERIALS_START,
	payload: data
});

// Асинхронний екшен для завантаження з Firebase (Thunk)
export const fetchRemainingMaterialsStart = (workerId) => {
	console.log("FETCHing for workerId:", workerId); // Що тут приходить?
	return (dispatch) => {
		const db = firebase.database();
		db.ref(`remainingMaterialsStart/${workerId}`).on('value', (snapshot) => {
			const data = snapshot.val() || {};
			dispatch(setRemainingMaterialsStart(data));
		});
	};
};
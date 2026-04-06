import {
	UPDATE_INVOICES,
	UPDATE_ALL_INVOICES,
	UPDATE_INVOICES_RETURN,
	UPDATE_ALL_INVOICES_RETURN,
	UPDATE_INVOICES_SUMMARY,
	UPDATE_INVOICES_SUMMARY_RETURN,
	SET_NOTIFICATIONS,
	SET_USED_MATERIALS,
	ARCHIVE_DATA_SUCCESS,
	UPDATE_USED_MATERIAL_SUCCESS,
	SET_USED_MATERIALS_HISTORY,
	SET_REMAINING_MATERIALS_START,
	SET_ALL_USED_MATERIALS_HISTORY
} from "../actions/actionTypes";

const initialState = {
	invoices: [],
	invoicesReturn: [],
	allInvoices: [],
	allInvoicesReturn: [],
	summary: [],
	summaryReturn: [],
	notifications: [],
	usedMaterials: {},
	lastArchived: null,
	usedMaterialsHistory: {},
	allUsedMaterialsHistory: {},
	remainingMaterialsStart: {},
	loading: false
};

export default function invoicesReducer(state = initialState, action) {
	console.log("REDUCER RECEIVE ACTION:", action.type); // ДОДАЙТЕ ЦЕ
	switch (action.type) {
		case UPDATE_INVOICES:
			return {
				...state,
				invoices: action.payload
			};

		case UPDATE_INVOICES_RETURN:
			return {
				...state,
				invoicesReturn: action.payload
			};

		case UPDATE_ALL_INVOICES:
			return {
				...state,
				allInvoices: action.payload
			};

		case UPDATE_ALL_INVOICES_RETURN:
			return {
				...state,
				allInvoicesReturn: action.payload
			};

		case UPDATE_INVOICES_SUMMARY:
			return {
				...state,
				summary: action.payload
			};

		case UPDATE_INVOICES_SUMMARY_RETURN:
			return {
				...state,
				summaryReturn: action.payload
			};

		case SET_NOTIFICATIONS:
			return {
				...state,
				notifications: action.payload
			};

		case SET_USED_MATERIALS:
			return {
				...state,
				usedMaterials: action.payload
			};

		case ARCHIVE_DATA_SUCCESS:
			return {
				...state,
				lastArchived: new Date().toISOString()
			};

		case UPDATE_USED_MATERIAL_SUCCESS:
			const { productId, value } = action.payload;
			return {
				...state,
				usedMaterials: {
					...state.usedMaterials,
					[String(productId)]: Number(value) // Оновлюємо прямо в корені
				}
			};

		case SET_USED_MATERIALS_HISTORY:
			return {
				...state,
				usedMaterialsHistory: action.payload
			};

		case SET_ALL_USED_MATERIALS_HISTORY:
			return {
				...state,
				allUsedMaterialsHistory: action.payload
			};

		case SET_REMAINING_MATERIALS_START:
			// Дістаємо ID з глобального вікна
			// const checkId = Number(window.currentDiagnosticId);
			// const isTestUser = checkId === 7 || checkId === 155;

			// if (!isTestUser) {
			// 	alert(`📥 ПЕРЕВІРКА 4 (Reducer):\nДані прийшли в редьюсер.\nPayload customerId=${checkId}: ${JSON.stringify(action.payload)}`);

			// 	if (!action.payload || Object.keys(action.payload).length === 0) {
			// 		alert("⚠️ УВАГА (Reducer): Payload порожній або null.");
			// 	}
			// }
			return {
				...state,
				remainingMaterialsStart: action.payload
			};

		default:
			return state;
	}
}

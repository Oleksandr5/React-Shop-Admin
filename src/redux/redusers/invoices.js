import {
	UPDATE_INVOICES,
	UPDATE_INVOICES_RETURN,
	UPDATE_INVOICES_SUMMARY,
	UPDATE_INVOICES_SUMMARY_RETURN,
	SET_NOTIFICATIONS,
	SET_USED_MATERIALS,
	ARCHIVE_DATA_SUCCESS,
	UPDATE_USED_MATERIAL_SUCCESS,
	SET_USED_MATERIALS_HISTORY,
	SET_REMAINING_MATERIALS_START
} from "../actions/actionTypes";

const initialState = {
	invoices: [],
	invoicesReturn: [],
	summary: [],
	summaryReturn: [],
	notifications: [],
	usedMaterials: {},
	lastArchived: null,
	usedMaterialsHistory: {},
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

		case SET_REMAINING_MATERIALS_START:
			return {
				...state,
				remainingMaterialsStart: action.payload
			};

		default:
			return state;
	}
}

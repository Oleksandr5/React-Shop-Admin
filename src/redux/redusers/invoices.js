import {
	UPDATE_INVOICES, UPDATE_INVOICES_SUMMARY, SET_NOTIFICATIONS,
	SET_USED_MATERIALS, ARCHIVE_DATA_SUCCESS, UPDATE_USED_MATERIAL_SUCCESS
} from "../actions/invoices"; // шлях під твій проект

const initialState = {
	invoices: [],
	summary: [],
	notifications: [],
	usedMaterials: {},
	lastArchived: null,
	loading: false
};

export default function invoicesReducer(state = initialState, action) {
	switch (action.type) {
		case UPDATE_INVOICES:
			return {
				...state,
				invoices: action.payload
			};

		case UPDATE_INVOICES_SUMMARY:
			return {
				...state,
				summary: action.payload
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

		default:
			return state;
	}
}

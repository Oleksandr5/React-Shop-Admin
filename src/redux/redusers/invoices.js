import { UPDATE_INVOICES, UPDATE_INVOICES_SUMMARY, SET_NOTIFICATIONS } from "../actions/invoices"; // шлях під твій проект

const initialState = {
	invoices: [],
	summary: [],
	notifications: [],
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

		default:
			return state;
	}
}

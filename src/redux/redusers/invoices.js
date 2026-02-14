import { UPDATE_INVOICES, UPDATE_INVOICES_SUMMARY } from "../actions/invoices"; // шлях під твій проект

const initialState = {
	invoices: [],
	summary: [],
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

		default:
			return state;
	}
}

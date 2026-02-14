import firebase from "firebase";

// 1️⃣ Константи дій
export const UPDATE_INVOICES = "UPDATE_INVOICES";
export const UPDATE_INVOICES_SUMMARY = "UPDATE_INVOICES_SUMMARY";

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

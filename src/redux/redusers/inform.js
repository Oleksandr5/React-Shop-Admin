import { ADD_NEW_CUSTOMER, HAS_ACCOUNT, FETCH_CUSTOMERS_DATA_SUCCESS, FETCH_CUSTOMERS_DATA_ERROR, CUSTOMER_NEXT_ID, TOGGLE_ALL_CUSTOMERS, UPDATE_CUSTOMERS, UPDATE_CUSTOMER_NAME, UPDATE_CUSTOMER_ID, UPDATE_ID_LAST_CUSTOMER, AUTH_SUCCESS, AUTH_SUCCESS_ADMIN, AUTH_LOGOUT, AUTH_LOGOUT_ADMIN, FETCH_DATE_OF_FIRST_VISIT_NEW_CUSTOMER, FETCH_QUANTITY_VISITORS, FETCH_QUANTITY_OF_DOWNLOADS } from '../actions/actionTypes'

const initialState = {
	nameShop: 'Admin',
	customers: [],
	idLastCustomer: null,
	customerId: window.localStorage.getItem('idThisCustomers') ? +window.localStorage.getItem('idThisCustomers') : window.localStorage.getItem('idThisUnKnownCustomers') ? +window.localStorage.getItem('idThisUnKnownCustomers') : null,
	customerName: window.localStorage.getItem('nameThisCustomers') ? window.localStorage.getItem('nameThisCustomers') : 'Шановний клієнт',
	hasAccount: window.localStorage.getItem('hasAccount') === 'true', // <- єдиний ключ
	checkedAll: false,
	textErrorAuth: '',
	token: null,
	authAdmin: window.localStorage.getItem('authAdmin') ? true : null,
	dateOfFirstVisitNewCustomer: null,
	quantityVisitors: null,
	quantityOfDownloads: null
}

export default function inform(state = initialState, action) {

	switch (action.type) {

		case AUTH_SUCCESS:
			return {
				...state, token: action.token
			}

		case AUTH_SUCCESS_ADMIN:
			return {
				...state, authAdmin: true
			}

		case AUTH_LOGOUT:
			return {
				...state, token: null
			}

		case AUTH_LOGOUT_ADMIN:
			return {
				...state, authAdmin: null
			}

		case FETCH_CUSTOMERS_DATA_SUCCESS:
			return {
				...state,
				customers: action.payload.customers === null ? [] : action.payload.customers,
				idLastCustomer: action.payload.idLastCustomer === null ? null : action.payload.idLastCustomer
			}
		case CUSTOMER_NEXT_ID:
			return {
				...state,
				customerId: action.payload.id,
				hasAccount: false,
				customerName: 'Шановний клієнт'
			}
		case ADD_NEW_CUSTOMER:
			return {
				...state,
				customerId: action.payload.idThisCustomers,
				customerName: action.payload.name,
				customers: action.payload.customers === null ? [] : action.payload.customers,
				hasAccount: action.payload.hasAccount
			}
		case HAS_ACCOUNT:
			return {
				...state,
				hasAccount: action.payload.hasAccount ? action.payload.hasAccount : false,
				textErrorAuth: action.payload.textErrorAuth ? action.payload.textErrorAuth : '',
				customerId: action.payload.customerId,
				customerName: action.payload.customerName ? action.payload.customerName : 'Шановний клієнт'
			}

		case FETCH_CUSTOMERS_DATA_ERROR:
			return {
				...state, error: action.error
			}

		case TOGGLE_ALL_CUSTOMERS:
			return {
				...state, checkedAll: action.status
			}

		case UPDATE_CUSTOMERS:
			return {
				...state, customers: action.customers === null ? [] : action.customers
			}

		case UPDATE_CUSTOMER_NAME:
			return {
				...state, customerName: action.name
			}

		case UPDATE_CUSTOMER_ID:
			return {
				...state, customerId: action.customerId
			}

		case UPDATE_ID_LAST_CUSTOMER:
			return {
				...state, idLastCustomer: action.idLastCustomer
			}

		case FETCH_DATE_OF_FIRST_VISIT_NEW_CUSTOMER:
			return {
				...state, dateOfFirstVisitNewCustomer: action.dateOfFirstVisitNewCustomer === null ? null : action.dateOfFirstVisitNewCustomer
			}

		case FETCH_QUANTITY_VISITORS:
			return {
				...state, quantityVisitors: action.quantityVisitors === null ? null : action.quantityVisitors
			}

		case FETCH_QUANTITY_OF_DOWNLOADS:
			return {
				...state, quantityOfDownloads: action.quantityOfDownloads === null ? null : action.quantityOfDownloads
			}

		default:
			return state
	}

}
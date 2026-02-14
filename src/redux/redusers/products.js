import { FETCH_PRODUCTS_DATA_START, FETCH_PRODUCTS_DATA_SUCCESS, FETCH_PRODUCTS_DATA_ERROR, TOGGLE_FILTER_HANDLER, MENU_CLOSE_HANDLER, ON_SELECTED_PRODUCTS, ON_SELECTED_PRODUCTS_ADMIN, RESET_FILTERS, RESET_FILTERS_ADMIN, UPDATE_IS_SUBCATEGORY, UPDATE_ORDERS, UPDATE_ORDERS_HISTORY, UPDATEPRODUCTS, UPDATE_PRODUCTS_DELETED, UPDATECATEGORIES, UPDATE_IS_ORDERS_THIS_CART, UPDATE_IS_ORDERS_HISTORY_THIS_CART, UPDATE_FILTER_PROPS, UPDATE_FILTER_PROPS_ADMIN, UPDATE_IS_QUANT_PROD_IN_DB, SET_FILTER_BY, SET_SEARCH_QUERY, SET_CURRENT_PAGE, SET_TOTAL_PRODUCTS_COUNT, CHANGE_PORTION_NUMBER } from '../actions/actionTypes'
import { UPDATE_INVOICES, UPDATE_INVOICES_SUMMARY } from '../actions/invoices';

const initialState = {
	orders: [],
	ordersHistory: [],
	products: [],
	productsDeleted: [],
	categories: [],
	isSubcategories: false,
	selectedProducts: [],
	selectedProductsAdmin: [],
	filterProps: { visibleproduct: true },
	filterPropsAdmin: { visibleproductAdmin: true },
	filterBy: 'popularity',
	searchQuery: '',
	idLastProduct: null,
	isOrdersThisCart: false,
	isQuantProdInDB: true,
	isOrdersHistoryThisCart: false,
	loading: false,
	filter: false,
	error: null,
	pageSize: 5,
	totalProductsCount: 0,
	currentPage: 1,
	portionSize: 5,
	portionNumber: 1,
	invoices: [],
	invoicesSummary: []
}

export default function products(state = initialState, action) {

	switch (action.type) {
		case FETCH_PRODUCTS_DATA_START:
			return {
				...state, loading: true
			}
		case FETCH_PRODUCTS_DATA_SUCCESS:
			return {
				...state,
				loading: false,
				categories: action.payload.categories === null ? [] : action.payload.categories,
				products: action.payload.products === null ? [] : action.payload.products,
				productsDeleted: action.payload.productsDeleted === null ? [] : action.payload.productsDeleted,
				orders: action.payload.orders === null ? [] : action.payload.orders,
				ordersHistory: action.payload.ordersHistory === null ? [] : action.payload.ordersHistory
			}
		case FETCH_PRODUCTS_DATA_ERROR:
			return {
				...state, loading: false, error: action.error
			}

		case UPDATE_IS_SUBCATEGORY:
			return {
				...state, isSubcategories: action.isSubcategories
			}

		case TOGGLE_FILTER_HANDLER:
			return {
				...state, filter: !{ ...state }.filter
			}

		case MENU_CLOSE_HANDLER:
			return {
				...state, filter: false
			}

		case RESET_FILTERS:
			return {
				...state, selectedProducts: [], filterProps: { visibleproduct: true }, filter: false, searchQuery: '', currentPage: 1
			}

		case RESET_FILTERS_ADMIN:
			return {
				...state, selectedProductsAdmin: [], filterPropsAdmin: { visibleproductAdmin: true }
			}

		case SET_FILTER_BY:
			return {
				...state, filterBy: action.val
			}
		case SET_SEARCH_QUERY:
			return {
				...state, searchQuery: action.val, totalProductsCount: action.totalProductsCount, currentPage: 1, portionNumber: 1
			}

		case ON_SELECTED_PRODUCTS:
			return {
				...state, selectedProducts: action.payload.selectedProducts, filter: false
			}

		case ON_SELECTED_PRODUCTS_ADMIN:
			return {
				...state, selectedProductsAdmin: action.payload.selectedProductsAdmin
			}

		case UPDATE_ORDERS:
			return {
				...state, orders: action.payload.orders === null ? [] : action.payload.orders
			}

		case UPDATE_ORDERS_HISTORY:
			return {
				...state, ordersHistory: action.payload.ordersHistory === null ? [] : action.payload.ordersHistory
			}

		case UPDATE_IS_ORDERS_THIS_CART:
			return {
				...state, isOrdersThisCart: action.payload.status
			}

		case UPDATE_IS_ORDERS_HISTORY_THIS_CART:
			return {
				...state, isOrdersHistoryThisCart: action.payload.status
			}

		case UPDATE_IS_QUANT_PROD_IN_DB:
			return {
				...state, isQuantProdInDB: action.payload.status
			}

		case UPDATEPRODUCTS:
			return {
				...state, products: action.products === null ? [] : action.products
			}

		case UPDATE_PRODUCTS_DELETED:
			return {
				...state, productsDeleted: action.productsDeleted === null ? [] : action.productsDeleted
			}

		case UPDATECATEGORIES:
			return {
				...state, categories: action.categories === null ? [] : action.categories
			}

		case UPDATE_FILTER_PROPS:
			return {
				...state, filterProps: action.filterProps
			}

		case UPDATE_FILTER_PROPS_ADMIN:
			return {
				...state, filterPropsAdmin: action.filterPropsAdmin
			}
		case SET_CURRENT_PAGE:
			return {
				...state, currentPage: action.currentPage
			}

		case SET_TOTAL_PRODUCTS_COUNT:
			return {
				...state, totalProductsCount: action.totalProductsCount
			}

		case CHANGE_PORTION_NUMBER:
			return {
				...state, portionNumber: action.portionNumber
			}

		/* =========================
	   🔥 INVOICES
	========================= */

		case UPDATE_INVOICES:
			return {
				...state,
				invoices: action.payload === null ? [] : action.payload
			}

		case UPDATE_INVOICES_SUMMARY:
			return {
				...state,
				invoicesSummary: action.payload === null ? [] : action.payload
			}


		default:
			return state
	}

}
import { TOGGLE_MENU_HANDLER, MENU_CLOSE_HANDLER } from '../actions/actionTypes'

const initialState = {
	menu: false,
	links: [
		{ to: '/', name: 'Головна сторінка', exact: true },
		{ to: '/auth', name: 'Вхід', exact: true },
		{ to: '/your-orders', name: 'Ваші замовлення', exact: true },
		{ to: '/invoices', name: 'Ваші накладні', exact: true }
	],
	linksAuth: [
		{ to: '/', name: 'Головна сторінка', exact: true },
		{ to: '/auth', name: 'Вхід', exact: true },
		//        {to: '/registr', name: 'Реєстрація', exact: true},        
		{ to: '/your-orders', name: 'Ваші замовлення', exact: true },
		{ to: '/switchcustomersorders', name: 'Замовлення клієнтів', exact: true },
		{ to: '/switchcustomerscarts', name: 'Кошики клієнтів', exact: true },
		{ to: '/invoices', name: 'Накладні', exact: true },
		{ to: '/customerslistedit', name: 'Список користувачів', exact: true },
		{ to: '/categorieslistedit', name: 'Список категорій', exact: true },
		{ to: '/productslistedit', name: 'Список продуктів', exact: true }
	]
}

export default function menu(state = initialState, action) {

	switch (action.type) {
		case TOGGLE_MENU_HANDLER:
			return {
				...state, menu: !{ ...state }.menu
			}
		case MENU_CLOSE_HANDLER:
			return {
				...state, menu: false
			}
		default:
			return state
	}

}
import { combineReducers } from 'redux';

import products from './redusers/products';
import menu from './redusers/menu';
import inform from './redusers/inform';
import invoices from './redusers/invoices';

export default combineReducers({
	products,
	menu,
	inform,
	invoices
});

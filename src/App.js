import React, { Component } from 'react'
import { connect } from 'react-redux'
import 'bootstrap/dist/css/bootstrap.min.css';
import Layout from './hoc/Layout/Layout'
import Auth from './containers/Auth/Auth'
import Registr from './containers/Registr/Registr'
import ProductPage from './containers/ProductPage/ProductPage'
import YourOrders from './containers/YourOrders/YourOrders'
import SwitchCustomersOrders from './containers/CustomersOrders/SwitchCustomersOrders/SwitchCustomersOrders'
import SwitchCustomersCarts from './containers/CustomersCarts/SwitchCustomersCarts/SwitchCustomersCarts'
import CustomersOrders from './containers/CustomersOrders/CustomersOrders'
import CustomersCarts from './containers/CustomersCarts/CustomersCarts'
import ProductsList from './containers/ProductsList/ProductsList'
import CustomersListEdit from './containers/CustomersListEdit/CustomersListEdit'
import ProductsListEdit from './containers/ProductsListEdit/ProductsListEdit'
import CategoriesListEdit from './containers/CategoriesListEdit/CategoriesListEdit'
import SubcategoriesListEdit from './containers/SubcategoriesListEdit/SubcategoriesListEdit'
import { Route, Switch, Redirect } from 'react-router-dom'
import InvoicesPage from "./containers/CustomersOrders/Invoices/InvoicesPage"

class App extends Component {

	render() {

		let routes = (
			<Switch>
				<Route path="/auth" component={Auth} />
				<Route path="/product" component={ProductPage} />
				<Route path="/registr" component={Registr} />
				<Route path="/your-orders" component={YourOrders} />
				<Route path="/invoices" component={InvoicesPage} />
				<Route path="/" component={ProductsList} />

				<Redirect to="/" />
			</Switch>
		)

		if (this.props.iaAuthenticatedAdmin) {
			routes = (
				<Switch>
					<Route path="/auth" component={Auth} />
					<Route path="/product" component={ProductPage} />
					<Route path="/registr" component={Registr} />

					<Route path="/your-orders" component={YourOrders} />
					<Route path="/switchcustomersorders" component={SwitchCustomersOrders} />
					<Route path="/switchcustomerscarts" component={SwitchCustomersCarts} />
					<Route path="/customers-orders" component={CustomersOrders} />
					<Route path="/customers-carts" component={CustomersCarts} />
					<Route path="/invoices" component={InvoicesPage} />

					<Route path="/customerslistedit" component={CustomersListEdit} />
					<Route path="/categorieslistedit" component={CategoriesListEdit} />
					<Route path="/subcategories" component={SubcategoriesListEdit} />
					<Route path="/productslistedit" component={ProductsListEdit} />
					<Route path="/" component={ProductsList} />

					<Redirect to="/" />
				</Switch>
			)
		}

		return (
			<Layout>
				{routes}
			</Layout>
		)
	}

}


function mapStateToProps(state) {
	return {
		iaAuthenticatedAdmin: !!state.inform.authAdmin,
		iaAuthenticated: !!state.inform.token
	}
}

export default connect(mapStateToProps, null)(App)
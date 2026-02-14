import React, { Component } from 'react'
import { connect } from 'react-redux'
import { NavLink } from 'react-router-dom'
import classes from './Layout.module.css'
import axios from '../../axios/axios-quiz'
import MenuToggle from '../../components/Navigation/MenuToggle/MenuToggle'
import Drawer from '../../components/Navigation/Drawer/Drawer'
import Cart from '../../containers/Cart/Cart'
import { toggleMenuHandler, menuCloseHandler } from '../../redux/actions/menu'
import { fetchCustomersData, addNewUnKnownCustomer } from '../../redux/actions/inform'
import { fetchProductsData } from '../../redux/actions/products'

class Layout extends Component {

	async componentDidMount() {

		this.props.fetchCustomersData()
		this.props.fetchProductsData()

		if (this.props.customerId !== null) {

			const responseCustomers = await axios.get('customers.json')

			const customers = responseCustomers.data

			const isIdThisUnKnownCustomersInDB = customers.filter(customer => customer.id === this.props.customerId)[0]

			console.log('isIdThisUnKnownCustomersInDB_componentDidMount_Layout', isIdThisUnKnownCustomersInDB)

			if (!isIdThisUnKnownCustomersInDB) {
				console.log('isNtIdThisUnKnownCustomersInDB_componentDidMount_Layout')

				window.localStorage.removeItem('idThisCustomers')
				window.localStorage.removeItem('nameThisCustomers')
				window.localStorage.removeItem('hasAccount')

				this.props.addNewUnKnownCustomer()

			}
		}

	}

	render() {

		return (
			<div className={`container-fluid ${classes.Layout}`}>
				<div className="row">
					<Drawer
						isOpen={this.props.menu}
						iconOpen="fa-times"
						onClose={this.props.menuCloseHandler}
						links={this.props.links}
						nameDrawer="Меню"
						onToggle={this.props.toggleMenuHandler}
					/>


					<div className={`container ${classes.header}`}>
						<div className={`row position-relative d-flex align-items-center justify-content-between pl-5 pl-md-3 pr-0`}>
							<MenuToggle
								onToggle={this.props.toggleMenuHandler}
								isOpen={this.props.menu}
								iconClose="fa-bars"
							/>
							<NavLink to={'/'} className="text-dark" >
								<h1 className={`mb-0 ${classes.nameShop}`} >{this.props.nameShop}</h1>
							</NavLink>
							<Cart />
						</div>
					</div>

					<main className={`container ${classes.main}`}>

						{this.props.children}

					</main>
					<div className={`container-fluid ${classes.footer}`}>
						<div className={"row"}>
							<div className={"container"}>
								<div className={`row d-flex align-items-center justify-content-between px-3`}>
									<h5 className="mb-0">Footer</h5>

									<div className={`${classes.lnIcon} d-flex align-items-center justify-content-center`}>
										<a href="https://www.linkedin.com/in/oleksandr-haliatkin/" rel="noreferrer" target="_blank"><i src="linkedin.com/in/oleksandr-haliatkin" className="fa fa-linkedin" aria-hidden="true"></i></a>
									</div>

								</div>
							</div>
						</div>
					</div>

				</div>
			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		menu: state.menu.menu,
		links: !!state.inform.authAdmin ? state.menu.linksAuth : state.menu.links,
		nameShop: state.inform.nameShop,
		customerId: state.inform.customerId,
		orders: state.products.orders,
		iaAuthenticated: !!state.inform.token
	}
}

function mapDispatchToProps(dispatch) {
	return {
		toggleMenuHandler: () => dispatch(toggleMenuHandler()),
		menuCloseHandler: () => dispatch(menuCloseHandler()),
		fetchCustomersData: () => dispatch(fetchCustomersData()),
		fetchProductsData: () => dispatch(fetchProductsData()),
		addNewUnKnownCustomer: () => dispatch(addNewUnKnownCustomer())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Layout)
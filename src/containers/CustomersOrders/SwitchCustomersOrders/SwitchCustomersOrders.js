import React, { Component } from 'react'
import classes from './SwitchCustomersOrders.module.css'
import { connect } from 'react-redux'
import { NavLink } from 'react-router-dom'
import Button from '../../../components/UI/Button/Button'
import { removeOrdersHistoryCustomer } from '../../../redux/actions/products'
import { onScroll, topFunction } from '../../../redux/actions/menu'

class SwitchCustomersOrders extends Component {

	state = {
		hasAccount: false
	}

	renderNavLink() {

		if (this.props.ordersHistory.length) {
			return this.props.ordersHistory.map(orders => {

				const thisCustomer = this.props.customers.filter(customer => customer.id === orders.customerId)[0]

				const statusInProcess = orders.cartsHistory.reverse().filter(order => order.status === "in process...")[0]
				const dateLastOrdersInProcess = statusInProcess ? statusInProcess.date : null


				return (
					<li
						key={orders.customerId}
						className={"d-flex flex-column flex-md-row justify-content-center justify-content-md-between align-items-end mr-3 border-top border-bottom"}
						id={`li_customer_orders_${orders.customerId}`}
					>
						<NavLink to={`/customers-orders/${orders.customerId}`} className={`text-dunger ${classes.navLinkOrders}`} >
							<p>Замовлення користувача <span className="text-info">{thisCustomer.name}</span> під id = <span className="text-info">{orders.customerId}</span><span className="d-block"></span> Статус: {statusInProcess ? <span><span className="text-danger">in process...</span><span className="d-block"></span>date:  <span className="text-dark">{`${dateLastOrdersInProcess} 2`}</span></span> : <span className="text-success">completed</span>}</p>

						</NavLink>
						<button className={`ml-0 mb-2 mb-md-0 ml-md-auto ${classes.btnRemove}`} onClick={() => this.props.removeOrdersHistoryCustomer(orders.customerId, 'SwitchCustomersOrders')}><i className="fa fa-times" aria-hidden="true"></i></button>
					</li>
				)
			})
		} else {
			return <li><h6 className="text-danger text-center">Клієнти ще не оформили замовлення !!!</h6></li>
		}
	}

	componentDidMount() {

	}

	render() {

		return (
			<div className={`wrapper overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.SwitchCustomersOrders}`} onScroll={this.props.onScroll} >

				<ul className={'infoAboutCustomer'}>
					{this.renderNavLink()}
				</ul>

				<Button
					type="button"
					style={{ display: 'none' }}
					id={'goToTop'}
					onClick={this.props.topFunction}
					className={`btn btn-danger ${classes.btnTop}`}
				>
					<i className="fa fa-arrow-up" aria-hidden="true"></i>
				</Button>

			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		orders: state.products.orders,
		ordersHistory: state.products.ordersHistory,
		products: state.products.products,
		customers: state.inform.customers,
		customerId: state.inform.customerId,
		customerName: state.inform.customerName,
		hasAccount: state.inform.hasAccount,
		isOrdersThisCart: state.products.isOrdersThisCart
	}
}

function mapDispatchToProps(dispatch) {
	return {
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction()),
		removeOrdersHistoryCustomer: (customerId, page) => dispatch(removeOrdersHistoryCustomer(customerId, page))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(SwitchCustomersOrders)
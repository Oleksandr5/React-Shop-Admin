import React, { Component } from 'react'
import classes from './SwitchInvoiceStock.module.css' // скопіюйте стилі з SwitchCustomersOrders
import { connect } from 'react-redux'
import { NavLink } from 'react-router-dom'
import Button from '../../../components/UI/Button/Button'
import { onScroll, topFunction } from '../../../redux/actions/menu'

class SwitchInvoiceStock extends Component {

	renderNavLink() {
		const { invoiceStock, customers } = this.props;

		if (invoiceStock && invoiceStock.length) {
			return invoiceStock.map(stockEntry => {
				// Знаходимо адміна в списку користувачів
				const thisAdmin = customers.find(c => c.id === stockEntry.customerId);
				const adminName = thisAdmin ? thisAdmin.name : `Admin ID: ${stockEntry.customerId}`;

				// Отримуємо останню накладну для відображення дати
				const lastInvoice = stockEntry.cartsHistory[stockEntry.cartsHistory.length - 1];

				return (
					<li key={stockEntry.customerId} className="d-flex justify-content-between align-items-center border-top border-bottom p-2">
						<NavLink to={`/invoice-stock/${stockEntry.customerId}`} className={classes.navLinkOrders}>
							<p className="mb-0">
								Поставки від: <span className="text-info">{adminName}</span>
								<span className="d-block small text-muted">Остання: {lastInvoice ? lastInvoice.date : '---'}</span>
							</p>
						</NavLink>
						{/* Кнопку видалення для складу краще не робити або зробити лише для SuperAdmin */}
					</li>
				)
			})
		} else {
			return <li><h6 className="text-danger text-center">Історія поставок порожня</h6></li>
		}
	}

	render() {
		return (
			<div className={`wrapper overflow-auto ${classes.SwitchInvoiceStock}`} onScroll={this.props.onScroll}>
				<h2 className="text-center my-3">Накладні складу</h2>
				<ul className={'infoAboutCustomer'}>
					{this.renderNavLink()}
				</ul>
				<Button
					type="button" id={'goToTop'}
					onClick={this.props.topFunction}
					className={`btn btn-danger ${classes.btnTop}`}
				>
					<i className="fa fa-arrow-up"></i>
				</Button>
			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		invoiceStock: state.products.invoiceStock,
		customers: state.inform.customers
	}
}

export default connect(mapStateToProps, { onScroll, topFunction })(SwitchInvoiceStock)
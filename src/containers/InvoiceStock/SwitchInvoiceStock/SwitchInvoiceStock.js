import React, { Component } from 'react'
import classes from './SwitchInvoiceStock.module.css'
import { connect } from 'react-redux'
import { NavLink } from 'react-router-dom'
import Button from '../../../components/UI/Button/Button'
import Loader from '../../../components/UI/Loader/Loader'
import { onScroll, topFunction } from '../../../redux/actions/menu'
import { fetchProductsData } from '../../../redux/actions/products'

class SwitchInvoiceStock extends Component {

	componentDidMount() {
		// Оновлюємо дані при вході на сторінку вибору
		this.props.fetchProductsData();
	}

	renderNavLink() {
		const { invoiceStock, customers } = this.props;

		// Повертаємо список накладних по клієнтах
		return (invoiceStock || []).map(stockEntry => {
			const thisAdmin = (customers || []).find(c => String(c.id) === String(stockEntry.customerId));
			const adminName = thisAdmin ? thisAdmin.name : `Адмін ID: ${stockEntry.customerId}`;

			const lastInvoice = stockEntry.cartsHistory && stockEntry.cartsHistory.length
				? stockEntry.cartsHistory[stockEntry.cartsHistory.length - 1]
				: null;

			return (
				<li key={stockEntry.customerId} className="mb-2">
					<NavLink
						to={`/invoice-stock/${stockEntry.customerId}`}
						className={`${classes.navLinkOrders} d-flex justify-content-between align-items-center border rounded p-3 bg-white shadow-sm text-decoration-none`}
					>
						<div>
							<span className="d-block font-weight-bold text-dark">
								Поставки від: <span className="text-primary">{adminName}</span>
							</span>
							<small className="text-muted">
								{lastInvoice ? `Остання накладна: ${lastInvoice.date}` : 'Історія порожня'}
							</small>
						</div>
						<i className="fa fa-chevron-right text-secondary"></i>
					</NavLink>
				</li>
			)
		})
	}

	render() {
		const { loading, invoiceStock, customers } = this.props;

		// Показуємо Loader, поки дані не завантажені
		if (loading || !customers || invoiceStock === null) {
			return <Loader />;
		}

		return (
			<div className={`wrapper ${classes.SwitchInvoiceStock}`}>
				<div
					className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.renderOrders}`}
					onScroll={this.props.onScroll}
				>
					<h2 className="text-center my-4 font-weight-bold">Накладні складу</h2>

					<div className="container">
						<ul className="list-unstyled">
							{invoiceStock.length > 0
								? this.renderNavLink()
								: <div className="alert alert-warning text-center shadow-sm">
									<h6 className="mb-0 font-italic">Архів накладних порожній</h6>
								</div>
							}
						</ul>
					</div>

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
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		invoiceStock: state.products.invoiceStock,
		customers: state.inform.customers,
		loading: state.products.loading
	}
}

function mapDispatchToProps(dispatch) {
	return {
		fetchProductsData: () => dispatch(fetchProductsData()),
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(SwitchInvoiceStock)
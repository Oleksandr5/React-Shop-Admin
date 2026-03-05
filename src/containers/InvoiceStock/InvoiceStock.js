import React, { Component } from 'react'
import classes from './InvoiceStock.module.css'
import { connect } from 'react-redux'
import Loader from '../../components/UI/Loader/Loader'
import Button from '../../components/UI/Button/Button'
import Select from '../../components/UI/Select/Select'
import { onScroll, topFunction } from '../../redux/actions/menu'
import {
	changeStatusInvoiceStock,
	fetchProductsData,
	removeInvoiceStockCustomer,
	removeInvoicesStockCustomer
} from '../../redux/actions/products'

class InvoiceStock extends Component {

	// Класичний підхід до формування опцій статусу
	optionStatusOrder(orderStatus) {
		const thisStatusOrderOptions = [
			{ text: 'in process...', value: 'in process...', className: "text-danger" },
			{ text: "completed", value: "completed", className: "text-success" }
		]

		let thisStatusOrder
		thisStatusOrderOptions.forEach((status, index) => {
			if (status.value === orderStatus) {
				thisStatusOrder = status
				thisStatusOrderOptions.splice(index, 1)
				thisStatusOrderOptions.unshift(thisStatusOrder)
			}
		})
		return thisStatusOrderOptions
	}

	// Окремий метод для рендеру карток накладних
	renderInvoicesList(invoices, customerId) {
		const { products, productsDeleted } = this.props

		return invoices.slice().reverse().map((invoice) => {
			return (
				<div
					key={invoice.invoiceStockId}
					className={`position-relative border border-primary p-3 mb-5 bg-white shadow-sm`}
				>
					<h5 className={`text-primary ${classes.h5}`}>
						Накладна №{invoice.invoiceStockId}
					</h5>
					<p className="small text-muted mb-2">Дата поставки: {invoice.date}</p>

					<h5 className={`${classes.h5}`}>Статус: &nbsp;
						<Select
							name="statusorder"
							className={`addOptionToProduct_${invoice.invoiceStockId} ${invoice.status === "in process..." ? "text-danger" : "text-success"}`}
							onChange={event => this.props.changeStatusInvoiceStock(customerId, invoice.invoiceStockId, event.target.value)}
							option={this.optionStatusOrder(invoice.status)}
						/>
					</h5>

					<div className="table-responsive mt-3">
						<table className="table table-sm table-hover">
							<thead className="thead-light">
								<tr>
									<th>Товар</th>
									<th className="text-center">Додано</th>
									<th className="text-center">На складі</th>
								</tr>
							</thead>
							<tbody>
								{invoice.cart.map(item => {
									const product = (products || []).find(p => p.id === item.id) ||
										(productsDeleted || []).find(p => p.id === item.id);

									return (
										<tr key={item.id}>
											<td className="font-weight-bold">
												{product ? product.name : `ID: ${item.id}`}
											</td>
											<td className="text-center text-primary font-weight-bold">
												+{item.quantity} шт
											</td>
											<td className="text-center">
												{product ? (
													<span className={product.quantity > 0 ? "text-success" : "text-danger"}>
														{product.quantity} шт
													</span>
												) : (
													<span className="text-muted">Видалено</span>
												)}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>

					{/* Кнопка видалення однієї накладної */}
					<button
						className="btn btn-outline-danger btn-sm position-absolute"
						style={{ top: '10px', right: '10px' }}
						onClick={() => {
							// Використовуємо `${}` для вставки номера накладної
							if (window.confirm(`Видалити накладну №${invoice.invoiceStockId}?`)) {
								this.props.removeInvoiceStockCustomer(customerId, invoice.invoiceStockId);
							}
						}}
					>
						<i className="fa fa-trash"></i>
					</button>
				</div>
			)
		})
	}

	componentDidMount() {
		this.props.fetchProductsData();
	}

	render() {



		const url = window.location.pathname;
		const customerId = +url.substring(url.lastIndexOf('/') + 1);
		const { invoiceStock, customers, loading } = this.props;
		// --- ЛОГУВАННЯ ДЛЯ ПЕРЕВІРКИ ---
		console.log('[InvoiceStock] Props:', {
			loading,
			invoiceStock,
			customerId,
			foundAdmin: (invoiceStock || []).find(s => s.customerId === customerId)
		});
		const thisCustomer = (customers || []).find(c => c.id === customerId);
		const adminData = (invoiceStock || []).find(s => s.customerId === customerId);
		const thisInvoices = adminData ? adminData.cartsHistory : null;

		return (
			loading
				? <Loader />
				: (
					<div className={`wrapper ${classes.InvoiceStock}`}>
						<div
							className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.renderOrders}`}
							onScroll={this.props.onScroll}
						>
							{/* Блок інформації про клієнта */}
							<div className="infoAboutCustomer p-3 bg-light mb-3 text-center border-bottom">
								<p className="mb-0 text-uppercase">Архів складу:
									<strong className="text-success ml-2">
										{thisCustomer ? thisCustomer.name : 'Завантаження...'}
									</strong>
								</p>
								<small className="text-muted">ID клієнта: {customerId}</small>
							</div>

							{/* Заголовок та кнопка масового видалення */}
							<div className="d-flex justify-content-between align-items-center mb-3 px-3">
								<h3 className="mb-0">Історія накладних:</h3>
								{thisInvoices && thisInvoices.length > 0 && (
									<button
										className="btn btn-danger btn-sm"
										onClick={() => {
											if (window.confirm('УВАГА! Ви дійсно хочете видалити ВСЮ історію поставок цього клієнта?')) {
												this.props.removeInvoicesStockCustomer(customerId);
											}
										}}
									>
										<i className="fa fa-eraser mr-1"></i> Очистити весь архів
									</button>
								)}
							</div>

							{/* Вивід списку або повідомлення про відсутність */}
							{thisInvoices && thisInvoices.length > 0
								? this.renderInvoicesList(thisInvoices, customerId)
								: <h6 className="text-danger text-center mt-5 font-italic">Накладних не знайдено!</h6>
							}

							{/* Кнопка вгору */}
							<Button
								type="button"
								style={{ display: 'none' }}
								id={'goToTop'}
								onClick={this.props.topFunction}
								className={`btn btn-danger ${classes.btnTop}`}
							>
								<i className="fa fa-arrow-up"></i>
							</Button>
						</div>
					</div>
				)
		);
	}
}

function mapStateToProps(state) {
	return {
		invoiceStock: state.products.invoiceStock,
		products: state.products.products,
		productsDeleted: state.products.productsDeleted,
		customers: state.inform.customers,
		loading: state.products.loading
	}
}

function mapDispatchToProps(dispatch) {
	return {
		fetchProductsData: () => dispatch(fetchProductsData()),
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction()),
		changeStatusInvoiceStock: (cId, iId, status) => dispatch(changeStatusInvoiceStock(cId, iId, status)),
		removeInvoiceStockCustomer: (cId, iId) => dispatch(removeInvoiceStockCustomer(cId, iId)),
		removeInvoicesStockCustomer: (cId) => dispatch(removeInvoicesStockCustomer(cId))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(InvoiceStock)
import React, { Component } from 'react'
import classes from './InvoiceStock.module.css'
import { connect } from 'react-redux'
import Loader from '../../components/UI/Loader/Loader'
import Button from '../../components/UI/Button/Button'
import Select from '../../components/UI/Select/Select' // 1. Імпортуємо Select
import { onScroll, topFunction } from '../../redux/actions/menu'
// 2. Імпортуємо екшен для зміни статусу (якщо назва відрізняється в products.js, перевірте її)
import { changeStatusInvoiceStock, fetchProductsData } from '../../redux/actions/products'

class InvoiceStock extends Component {

	componentDidMount() {
		// Завжди завантажуємо свіжі дані з сервера при вході на сторінку
		this.props.fetchProductsData();
	}

	// 3. Метод для підготовки опцій випадаючого списку (копіюємо з CustomersOrders)
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

	// 4. Метод обробки зміни статусу
	selectChangeStatusOrder(event, customerId, invoiceStockId) {
		const valueSelectedStatusOrder = event.target.value;
		// Викликаємо екшен із props (Викликаємо функцію, яку ми щойно додали в props через mapDispatchToProps)
		this.props.changeStatusInvoiceStock(customerId, invoiceStockId, valueSelectedStatusOrder);
	}

	calculateInvoiceTotal(cart) {
		return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(1);
	}

	renderInvoices(invoices, customerId) {
		return invoices.map((invoice) => {
			// 5. Створюємо константу селекту для кожної накладної
			const selectStatusOrder = (
				<Select
					name="statusorder"
					className={`addOptionToProduct_${invoice.invoiceStockId} ${invoice.status === "in process..." ? "text-danger" : "text-success"}`}
					onChange={event => this.selectChangeStatusOrder(event, customerId, invoice.invoiceStockId)}
					option={this.optionStatusOrder(invoice.status)}
				/>
			);

			return (
				<div key={invoice.invoiceStockId} className={`position-relative border border-primary p-3 mb-5`} id={`invoice_${invoice.invoiceStockId}`}>
					<h5 className={`text-primary ${classes.h5}`}>Накладна №{invoice.invoiceStockId}</h5>
					<p className="small text-muted mb-2 text-info">Дата поставки: {invoice.date}</p>

					{/* 6. Виводимо селект статусу */}
					<h5 className={`${classes.h5}`}>Статус: &nbsp;
						<span className={"text-warning"}>{selectStatusOrder}</span>
					</h5>

					<div className="table-responsive mt-3">
						<table className="table table-sm">
							<thead>
								<tr>
									<th>Товар</th>
									<th>К-сть</th>
									<th>Ціна</th>
									<th>Сума</th>
								</tr>
							</thead>
							<tbody>
								{invoice.cart.map(item => {
									const productInfo = this.props.products.find(p => p.id === item.id) ||
										this.props.productsDeleted.find(p => p.id === item.id);
									return (
										<tr key={item.id}>
											<td>{productInfo ? productInfo.name : 'Видалений товар'}</td>
											<td>{item.quantity}</td>
											<td>{item.price} грн</td>
											<td>{(item.price * item.quantity).toFixed(1)} грн</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>

					<div className="d-flex justify-content-end border-top pt-2">
						<p className="mr-3 font-weight-bold">Разом за накладною:&nbsp;
							<span className="text-danger">
								{this.calculateInvoiceTotal(invoice.cart)}
							</span><span className="text-danger"> грн</span>
						</p>
					</div>
				</div>
			)
		}).reverse();
	}

	render() {
		const url = window.location.pathname;
		const customerId = +url.substring(url.lastIndexOf('/') + 1);
		const { invoiceStock, customers, loading, products } = this.props;

		// 1. Спершу показуємо лоадер, якщо вантажаться товари
		if (loading || !products || products.length === 0) return <Loader />;

		// 2. Шукаємо адміна (як у CustomersOrders)
		const currentAdmin = (customers || []).find(c => c.id === customerId);

		// 3. Шукаємо дані накладних
		const adminStockData = (invoiceStock || []).find(s => s.customerId === customerId);

		// Якщо адміна знайдено, рендеримо інтерфейс
		return (
			<div className={`wrapper ${classes.InvoiceStock}`}>
				<div>
					<div
						className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.renderOrders}`}
						onScroll={this.props.onScroll}
					>
						<div className="infoAboutCustomer">
							<p className="mb-0 text-center">Архів поставок складу <span className="text-success">{currentAdmin ? currentAdmin.name : 'Завантаження...'}</span></p>
							<p className="mb-0 text-center">Id: <span className="text-success">{customerId}</span></p>
						</div>

						<h3 className="mb-2 border-bottom text-center h1Title">Поставки:</h3>

						{/* Перевіряємо наявність накладних всередині розмітки */}
						{adminStockData && adminStockData.cartsHistory && adminStockData.cartsHistory.length > 0
							? this.renderInvoices(adminStockData.cartsHistory, customerId)
							: <h6 className="text-danger text-center mt-4">Поставок від цього користувача не знайдено!!!</h6>
						}

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
			</div>
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
		// 7. Додаємо екшен для зміни статусу (переконайтеся, що такий екшен є в actions/products.js)
		changeStatusInvoiceStock: (customerId, invoiceStockId, valueSelectedStatusOrder) =>
			dispatch(changeStatusInvoiceStock(customerId, invoiceStockId, valueSelectedStatusOrder))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(InvoiceStock)
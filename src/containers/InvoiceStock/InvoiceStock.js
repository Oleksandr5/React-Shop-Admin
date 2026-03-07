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
		const { products, productsDeleted, customers } = this.props;
		const thisCustomer = (customers || []).find(c => c.id === customerId);
		const customerName = thisCustomer ? thisCustomer.name : `Клієнт ID: ${customerId}`;

		return invoices.slice().reverse().map((invoice) => {
			return (
				<div
					key={invoice.invoiceStockId}
					className={`position-relative border border-primary p-3 mb-5 bg-white shadow-sm`}
					style={{ cursor: 'pointer' }} // Робимо курсор вказівним
					onClick={() => this.handlePrintInvoice(invoice, customerName)} // Виклик вікна друку
				>
					<h5 className={`text-primary ${classes.h5}`}>
						Накладна №{invoice.invoiceStockId}
					</h5>
					<p className="small text-muted mb-2">Дата поставки: {invoice.date}</p>
					<div onClick={(e) => e.stopPropagation()}>
						<h5 className={`${classes.h5}`}>Статус: &nbsp;
							<Select
								name="statusorder"
								className={`addOptionToProduct_${invoice.invoiceStockId} ${invoice.status === "in process..." ? "text-danger" : "text-success"}`}
								onChange={event => this.props.changeStatusInvoiceStock(customerId, invoice.invoiceStockId, event.target.value)}
								option={this.optionStatusOrder(invoice.status)}
							/>
						</h5>
					</div>
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
						onClick={(e) => {
							e.stopPropagation();
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

	handlePrintInvoice = (invoice, customerName) => {
		const { products, productsDeleted } = this.props;

		// 1. Формуємо текст товарів
		const itemsText = invoice.cart.map(item => {
			const product = (products || []).find(p => p.id === item.id) ||
				(productsDeleted || []).find(p => p.id === item.id);
			const name = product ? product.name : `ID: ${item.id}`;
			return `• ${name}: ${item.quantity} шт.`;
		}).join('\n');

		// 2. Формуємо повне текстове повідомлення
		const fullMessage = `📄 НАКЛАДНА №${invoice.invoiceStockId}\n` +
			`👤 Отримувач: ${customerName || '---'}\n` +
			`📅 Дата поставки: ${invoice.date}\n` +
			`✅ Статус: ${invoice.status}\n` +
			`--------------------------\n` +
			`${itemsText}`;

		// 3. Питаємо користувача: Друк чи Alert?
		// "OK" поверне true (Друк), "Скасувати" поверне false (Alert)
		const isPrint = window.confirm(
			"Деталі постачання отримано. Оберіть дію:\n\n" +
			"✅ OK для швидкого ПЕРЕГЛЯДУ (Alert)\n" +
			"❌ Скасувати для відкриття вікна ДРУКУ"
		);

		if (isPrint) {
			// Якщо вибрано "Скасувати" — показуємо звичайний alert
			alert(fullMessage);
			return; // Зупиняємо функцію, вікно друку не відкриється
		}

		// 4. Якщо користувач натиснув "OK" — відкриваємо вікно для друку
		const newWindow = window.open("", "_blank", "width=800,height=700");

		if (newWindow) {
			newWindow.document.write(`
        <html>
            <head>
                <title>Накладна №${invoice.invoiceStockId}</title>
                <style>
                    body { padding: 40px; font-family: 'Segoe UI', sans-serif; background: #f0f2f5; }
                    .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
                    h2 { color: #007bff; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                    pre { white-space: pre-wrap; font-family: monospace; font-size: 15px; background: #fafafa; padding: 15px; border: 1px solid #eee; line-height: 1.5; }
                    .btns { margin-top: 20px; display: flex; gap: 10px; }
                    button { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
                    .print { background: #007bff; color: white; }
                    @media print { .btns { display: none; } body { background: white; padding: 0; } .card { box-shadow: none; border: none; width: 100%; max-width: none; } }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>📋 Накладна на склад</h2>
                    <pre>${fullMessage}</pre>
                    <div class="btns">
                        <button class="print" onclick="window.print()">🖨️ Друк</button>
                        <button onclick="window.close()">Закрити</button>
                    </div>
                </div>
            </body>
        </html>
        `);
			newWindow.document.close();
		}
	}

	componentDidMount() {
		// Викликаємо завантаження лише якщо даних ще немає в сторі
		if (!this.props.invoiceStock || this.props.invoiceStock.length === 0) {
			this.props.fetchProductsData();
		}
	}

	render() {
		const url = window.location.pathname;
		const customerId = +url.substring(url.lastIndexOf('/') + 1);
		const { invoiceStock, customers, loading } = this.props;

		// --- ЛОГУВАННЯ ДЛЯ ПЕРЕВІРКИ ---
		console.log('[InvoiceStock] Props:', { loading, hasData: !!invoiceStock });

		const thisCustomer = (customers || []).find(c => c.id === customerId);
		const adminData = (invoiceStock || []).find(s => s.customerId === customerId);
		const thisInvoices = adminData ? adminData.cartsHistory : null;

		// ВИПРАВЛЕНА УМОВА: 
		// Показуємо лоадер тільки якщо loading=true ТА у нас ще немає даних (invoiceStock порожній)
		// Якщо дані вже є в Redux, ми показуємо інтерфейс відразу, не чекаючи фонового оновлення
		const showLoader = loading && (!invoiceStock || invoiceStock.length === 0);

		return (
			showLoader
				? <Loader />
				: (
					<div className={`wrapper ${classes.InvoiceStock}`}>
						{/* ... весь ваш інший код залишається без змін ... */}
						<div
							className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.renderOrders}`}
							onScroll={this.props.onScroll}
						>
							<div className="infoAboutCustomer p-3 bg-light mb-3 text-center border-bottom">
								<p className="mb-0 text-uppercase">Архів складу:
									<strong className="text-success ml-2">
										{thisCustomer ? thisCustomer.name : 'Завантаження...'}
									</strong>
								</p>
								<small className="text-muted">ID клієнта: {customerId}</small>
							</div>

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

							{thisInvoices && thisInvoices.length > 0
								? this.renderInvoicesList(thisInvoices, customerId)
								: <h6 className="text-danger text-center mt-5 font-italic">Накладних не знайдено!</h6>
							}

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
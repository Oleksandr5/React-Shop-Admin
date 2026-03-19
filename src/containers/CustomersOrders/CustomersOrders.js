import React, { Component } from 'react'
import classes from './CustomersOrders.module.css'
import { connect } from 'react-redux'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import Loader from '../../components/UI/Loader/Loader'
import Select from '../../components/UI/Select/Select'
import { NavLink } from 'react-router-dom'
import { updateIsOrdersHistoryThisCart, changeStatusCustomersOrders, removeOrderHistoryCustomer, removeOrdersHistoryCustomer, changeStatusCustomersReturns } from '../../redux/actions/products'
import { onScroll, topFunction } from '../../redux/actions/menu'

class CustomersOrders extends Component {

	state = {
		hasAccount: false,
		valueSelectedStatusOrder: this.props.status,
		valueSelectedStatusReturn: '' // Додано для повернень
	}

	getThisOrder(orders, customerId) {
		let indexOrders
		let indexOrdersNext
		let ordersThis

		const order = orders.filter((order, index) => {

			if (order.customerId === customerId) {
				indexOrders = index
				ordersThis = order
			}

			return order.customerId === customerId

		})

		if (!order[0]) {
			indexOrders = null
			ordersThis = null
		}

		indexOrdersNext = orders.length

		return { indexOrders: ordersThis ? indexOrders : indexOrdersNext, ordersThis: ordersThis ? { ...ordersThis } : null }
	}

	calculationTotalPriceForCart(orders, customerId) {

		let { ordersThis } = this.getThisOrder(orders, customerId)

		if (ordersThis) {
			return (
				ordersThis.customerId === customerId
					? ordersThis.cart

						? ordersThis.cart.map(product => {

							const { id } = product
							let thisProduct = this.props.products.filter(product => {
								return (
									product.id === id
								)
							})[0]

							if (!thisProduct) {
								thisProduct = this.props.productsDeleted.filter(product => {
									return (
										product.id === id
									)
								})[0]
								console.log('renderOrders_thisProductDeleted', thisProduct)
							}

							let totalPrice = +(product.quantity * product.price).toFixed(1)

							return totalPrice

						}

						).reduce((sum, val) => sum + val, 0)
						: null
					: null
			)
		} else {
			return null
		}

	}

	renderOrders(order, indexOrderInHistory) {
		const products = this.props.products;
		const productsDeleted = this.props.productsDeleted;

		const ordersThis = order;
		const isOrdersThisCart = ordersThis && ordersThis.cart && ordersThis.cart.length > 0;

		if (isOrdersThisCart) {
			const thisCart = ordersThis.cart;

			return thisCart.map(product => {
				const { id } = product;

				let thisProduct = products.find(p => p.id === id);

				if (!thisProduct) {
					thisProduct = productsDeleted.find(p => p.id === id);
				}

				return (
					<form
						key={id}
						className="row w-100 py-3 justify-content-between border-top border-bottom product_cart_history"
						id={`product_cart_history_${id}`}
					>
						<NavLink to={'/product/' + id} className="col-12 col-md-6 d-flex align-items-center order-1 mb-3 mb-md-0">
							<div
								className={`mb-3 ${classes.productFoto}`}
								style={{
									backgroundImage: `url(${thisProduct?.image || ''})`,
									backgroundSize: 'cover'
								}}
							></div>
							<p className="ml-3 font-weight text-dark">
								{thisProduct?.name || "Товар не знайдено"}
							</p>
						</NavLink>

						<div className="col-12 col-md-6 d-flex justify-content-between align-items-center order-3 order-md-2">
							<Input
								type="number"
								className={`${classes.inputPrice}`}
								name={`product_${id}_inHistory_${indexOrderInHistory}`}
								id={`input_product_${id}_inHistory_${indexOrderInHistory}`}
								data_price={`${product.price}`}
								defaultValue={product.quantity}
								readOnly="readOnly"
							/>
							<p className="mb-0" id={`product_price_${id}_inHistory_${indexOrderInHistory}`}>
								<span name={`product_price_inHistory_${indexOrderInHistory}`}>
									{+(product.price * product.quantity).toFixed(1)}
								</span> грн
							</p>
						</div>

						{product.comment ? (
							<div className="col-12 order-5 mt-2">
								<div className="p-2 rounded" style={{
									backgroundColor: '#f1faff',
									borderLeft: '4px solid #17a2b8',
									border: '1px solid #dee2e6',
									borderLeftColor: '#17a2b8',
									boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
									fontSize: '0.85rem'
								}}>
									<div className="d-flex align-items-start">
										<i className="fas fa-comment-dots mt-1 mr-2 text-info" style={{ opacity: 0.8 }}></i>
										<div>
											<span className="text-info font-weight-bold" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
												Коментар до товару:
											</span>
											<p className="mb-0 mt-1 text-dark" style={{
												fontStyle: 'italic',
												lineHeight: '1.4',
												whiteSpace: 'pre-wrap'
											}}>
												{product.comment}
											</p>
										</div>
									</div>
								</div>
							</div>
						) : null}

						<div className="col order-4">
							{thisProduct ? (
								!thisProduct.status ? (
									<p className="mb-0 text-danger mt-3 rounded p-2" id={`warning_cart_${id}`}>
										Доступно: <span className="text-primary">{`${thisProduct.quantity} ${thisProduct.units}.`}</span>
									</p>
								) : (
									<p className="mb-0 text-danger mt-1 mt-sm-3 rounded p-2" id={`warning_${id}`}>
										Товар відсутній
									</p>
								)
							) : (
								<p className="mb-0 text-muted mt-3 p-2">Дані про товар відсутні в базі</p>
							)}
						</div>
					</form>
				);
			});
		} else {
			return <h6 className="text-danger">Немає замовлення !!!</h6>;
		}
	}

	// --- НОВІ МЕТОДИ ДЛЯ ПОВЕРНЕНЬ ---

	selectChangeStatusReturn(event, customerId, orderHistoryId) {
		const valueSelectedStatusReturn = event.target.value;

		this.setState({
			valueSelectedStatusReturn
		});

		if (this.props.changeStatusCustomersReturns) {
			this.props.changeStatusCustomersReturns(customerId, orderHistoryId, valueSelectedStatusReturn);
		}
	}

	optionStatusReturn(orderStatus) {
		const thisStatusReturnOptions = [
			{ text: 'in process...', value: 'in process...', className: "text-danger" },
			{ text: "completed", value: "completed", className: "text-success" }
		]

		let thisStatus
		thisStatusReturnOptions.forEach((status, index) => {
			if (status.value === orderStatus) {
				thisStatus = status
				thisStatusReturnOptions.splice(index, 1)
				thisStatusReturnOptions.unshift(thisStatus)
			}
		})
		return thisStatusReturnOptions
	}

	renderStockHistory(stockHistory, customerId) {
		if (!stockHistory || stockHistory.length === 0) return null

		return [...stockHistory].reverse().map((order, index) => {
			const selectStatusReturn = (
				<Select
					name="statusreturn"
					className={`addOptionToProduct_${order.orderHistoryId} ${order.status === "in process..." ? "text-danger" : "text-success"}`}
					onChange={event => this.selectChangeStatusReturn(event, customerId, order.orderHistoryId)}
					option={this.optionStatusReturn(order.status)}
				/>
			);

			return (
				<div key={order.orderHistoryId || index} className="position-relative border border-danger p-3 mb-5 bg-white shadow-sm">
					<h5 className={`text-danger font-weight-bold mb-1 ${classes.h5}`}>
						<i className="fa fa-reply mr-2"></i> {order.orderComment || "Повернення на склад"}
					</h5>
					<p className="text-muted small mb-2">Дата: {order.date}</p>
					<h5 className={`${classes.h5}`}>Статус: {selectStatusReturn}</h5>

					<div className="table-responsive">
						<table className="table table-sm mt-2">
							<thead className="thead-light">
								<tr>
									<th>Товар</th>
									<th className="text-right">К-сть повернення</th>
								</tr>
							</thead>
							<tbody>
								{order.cart.map((product, pIndex) => {
									let thisProduct = this.props.products.find(p => String(p.id) === String(product.id));
									if (!thisProduct) {
										thisProduct = this.props.productsDeleted.find(p => String(p.id) === String(product.id));
									}

									return (
										<tr key={pIndex}>
											<td>
												<span className="font-weight-bold">{thisProduct?.name || product.productName || `ID: ${product.id}`}</span>
												{thisProduct && (
													<div className="small text-danger">
														Доступно: <span className="text-primary">{thisProduct.quantity} {thisProduct.units}</span>
													</div>
												)}
												{product.comment && <div className="small text-info"><i>{product.comment}</i></div>}
											</td>
											<td className="text-right text-danger font-weight-bold align-middle">
												-{product.quantity} {thisProduct?.units || ''}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>

					{/* Додана кнопка видалення для повернення */}
					<button
						className={`position-absolute ${classes.btnRemove}`}
						onClick={() => {
							const customerName = this.props.customers.find(c => c.id === customerId)?.name || 'клієнта';
							if (window.confirm(`Видалити повернення клієнта ${customerName}?`)) {
								this.props.removeOrderHistoryCustomer(customerId, order.orderHistoryId);
							}
						}}
					>
						<i className="fa fa-times" aria-hidden="true"></i>
					</button>
				</div>
			)
		})
	}

	// --- КІНЕЦЬ НОВИХ МЕТОДІВ ---

	selectChangeStatusOrder(event, customerId, orderHistoryId) {
		const valueSelectedStatusOrder = event.target.value;
		this.setState({ valueSelectedStatusOrder });
		this.props.changeStatusCustomersOrders(customerId, orderHistoryId, valueSelectedStatusOrder);
	}

	optionStatusOrder(orderStatus) {
		const thisStatusOrderOptions = [{ text: 'in process...', value: 'in process...', className: "text-danger" }, { text: "completed", value: "completed", className: "text-success" }]
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

	render() {
		let url = window.location.pathname
		let customerId = +url.substring(url.lastIndexOf('/') + 1)

		const thisCustomer = this.props.customers.find(customer => customer.id === customerId) || { name: 'Завантаження...', id: customerId }
		let name = thisCustomer.name
		const ordersHistory = this.props.ordersHistory

		const customerHistory = ordersHistory.find(order => order.customerId === customerId)
		const thisOrdersHistory = customerHistory ? customerHistory.cartsHistory : null
		const thisStockHistory = customerHistory ? customerHistory.stockHistory : null

		return (
			this.props.loading
				? <Loader />
				: this.props.ordersHistory?.length > 0
					?
					<div className={`wrapper ${classes.CustomersOrders}`} >
						<div>
							<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.renderOrders}`} onScroll={this.props.onScroll} >
								<div className={"infoAboutCustomer"}>
									<p className="mb-0 text-center">Користувач: <span className="text-success">{thisCustomer.name}</span> (ID: {thisCustomer.id})</p>
								</div>

								{/* ПОКАЗУЄМО ПОВЕРНЕННЯ НАГОРІ */}
								{thisStockHistory && thisStockHistory.length > 0 && (
									<>
										<h3 className={"mb-3 mt-4 border-bottom text-center h1Title text-danger"}>Повернення:</h3>
										{this.renderStockHistory(thisStockHistory, customerId)}
									</>
								)}

								<h3 className={"mb-2 mt-4 border-bottom text-center h1Title"}>Замовлення:</h3>

								{
									thisOrdersHistory
										? [...thisOrdersHistory].reverse().map((order) => {
											const selectStatusOrder = (
												<Select
													name="statusorder"
													className={`addOptionToProduct_${order.orderHistoryId} ${order.status === "in process..." ? "text-danger" : "text-success"}`}
													onChange={event => this.selectChangeStatusOrder(event, customerId, order.orderHistoryId)}
													option={this.optionStatusOrder(order.status)}
												/>
											);

											return (
												<div key={order.orderHistoryId} className={`position-relative border border-success p-3 mb-5 bg-white shadow-sm`} id={`customer_order_${order.orderHistoryId}`}>
													<h5 className={`text-primary ${classes.h5}`}>Дата: &nbsp;<span className={"text-info"}>{order.date}</span></h5>
													<h5 className={`${classes.h5}`}>Статус: &nbsp;<span className={"text-warning"}>{selectStatusOrder}</span></h5>

													{this.renderOrders(order, order.orderHistoryId)}

													{order.orderComment ? (
														<div className="mt-3 p-3 rounded" style={{
															backgroundColor: '#fffdf5',
															border: '1px solid #e9ecef',
															borderLeft: '5px solid #ffc107',
															boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
														}}>
															<div className="d-flex align-items-center mb-2">
																<i className="fas fa-truck text-warning mr-2"></i>
																<h6 className="font-weight-bold text-dark mb-0" style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>
																	Коментар до замовлення:
																</h6>
															</div>
															<p className="mb-0 text-dark" style={{
																whiteSpace: 'pre-wrap',
																fontSize: '1rem',
																lineHeight: '1.5',
																color: '#333'
															}}>
																{order.orderComment}
															</p>
														</div>
													) : null}

													<div className="d-flex justify-content-end mt-3">
														<p className="mr-3 font-weight-bold">Загальна сума:&nbsp;
															<span className="text-primary" id={`totalPrice_inHistory_${order.orderHistoryId}`}>
																{this.calculationTotalPriceForCart([order], customerId)}
															</span><span className="text-primary"> грн</span>
														</p>
													</div>

													<button
														className={`position-absolute ${classes.btnRemove}`}
														onClick={() => {
															if (window.confirm(`Видалити замовлення клієнта ${name}?`)) {
																this.props.removeOrderHistoryCustomer(customerId, order.orderHistoryId);
															}
														}}
													>
														<i className="fa fa-times" aria-hidden="true"></i>
													</button>
												</div>
											)
										})
										: <h6 className="text-danger text-center">Замовлень не знайдено!!!</h6>
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
					: <div className={`d-flex border shadow p-3 blockError`}>
						<p className="mx-auto text-center text-danger font-weight-bold">Йде загрузка замовлень... </p>
					</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		orders: state.products.orders,
		ordersHistory: state.products.ordersHistory,
		products: state.products.products,
		productsDeleted: state.products.productsDeleted,
		customers: state.inform.customers,
		customerId: state.inform.customerId,
		customerName: state.inform.customerName,
		hasAccount: state.inform.hasAccount,
		isOrdersThisCart: state.products.isOrdersThisCart
	}
}

function mapDispatchToProps(dispatch) {
	return {
		updateIsOrdersHistoryThisCart: isOrdersThisCart => dispatch(updateIsOrdersHistoryThisCart(isOrdersThisCart)),
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction()),
		changeStatusCustomersOrders: (customerId, orderHistoryId, valueSelectedStatusOrder) =>
			dispatch(changeStatusCustomersOrders(customerId, orderHistoryId, valueSelectedStatusOrder)),
		changeStatusCustomersReturns: (customerId, orderHistoryId, valueSelectedStatusReturn) =>
			dispatch(changeStatusCustomersReturns(customerId, orderHistoryId, valueSelectedStatusReturn)),
		removeOrderHistoryCustomer: (idCustomer, orderHistoryId) =>
			dispatch(removeOrderHistoryCustomer(idCustomer, orderHistoryId)),
		removeOrdersHistoryCustomer: (idCustomer, page) =>
			dispatch(removeOrdersHistoryCustomer(idCustomer, page)),
		// Додайте changeStatusCustomersReturns в redux/actions/products.js пізніше
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomersOrders)
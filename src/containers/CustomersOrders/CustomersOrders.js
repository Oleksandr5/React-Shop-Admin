import React, { Component } from 'react'
import classes from './CustomersOrders.module.css'
import { connect } from 'react-redux'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import Loader from '../../components/UI/Loader/Loader'
import Select from '../../components/UI/Select/Select'
import { NavLink } from 'react-router-dom'
import { updateIsOrdersHistoryThisCart, changeStatusCustomersOrders, removeOrderHistoryCustomer, removeOrdersHistoryCustomer } from '../../redux/actions/products'
import { onScroll, topFunction } from '../../redux/actions/menu'

class CustomersOrders extends Component {

	state = {
		hasAccount: false,
		valueSelectedStatusOrder: this.props.status
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

	renderOrders(orders, indexOrderInHistory, customerId) {

		//        const orders = this.props.orders        

		const products = this.props.products
		const productsDeleted = this.props.productsDeleted

		let { ordersThis } = this.getThisOrder(orders, customerId)

		let isOrdersThisCart

		if (ordersThis) {
			let ordersThisCart = Object.keys(ordersThis).filter(order => order === 'cart')[0] ? true : false
			if (ordersThisCart) {
				isOrdersThisCart = ordersThis.cart[0] ? true : false
			}
		}

		//        this.props.updateIsOrdersHistoryThisCart(isOrdersThisCart)

		if (isOrdersThisCart) {
			const thisCart = ordersThis.cart

			if (thisCart) {

				return (
					thisCart.map(product => {
						const { id } = product

						let thisProduct = products.filter(product => {
							return (
								product.id === id
							)
						})[0]

						if (!thisProduct) {
							thisProduct = productsDeleted.filter(product => {
								return (
									product.id === id
								)
							})[0]
							console.log('renderOrders_thisProductDeleted', thisProduct)
						}

						return (

							<form
								key={thisProduct.id}
								className={`row w-100 py-3 justify-content-between border-top border-bottom product_cart_history`}
								id={`product_cart_history_${thisProduct.id}`}
							>
								<NavLink to={'/product/' + thisProduct.id} className="col-12 col-md-6 d-flex align-items-center order-1 mb-3 mb-md-0">

									<div className={`mb-3 ${classes.productFoto}`} style={{ backgroundImage: `url(${thisProduct.image})`, backgroundSize: 'cover' }}>

									</div>
									<p className="ml-3 font-weight text-dark">
										{thisProduct.name}
									</p>
								</NavLink>
								<div className="col-12 col-md-6 d-flex justify-content-between align-items-center order-3 order-md-2">

									<Input type="number" className={`${classes.inputPrice}`} name={`product_${thisProduct.id}_inHistory_${indexOrderInHistory}`} id={`input_product_${thisProduct.id}_inHistory_${indexOrderInHistory}`} data_price={`${product.price}`} defaultValue={product.quantity} readOnly="readOnly" />

									<p className="mb-0" id={`product_price_${thisProduct.id}_inHistory_${indexOrderInHistory}`}><span name={`product_price_inHistory_${indexOrderInHistory}`}>{+(product.price * product.quantity).toFixed(1)}</span> грн</p>
								</div>
								<div className="col order-4">
									{!thisProduct.status
										?
										<p className="mb-0 text-danger mt-3 rounded p-2" id={`warning_cart_${thisProduct.id}`} >Доступно: <span className="text-primary">{`${thisProduct.quantity} ${thisProduct.units}.`}</span></p>
										:
										<p className="mb-0 text-danger mt-1 mt-sm-3 rounded p-2" id={`warning_${thisProduct.id}`} >Товар відсутній</p>
									}

								</div>

							</form>
						)
					})
				)
			}
		} else {
			return <h6 className="text-danger">Немає замовлення !!!</h6>
		}

	}

	selectChangeStatusOrder(event, customerId, orderHistoryId) {
		const valueSelectedStatusOrder = event.target.value;

		this.setState({
			valueSelectedStatusOrder
		});

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

	componentDidMount() {

	}

	render() {

		let url = window.location.pathname
		let customerId = +url.substring(url.lastIndexOf('/') + 1)

		const thisCustomer = this.props.customers.filter(customer => customer.id === customerId)[0]

		const ordersHistory = this.props.ordersHistory

		const thisOrdersHistory = ordersHistory.filter(order => order.customerId === customerId)[0] ? ordersHistory.filter(order => order.customerId === customerId)[0].cartsHistory : null

		return (

			this.props.loading

				? <Loader />
				: this.props.orders[0]
					?
					<div className={`wrapper ${classes.CustomersOrders}`} >

						<div>


							<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.renderOrders}`} onScroll={this.props.onScroll} >

								<div className={"infoAboutCustomer"}>
									<p className="mb-0 text-center">Це замовлення користувача <span className="text-success">{thisCustomer.name}</span></p>
									<p className="mb-0 text-center">Id: <span className="text-success">{thisCustomer.id}</span></p>
									<p className="mb-0 text-center">Email: <span className="text-success">{thisCustomer.email}</span></p>
									<p className="mb-0 text-center">Phone: <span className="text-success">{thisCustomer.tel}</span></p>
								</div>


								<h3 className={"mb-2 border-bottom text-center h1Title"}>Замовлення:</h3>

								{

									thisOrdersHistory ? thisOrdersHistory.map((order) => {

										const selectStatusOrder = (
											<Select
												name="statusorder"
												className={`addOptionToProduct_${order.orderHistoryId} ${order.status === "in process..." ? "text-danger" : "text-success"}`}
												onChange={event => this.selectChangeStatusOrder(event, customerId, order.orderHistoryId)}
												option={this.optionStatusOrder(order.status)}
											/>
										);

										return (
											<div key={order.orderHistoryId} className={`position-relative border border-success p-3 mb-5`} id={`customer_order_${order.orderHistoryId}`}>
												<h5 className={`text-primary ${classes.h5}`}>Дата замовлення: &nbsp;<span className={"text-info"}>{order.date}</span></h5>
												<h5 className={`${classes.h5}`}>Статус: &nbsp;<span className={"text-warning"}>{selectStatusOrder}</span></h5>

												{this.renderOrders([order], order.orderHistoryId, customerId)}

												<div className="d-flex justify-content-end">
													<p className="mr-3 font-weight-bold">Загальна сума:&nbsp;
														<span className="text-primary" id={`totalPrice_inHistory_${order.orderHistoryId}`}>
															{this.calculationTotalPriceForCart([order], customerId)}
														</span><span className="text-primary"> грн</span>
													</p>
												</div>

												<button className={`position-absolute ${classes.btnRemove}`} onClick={() => this.props.removeOrderHistoryCustomer(customerId, order.orderHistoryId)}>
													<i className="fa fa-times" aria-hidden="true"></i>
												</button>
											</div>
										)
									}).reverse() : <h6 className="text-danger">Ви ще не зробили замовлення!!!</h6>


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
		removeOrderHistoryCustomer: (idCustomer, orderHistoryId) =>
			dispatch(removeOrderHistoryCustomer(idCustomer, orderHistoryId)),
		removeOrdersHistoryCustomer: (idCustomer, page) =>
			dispatch(removeOrdersHistoryCustomer(idCustomer, page))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomersOrders)
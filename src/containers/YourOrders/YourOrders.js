import React, { Component } from 'react'
import classes from './YourOrders.module.css'
import { connect } from 'react-redux'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import { NavLink } from 'react-router-dom'
import Loader from '../../components/UI/Loader/Loader'
import axios from '../../axios/axios-quiz'
import firebase from 'firebase'
import { updateIsOrdersHistoryThisCart, updateStatusYourOrder, onDelete, addProductToCart } from '../../redux/actions/products'
import { onScroll, topFunction } from '../../redux/actions/menu'

class YourOrders extends Component {

	state = {
		hasAccount: false
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

	onClickQuality(obj) {
		let { value: quantity, id, maxQuantity } = obj

		let elem = document.querySelector(`p[id = warning_${id}]`)

		if (quantity >= maxQuantity) {
			elem.classList.add("shadow")
		} else {
			elem.classList.remove("shadow")
		}

	}

	totalPriceCart(indexOrderInHistory) {
		let priceAllProduct = [...document.querySelectorAll(`span[name = product_price_inHistory_${indexOrderInHistory}]`)]

		const totalPrice = priceAllProduct.map(product => {


			return +product.innerText

		}).reduce((sum, elem) => sum + elem, 0)

		document.querySelector(`#totalPrice_inHistory_${indexOrderInHistory}`).innerHTML = totalPrice
	}


	onChangeQuantity(obj) {
		let { value: quantity, price, id, stepunits, indexOrderInHistory } = obj

		if (quantity < stepunits) {
			return
		}
		let thisPrice = +(+price * +quantity).toFixed(1)
		document.querySelector(`p[id = product_price_${id}_inHistory_${indexOrderInHistory}]`).querySelector('span').innerHTML = thisPrice

	}


	calculationTotalPriceForCart(orders) {

		const customerId = this.props.customerId
		let { indexOrders, ordersThis } = this.getThisOrder(orders, customerId)

		if (ordersThis) {
			return (
				ordersThis.customerId === this.props.customerId
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
								console.log('calculationTotalPriceForCart_thisProductDeleted', thisProduct)
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

	addProductToCart(obj) {

		const { event, productId, price, customerId, quantityProductYourOrder, indexOrderInHistory } = obj

		event.preventDefault()

		this.props.addProductToCart({ productId, price, customerId, quantityProductYourOrder, indexOrderInHistory })
		// in Product.js this.props.addProductToCart({event, productId, customerId, price, stepunits})
	}

	renderOrders(orders, indexOrderInHistory) {

		const products = this.props.products
		const productsDeleted = this.props.productsDeleted
		const customerId = this.props.customerId

		let { indexOrders, ordersThis } = this.getThisOrder(orders, customerId)

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
						const quantityProductYourOrder = product.quantity

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

						const thisOrder = orders.filter(order => {
							return (
								order.customerId === customerId
							)
						})[0]

						const thisCart = thisOrder.cart.filter(cart => {
							return (
								cart.id === id
							)
						})[0]

						const productQuantityInCar = thisCart.quantity

						return (

							<form
								onSubmit={event => this.addProductToCart({ event, productId: thisProduct.id, customerId: this.props.customerId, price: product.price, quantityProductYourOrder, indexOrderInHistory })}
								key={thisProduct.id}
								className={`row w-100 py-3 justify-content-between border-top border-bottom product_cart_history`}
								id={`product_cart_history_${thisProduct.id}`}
							>
								<NavLink to={'/product/' + thisProduct.id} className="col-10 col-md-5 d-flex align-items-center order-1 mb-3 mb-md-0">

									<div className={`mb-3 ${classes.productFoto}`} style={{ backgroundImage: `url(${thisProduct.image})`, backgroundSize: 'cover' }}>

									</div>
									<p className="ml-3 font-weight text-dark">
										{thisProduct.name}
									</p>
								</NavLink>
								<div className="col-12 col-md-6 d-flex justify-content-between align-items-center order-3 order-md-2">

									<div className={`divInputNumber divInputNumberYourOrders_${thisProduct.id}_inHistory_${indexOrderInHistory} mx-right position-relation ${classes.divInputNumberYourOrders}`}>
										<Input type="number" className="text-center" labelDisplay="d-none" name={`product_${thisProduct.id}_inHistory_${indexOrderInHistory}`} id={`input_product_${thisProduct.id}_inHistory_${indexOrderInHistory}`} data_price={`${product.price}`} defaultValue={product.quantity} readOnly="readOnly" />
									</div>

									<p className="mb-0" id={`product_price_${thisProduct.id}_inHistory_${indexOrderInHistory}`}><span name={`product_price_inHistory_${indexOrderInHistory}`}>{+(product.price * product.quantity).toFixed(1)}</span> грн</p>
								</div>
								<div className="col-1 col-md-1 d-flex justify-content-center align-items-center order-2 order-md-3">
									<Button
										type="submit"
										id={thisProduct.id}

										selfType="success"
										className="btn btn-success"
										disabled={!thisProduct.quantity || thisProduct.status === 'deleted'}
									>
										<i className="fa fa-shopping-basket" aria-hidden="true"></i>
									</Button>
								</div>
								<div className="col order-4">
									{this.props.authAdmin
										? !thisProduct.status ? <p className="mb-0 text-danger mt-1 mt-sm-3 rounded p-2" id={`warning_${thisProduct.id}`} >Доступно: <span className="text-primary">{`${thisProduct.quantity} ${thisProduct.units}.`}</span></p> : <p className="mb-0 text-danger mt-1 mt-sm-3 rounded p-2" id={`warning_${thisProduct.id}`} >Товар відсутній</p>
										: thisProduct.quantity
											? <p className="mb-0 text-success mt-1 mt-sm-3 rounded p-2" id={`warning_${thisProduct.id}`} >Товар є в наявності</p>
											: <p className="mb-0 text-danger mt-1 mt-sm-3 rounded p-2" id={`warning_${thisProduct.id}`} >Товару немає в наявності</p>
									}
								</div>

							</form>
						)
					})
				)
			}
		} else {
			return <h6 className="text-danger">Ви ще не зробили замовлення !!!</h6>
		}

	}

	componentDidMount() {

	}

	render() {

		const { hasAccount } = this.props
		const ordersHistory = this.props.ordersHistory

		const thisOrdersHistory = ordersHistory.filter(order => order.customerId === this.props.customerId)[0] ? ordersHistory.filter(order => order.customerId === this.props.customerId)[0].cartsHistory : null

		return (
			<div className={`wrapper ${classes.YourOrders, classes.Wrapper}`} >

				<div>

					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.renderOrders}`} onScroll={this.props.onScroll} >
						<NavLink to={'/'} className={`d-block mb-2 btnBack`} >
							<i className="fa fa-arrow-left" aria-hidden="true"></i> Вернутись на головну
						</NavLink>

						{
							hasAccount
								?
								<div className={"successAuth"}>
									<p className="mb-0 text-success text-center">Вітаємо {this.props.customerName} !!!</p>
								</div>
								: null
						}

						<h3 className={"mb-2 border-bottom text-center h1Title"}>Ваші замовлення:</h3>
						{

							this.props.loading

								? <Loader />
								:

								thisOrdersHistory ? thisOrdersHistory.map((order, index) => {
									return (
										<div key={Math.random() + order.date} className={"border border-success p-3 mb-3"} >
											<h5 className={`${classes.h5}`}>Дата Вашого замовлення: &nbsp;<span className={"text-info"}>{order.date}</span></h5>

											<div className="d-flex align-items-center">

												<h5 className={`${classes.h5}`}>Статус: &nbsp;<span className={`${order.status === "in process..." ? "text-danger" : "text-success"} status_order_${index}`}>{order.status}</span></h5>

												<Button
													type="button"
													id={'statusUpdate'}
													onClick={() => this.props.updateStatusYourOrder(this.props.customerId, index)}
													className={`ml-3 btn btn-success btn_refresh_${index}`}
												>
													<i className="fa fa-refresh" aria-hidden="true"></i>
												</Button>

											</div>
											<div key={Math.random() + order.date} className={"divInfo"} >
												<p className="d-none text-info">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Тут вказані ціни товарів, які були на момент оформлення Вами цього замовлення !!! Ви можете звідси закидати потрібний Вам товар у кошик, та пам'ятайте що в кошику ціни будуть такими, які на даний час є в магазині. Дякую! Гарних покупок! </p>
											</div>

											{this.renderOrders([order], index)}
											<div className="d-flex justify-content-end">
												<p className="mr-3 font-weight-bold">Загальна сума замовлення:&nbsp;
										<span className="text-primary" id={`totalPrice_inHistory_${index}`}>
														{this.calculationTotalPriceForCart([order])}

													</span> <span className="text-primary">грн</span>
												</p>

											</div>
										</div>
									)
								}).reverse() : <h6 className="text-danger text-center">Ви ще не зробили замовлення !!!</h6>

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
		authAdmin: state.inform.authAdmin,
		loading: state.products.loading,
		isOrdersThisCart: state.products.isOrdersThisCart
	}
}

function mapDispatchToProps(dispatch) {
	return {
		updateIsOrdersHistoryThisCart: isOrdersThisCart => dispatch(updateIsOrdersHistoryThisCart(isOrdersThisCart)),
		updateStatusYourOrder: (customerId, index) => dispatch(updateStatusYourOrder(customerId, index)),
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction()),
		addProductToCart: obj => dispatch(addProductToCart(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(YourOrders)
import React, { Component } from 'react'
import classes from './CustomersCarts.module.css'
import { connect } from 'react-redux'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import Select from '../../components/UI/Select/Select'
import Loader from '../../components/UI/Loader/Loader'
import { NavLink } from 'react-router-dom'
import firebase from 'firebase'
import { updateIsOrdersThisCart, changeStatusCustomersCarts } from '../../redux/actions/products'
import { onScroll, topFunction } from '../../redux/actions/menu'

class CustomersCarts extends Component {

	state = {
		hasAccount: false,
		valueSelectedStatusOrder: this.props.status
	}

	// Додаємо метод для безпечного оновлення Redux-статусу
	componentDidUpdate(prevProps) {
		if (prevProps.orders !== this.props.orders) {
			let url = window.location.pathname
			let customerId = +url.substring(url.lastIndexOf('/') + 1)
			const thisOrders = this.props.orders.filter(order => order.customerId === customerId)
			const hasItems = thisOrders.some(order => order.cart && order.cart.length > 0)

			if (this.props.isOrdersThisCart !== hasItems) {
				this.props.updateIsOrdersThisCart(hasItems)
			}
		}
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
		if (ordersThis && ordersThis.cart) {
			return ordersThis.cart.map(product => {
				const thisProduct = this.props.products.find(p => p.id === product.id) || { price: 0 }
				return +(product.quantity * thisProduct.price).toFixed(1)
			}).reduce((sum, val) => sum + val, 0).toFixed(1)
		}
		return 0
	}

	renderOrders(ordersThis, indexOrderInCart, customerId) {
		const products = this.props.products
		let isOrdersThisCart = false

		if (ordersThis && ordersThis.cart && ordersThis.cart[0]) {
			isOrdersThisCart = true
		}

		if (isOrdersThisCart) {
			return ordersThis.cart.map(product => {
				const { id, comment } = product
				const thisProduct = products.find(p => p.id === id) || {}

				return (
					<form
						key={id}
						className={`row w-100 py-3 justify-content-between border-top border-bottom product_cart_history`}
						id={`product_cart_history_${id}`}
					>
						<NavLink to={'/product/' + id} className="col-12 col-md-6 d-flex align-items-center order-1 mb-3 mb-md-0">
							<div className={`mb-3 ${classes.productFoto}`} style={{ backgroundImage: `url(${thisProduct.image})`, backgroundSize: 'cover' }}></div>
							<p className="ml-3 font-weight text-dark">{thisProduct.name}</p>
						</NavLink>

						<div className="col-12 col-md-6 d-flex justify-content-between align-items-center order-3 order-md-2">
							<Input type="number" className={`${classes.inputPrice}`} name={`product_${id}_inHistory_${indexOrderInCart}`} id={`input_product_${id}_inHistory_${indexOrderInCart}`} data_price={`${thisProduct.price}`} defaultValue={product.quantity} readOnly="readOnly" />
							<p className="mb-0" id={`product_price_${id}_inHistory_${indexOrderInCart}`}>
								<span name={`product_price_inHistory_${indexOrderInCart}`}>{+(thisProduct.price * product.quantity).toFixed(1)}</span> грн
							</p>
						</div>

						{/* КОМЕНТАР ДО ТОВАРУ */}
						{comment && (
							<div className="col-12 order-5 mt-2 px-0">
								<div className="p-2 rounded" style={{
									backgroundColor: '#f1faff', // Дуже легкий блакитний фон
									border: '1px solid #dee2e6', // Тонка рамка навколо
									borderLeft: '4px solid #17a2b8', // Блакитна акцентна лінія
									borderLeftColor: '#17a2b8',
									boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)', // Внутрішня тінь для об'єму
									fontSize: '0.85rem'
								}}>
									<div className="d-flex align-items-start">
										<i className="fas fa-comment-dots mt-1 mr-2 text-info" style={{ opacity: 0.8 }}></i>
										<div>
											<span className="text-info font-weight-bold" style={{
												fontSize: '0.75rem',
												textTransform: 'uppercase',
												letterSpacing: '0.5px'
											}}>
												Коментар до товару:
											</span>
											<p className="mb-0 mt-1 text-dark" style={{
												fontStyle: 'italic',
												lineHeight: '1.4',
												whiteSpace: 'pre-wrap' // Щоб коментар не вилазив за межі
											}}>
												{/* Ваша незмінна логіка */}
												{comment}
											</p>
										</div>
									</div>
								</div>
							</div>
						)}

						<div className="col order-4">
							<p className="mb-0 text-danger mt-3 rounded p-2" id={`warning_cart_${id}`} >Доступно: <span className="text-primary">{`${thisProduct.quantity} ${thisProduct.units}.`}</span></p>
						</div>
					</form>
				)
			})
		} else {
			return <h6 className="text-danger">Ви ще не зробили замовлення!!!</h6>
		}
	}

	selectChangeStatusOrder(event, customerId, index) {
		let valueSelectedStatusOrder = event.target.value
		this.setState({ valueSelectedStatusOrder })
		this.props.changeStatusCustomersCarts(customerId, index, valueSelectedStatusOrder)
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

		// 1. СПЕРШУ ПЕРЕВІРКА НА ЗАВАНТАЖЕННЯ
		// Якщо loading true АБО в нас ще немає жодного клієнта в списку - показуємо Loader
		// Це прибере помилку "Клієнта не знайдено" при оновленні сторінки (F5)
		if (this.props.loading || this.props.customers.length === 0) {
			return <Loader />
		}

		// 2. ТЕПЕР ШУКАЄМО КЛІЄНТА (коли дані вже точно є в props)
		const thisCustomer = this.props.customers.find(customer => customer.id === customerId)
		const orders = this.props.orders
		const thisOrders = orders.filter(order => order.customerId === customerId)

		// 3. ЯКЩО ПІСЛЯ ЗАВАНТАЖЕННЯ КЛІЄНТА ДІЙСНО НЕМАЄ - ТОДІ ПОМИЛКА
		if (!thisCustomer) {
			return (
				<div className="container mt-5">
					<div className="alert alert-danger text-center">
						<h4>Помилка: Клієнта з ID {customerId} не знайдено</h4>
						<NavLink to="/switchcustomerscarts" className="btn btn-outline-danger">Повернутися до списку</NavLink>
					</div>
				</div>
			)
		}

		// 4. ВАШ ОСНОВНИЙ РЕНДЕР (БЕЗ ЗМІН ЛОГІКИ)
		return (
			<div className={`wrapper ${classes.CustomersCarts} ${classes.Wrapper}`} >
				<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.renderOrders}`} onScroll={this.props.onScroll} >

					<div className={"infoAboutCustomer"}>
						<p className="mb-0 text-center">Це кошик користувача <span className="text-success">{thisCustomer.name}</span></p>
						<p className="mb-0 text-center">Id: <span className="text-success">{thisCustomer.id}</span></p>
						<p className="mb-0 text-center">Email: <span className="text-success">{thisCustomer.email}</span></p>
						<p className="mb-0 text-center">Phone: <span className="text-success">{thisCustomer.tel}</span></p>
					</div>

					<h3 className={"mb-2 border-bottom text-center h1Title"}>Замовлення:</h3>

					{thisOrders.length > 0 ? thisOrders.map((order, index) => {
						const selectStatusOrder = <Select
							name="statusorder"
							className={`addOptionToProduct_${index} ${order.status === "in process..." ? "text-danger" : "text-success"}`}
							onChange={event => this.selectChangeStatusOrder(event, customerId, index)}
							option={this.optionStatusOrder(order.status)}
						/>

						return (
							<div key={order.date + index} className={`border border-success p-3 mb-5`} id={`customer_order_${index}`}>
								<h5 className={`text-primary ${classes.h5}`}>Дата замовлення: &nbsp;<span className={"text-info"}>{order.date}</span></h5>
								<h5 className={`${classes.h5}`}>Статус: &nbsp;<span className={"text-warning"}>{selectStatusOrder}</span></h5>

								{this.renderOrders(order, index, customerId)}

								{/* Ваш блок коментаря */}
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
									<p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: '1.5', color: '#333' }}>
										{order.orderComment || order.comment}
									</p>
								</div>

								<div className="d-flex justify-content-end mt-2">
									<p className="mr-3 font-weight-bold">Загальна сума:&nbsp;
										<span className="text-primary" id={`totalPrice_inHistory_${index}`}>
											{this.calculationTotalPriceForCart([order], customerId)}
										</span><span className="text-primary"> грн</span>
									</p>
								</div>
							</div>
						)
					}) : <h6 className="text-danger">Немає замовлення !!!</h6>}

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
		isOrdersThisCart: state.products.isOrdersThisCart,
		loading: state.products.loading
	}
}

function mapDispatchToProps(dispatch) {
	return {
		updateIsOrdersThisCart: isOrdersThisCart => dispatch(updateIsOrdersThisCart(isOrdersThisCart)),
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction()),
		changeStatusCustomersCarts: (customerId, index, valueSelectedStatusOrder) => dispatch(changeStatusCustomersCarts(customerId, index, valueSelectedStatusOrder))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomersCarts)
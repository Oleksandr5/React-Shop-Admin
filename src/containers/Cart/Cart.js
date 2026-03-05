import React, { Component } from 'react'
import classes from './Cart.module.css'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import is from 'is_js' // для валідації емейлу в формі
import { NavLink } from 'react-router-dom'
import { Modal } from 'react-bootstrap'
import axios from '../../axios/axios-quiz'
import firebase from 'firebase'
import { connect } from 'react-redux'
import { onScrollCart, topFunctionCart, bottomFunctionCart, errorFunctionCart } from '../../redux/actions/menu'
import { addNewCustomer } from '../../redux/actions/inform'
import { addProductWithCartToOrdersHistory, updateIsOrdersThisCart, priceIncludedPromotion, onDelete, setQuantityAll, addProductToInvoiceStock } from '../../redux/actions/products'

class Cart extends Component {

	state = {
		show: false,
		orderType: null, // може бути 'order' або 'stock'
		disabledBtnSend: false,
		successfulOrder: false,
		authAndReg: false,
		isFormValid: this.props.customerName === 'Шановний клієнт' ? false : true,
		isOrdersThisCart: this.props.isOrdersThisCart,
		formControls: {
			email: {
				id: 'email',
				htmlFor: 'email',
				value: '',
				name: 'registr',
				type: 'email',
				label: 'Email',
				errorMessage: 'Введіть корректний емейл',
				valid: false,
				touched: false,
				validation: {
					required: true,
					email: true
				}
			},
			name: {
				id: 'name',
				htmlFor: 'name',
				value: '',
				name: 'registr',
				type: 'text',
				label: 'Ім\'я',
				errorMessage: 'Введіть корректне ім\'я',
				valid: false,
				touched: false,
				validation: {
					required: true
				}
			},
			tel: {
				id: 'tel',
				htmlFor: 'tel',
				value: '',
				name: 'registr',
				type: 'number',
				label: 'Номер телефону',
				errorMessage: 'Введіть корректний номер телефону',
				valid: false,
				touched: false,
				validation: {
					required: true
				}
			}
		},
		email: ''
	}

	handleClose = () => {
		this.setState({
			show: false, successfulOrder: false
		})
	}

	handleShow = () => {

		this.setState({
			show: true
		})

	}

	addProductToStock = (obj) => {
		const { event, idThisCustomers } = obj;
		if (event) event.preventDefault();

		this.setState({ disabledBtnSend: true, orderType: 'stock' });

		// Візуал
		let blockInfo = document.getElementById('blockInfo');
		let successfulOrder_Info = blockInfo.querySelector('p.text-info');
		successfulOrder_Info.innerHTML = "Обробка поставки на склад...";
		blockInfo.classList.remove("d-none");

		setTimeout(async () => {
			try {
				// Оскільки це адмін, email беремо з пропсів або стейту
				const emailAccount = this.props.customerEmail || this.state.email;

				// Викликаємо нову функцію з пунктів вище
				await this.props.addProductToInvoiceStock({
					customerId: idThisCustomers,
					email: emailAccount
				});

				// Очищення форми
				const formControls = { ...this.state.formControls };
				Object.keys(formControls).forEach(name => {
					formControls[name].value = '';
					formControls[name].valid = false;
					formControls[name].touched = false;
				});

				this.setState({
					formControls,
					email: "",
					successfulOrder: true,
					isOrdersThisCart: false
				});

				successfulOrder_Info.innerHTML = "Склад успішно поповнено! Дані перенесено в Invoice Stock.";
				blockInfo.querySelector('.successInfo').classList.remove("d-none");

			} catch (e) {
				console.log(e);
			} finally {
				this.setState({ disabledBtnSend: false });
			}
		}, 500);
	}

	sendOrders(obj) {

		this.setState({
			disabledBtnSend: true,
			orderType: 'order' // <--- ДОДАЄМО ЦЕЙ РЯДОК
		})

		const { hasAccount, event, idThisCustomers } = obj

		event.preventDefault()

		let randomTime = Math.random() * 1000

		console.log('randomTime', +(randomTime / 1000).toFixed(1))

		// successfulInfo ```````
		let successfulOrder = document.getElementById('blockInfo')

		let successfulInfo = `Обробка даних...`

		let successfulOrder_Info = document.getElementById('blockInfo').querySelector('p.text-info')

		successfulOrder_Info.innerHTML = successfulInfo
		successfulOrder_Info.classList.add("font-weight-bold")
		successfulOrder.classList.remove("d-none")

		// successfulInfo .........   

		setTimeout(async () => {

			let emailAccount

			if (!hasAccount) {

				let { name, tel, email } = this.state

				if (window.localStorage.getItem('idThisCustomers')) {
					this.props.customers.forEach(customer => {
						if (customer.id === +window.localStorage.getItem('idThisCustomers')) {
							name = customer.name
							tel = customer.tel
							email = customer.email
						}
					})
				}

				emailAccount = email

				const thisCustomerEmailInBase = this.props.customers.filter(customer => customer.email === emailAccount)[0]

				const isThisCustomerEmailInBase = thisCustomerEmailInBase ? true : false

				if (!isThisCustomerEmailInBase) {
					this.props.addNewCustomer({ email, name, tel, hasAccount, auth: false })
				} else {
					const auth = thisCustomerEmailInBase.auth

					if (auth) {

						let errorAuthInfo = `Вибачте, під цим емейлом вже зареєстрований користувач, авторизуйтеся або введіть інший емейл!!!`

						successfulOrder_Info.innerHTML = errorAuthInfo
						successfulOrder_Info.classList.add("text-danger")

						this.props.errorFunctionCart()

						return

					} else {
						this.props.addNewCustomer({ email, name, tel, hasAccount, auth: false })
					}

				}

			} else {
				emailAccount = this.props.customers.filter(customer => customer.id === this.props.customerId)[0].email
			}

			try {

				console.log('sending_your_order...')

				// отримуємо поточні замовлення
				let orders = []
				try {
					const responseOrders = await axios.get(`orders.json`)
					orders = responseOrders.data ?? []
				} catch (err) {
					console.error('Помилка отримання orders:', err)
				}

				let { ordersThis } = this.getThisOrder(orders, idThisCustomers)
				const arrThisCart = ordersThis.cart

				// Додаємо замовлення до історії (без змін у products)
				this.props.addProductWithCartToOrdersHistory({ customerId: this.props.customerId, email: emailAccount })

				// очищення кошика
				const formControls = Object.assign({ ...this.state.formControls })

				Object.keys(formControls).forEach(name => {
					formControls[name].value = ''
					formControls[name].valid = false
					formControls[name].touched = false
				})

				this.setState({
					formControls, email: ""
				})

				let successfulInfo = `Замовлення відправлене, ми з Вами зв\'яжемося найближчим часом! Щоб відслідковувати свої замовлення перейдіть у "Ваші оформлені замовлення!" ↓`

				let successfulOrder = document.getElementById('blockInfo')

				let errorInfo = document.getElementById('blockInfo').querySelector('.errorInfo')
				let successInfo = document.getElementById('blockInfo').querySelector('.successInfo')

				successfulOrder_Info.classList.remove("font-weight-bold")
				successfulOrder_Info.classList.remove("text-danger")
				successfulOrder_Info.innerHTML = successfulInfo

				this.setState({
					successfulOrder: true
				})

				successfulOrder.classList.remove("d-none")
				errorInfo.classList.add("d-none")
				successInfo.classList.remove("d-none")

				this.setState({
					isOrdersThisCart: false
				})

			} catch (e) {

				console.log('Помилка замовлення:', e);

			} finally {

				// 🔓 завжди розблоковуємо кнопку
				this.setState({ disabledBtnSend: false });

			}

		}, randomTime)

	}



	submitHandler = event => {
		event.preventDefault()
	}

	validateControl(value, validation) {
		if (!validation) {
			return true
		}

		let isValid = true

		if (validation.required) {
			isValid = value.trim() !== '' && isValid
		}

		if (validation.email) {
			isValid = is.email(value) && isValid
		}

		if (validation.minLength) {
			isValid = value.length >= validation.minLength && isValid
		}

		return isValid
	}


	onChangeHandler = (event, controlName) => {

		const formControls = { ...this.state.formControls }
		const control = { ...formControls[controlName] }

		control.value = event.target.value
		control.touched = true
		control.valid = this.validateControl(control.value, control.validation)

		formControls[controlName] = control

		let isFormValid = true

		Object.keys(formControls).forEach(name => {
			isFormValid = formControls[name].valid && isFormValid
		})

		this.setState({
			formControls, isFormValid, [event.target.id]: event.target.value
		})
	}

	renderInputs() {
		return Object.keys(this.state.formControls).map((controlName, index) => {
			const control = this.state.formControls[controlName]
			return (
				<Input
					className={"w-100"}
					id={control.id}
					htmlFor={control.htmlFor}
					key={controlName + index}
					type={control.type}
					value={control.value}
					name={control.name}
					valid={control.valid}
					touched={control.touched}
					label={control.label}
					shouldValidate={!!control.validation}
					errorMessage={control.errorMessage}
					onChange={event => this.onChangeHandler(event, controlName)}
				/>
			)
		})
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

	//    onClickQuality(obj) {
	//        let {value: quantity, id, maxQuantity, quantityInCart} = obj
	//
	//        let elem = document.querySelector(`p[id = warning_cart_${id}]`)
	//        let thisProductInBase = +document.querySelector(`span[id = quantity_product_${id}_in_cart]`).textContent
	//console.log('quantity', quantity)
	//console.log('maxQuantity', maxQuantity)
	//console.log('quantityInCart', quantityInCart)
	//console.log('thisProductInBase', thisProductInBase)
	//                
	//        
	//        let nowThisProductInBase = +(thisProductInBase - (+(quantity - quantityInCart).toFixed(1))).toFixed(1)
	//console.log('nowThisProductInBase', nowThisProductInBase)
	//        document.querySelector(`span[id = quantity_product_${id}_in_cart]`).innerHTML = nowThisProductInBase
	//        
	//        if(quantity === maxQuantity) {
	//            elem.classList.add("shadow")
	//        } else {
	//            elem.classList.remove("shadow")
	//        }       
	//
	//    }

	totalPriceCart() {

		let priceAllProduct = [...document.querySelectorAll(`span[name = product_price_cart]`)]

		const totalPrice = +(priceAllProduct.map(product => +product.innerText).reduce((sum, elem) => sum + elem, 0)).toFixed(1)

		document.querySelector('#totalPrice').innerHTML = totalPrice
	}


	onBlurQuantity(obj) {

		let { value: quantity, price, id, stepunits, quantityInBase, quantityInCart } = obj
		let { quantityAdd, orders, customerId } = obj

		let elem = document.querySelector(`p[id = warning_cart_${id}]`)

		//        let nowThisProductInBase = +(quantityInBase - (+(quantity - quantityInCart).toFixed(1))).toFixed(1)
		//console.log('nowThisProductInBase', nowThisProductInBase)
		//        document.querySelector(`span[id = quantity_product_${id}_in_cart]`).innerHTML = nowThisProductInBase

		let maxQuantity = quantityInBase

		if (quantity >= maxQuantity) {
			elem.classList.add("shadow")
		} else {
			elem.classList.remove("shadow")
		}

		if (quantity < stepunits) {
			return
		}

		let thisPrice = +(+price * +quantity).toFixed(1)
		document.querySelector(`p[id = product_price_${id}_cart]`).querySelector('span').innerHTML = thisPrice

		this.totalPriceCart()

		//

		this.onChangeQuantity({ quantity, quantityAdd, id, orders, customerId })

	}

	onChangeQuantity(obj) {
		let { quantity, quantityAdd, id, orders, customerId } = obj

		let { indexOrders, ordersThis } = this.getThisOrder(orders, customerId)


		const cart = ordersThis.cart

		cart.forEach(product => {
			if (product.id === id) {
				product.quantity = quantity
			}
		})

		//        orders[indexOrders] = ordersThis

		const db = firebase.database()
		db.ref(`orders/${indexOrders}`).update(ordersThis)

		//        this.totalPriceCart()



		//    return dispatch => { 
		//        dispatch(updateOrders(orders)) 
		//    }

	}



	//    async productQuantityInCar(id) {
	//        
	//        let productQuantityInCar
	//        
	//        const responseOrders = await axios.get(`orders.json`)
	//        const ordersData = responseOrders.data         
	//        ordersData.forEach(order => {
	//            let cart = order.cart
	//            cart.forEach(cartItem => {
	//                if(cartItem.id === id) {
	//                    productQuantityInCar = cartItem.quantity
	//                }
	//            })
	//        })   
	//        
	//        return productQuantityInCar
	//    }

	onClickArrow(obj) {

		let { clickevent, id } = obj

		let divInputNumber =
			document.querySelector(`.divInputNumber_${id}`),
			numberPlus = divInputNumber.querySelector('.arrow_plus'),
			numberMinus = divInputNumber.querySelector('.arrow_minus'),
			numberInput = divInputNumber.querySelector('[type="number"]'),
			min = +numberInput.getAttribute('min'),
			max = +numberInput.getAttribute('max'),
			step = +numberInput.getAttribute('step') || 1

		let valueInput = +numberInput.value

		numberInput.focus()

		if (clickevent === "plus") {

			if (!(max < valueInput + step)) {
				//                numberInput.value = (valueInput * 10 + step * 10) / 10
				numberInput.value = +(valueInput + step).toFixed(1)

			} else {
				numberInput.value = max
			}

		} else if (clickevent === "minus") {

			if (!(min > valueInput - step)) {
				//                numberInput.value = (valueInput * 10 - step * 10) / 10
				numberInput.value = +(valueInput - step).toFixed(1)
			} else {
				numberInput.value = min
			}

		}

		numberInput.blur()

	}

	updateIsOrdersThisCart = () => {

		this.handleShow()

		const orders = this.props.orders
		const customerId = this.props.customerId

		let { ordersThis } = this.getThisOrder(orders, customerId)

		let isOrdersThisCart = false

		if (ordersThis) {
			let ordersThisCart = Object.keys(ordersThis).filter(order => order === 'cart')[0] ? true : false
			if (ordersThisCart) {
				isOrdersThisCart = ordersThis.cart[0] ? true : false
			}
		}

		this.setState({
			isOrdersThisCart
		})

	}

	onDelete(obj) {

		const { id, customerId } = obj

		let ordersInCar = [...document.querySelectorAll(`.order_product_in_cart`)]

		if (ordersInCar.length === 1) {
			this.setState({
				isOrdersThisCart: false
			})
		}

		this.props.onDelete({ id, customerId })

	}


	renderOrders() {
		const orders = this.props.orders
		const products = this.props.products
		const customerId = this.props.customerId

		// 1. ЗАПОБІЖНИК: перевірка наявності основних даних
		if (!orders || !products || !customerId) return null;

		let { ordersThis } = this.getThisOrder(orders, customerId)

		// 2. ЗАПОБІЖНИК: перевірка чи знайдено замовлення і кошик
		if (!ordersThis || !ordersThis.cart) {
			return this.state.successfulOrder ? null : <h6 className="my-5 text-danger" id="nullProduct">До кошика не обрано товарів !!!</h6>
		}

		if (this.state.isOrdersThisCart) {
			const thisCart = ordersThis.cart

			if (thisCart) {
				return (
					thisCart.map(product => {
						const { id } = product

						const thisProduct = products.filter(product => {
							return (
								product.id === id
							)
						})[0]

						// 3. ЗАПОБІЖНИК: якщо товар зник з бази
						if (!thisProduct) return null;

						const thisOrder = orders.filter(order => {
							return (
								order.customerId === customerId
							)
						})[0]

						// 4. ЗАПОБІЖНИК: якщо замовлення зникло під час оновлення
						if (!thisOrder || !thisOrder.cart) return null;

						const thisCartFiltered = thisOrder.cart.filter(cart => {
							return (
								cart.id === id
							)
						})[0]

						// 5. ЗАПОБІЖНИК: якщо елемент кошика не знайдено
						if (!thisCartFiltered) return null;

						const productQuantityInCar = thisCartFiltered.quantity

						return (
							<div
								key={thisProduct.id}
								className={`row w-100 mx-0 py-3 justify-content-between border-top border-bottom product_cart order_product_in_cart`}
								id={`product_cart_${thisProduct.id}`}
							>
								<NavLink to={'/product/' + thisProduct.id} className="col-11 col-md-6 d-flex align-items-center order-1 mb-3 mb-md-0 px-0" onClick={this.handleClose}>

									<div className={`mb-3 ${classes.productFoto}`} style={{ backgroundImage: `url(${thisProduct.image})`, backgroundSize: 'cover' }}></div>
									<p className="ml-1 ml-sm-3 font-weight text-dark">
										{thisProduct.name}
										<br />
										{thisProduct.promotion ?
											<span className={`text-uppercase text-danger  ${classes.spanPromotion}`}>Акція {thisProduct.promotion}%</span>
											: null
										}
									</p>

								</NavLink>
								<div className="col-12 col-md-5 d-flex justify-content-between align-items-center order-3 order-md-2 pl-0  pr-1 pr-sm-3">

									<div className={`divInputNumber divInputNumber_${thisProduct.id} mx-right position-relation`}>

										<div className="arrow arrow_minus d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'minus', id: thisProduct.id })} ><i className="fa fa-minus" aria-hidden="true"></i></div>

										<Input type="number" labelDisplay="d-none" min={thisProduct.stepunits} step={thisProduct.stepunits} max={`${thisProduct.quantity}`} className={`inputNumber ${classes.input_in_cart} text-center`} name={`quantity_product_${thisProduct.id}`} data_price={`${thisProduct.price}`} defaultValue={product.quantity} onBlur={event => this.onBlurQuantity({ value: +event.target.value, price: this.props.priceIncludedPromotion(thisProduct.price, thisProduct.promotion), id: thisProduct.id, quantityInBase: thisProduct.quantity, quantityInCart: product.quantity, stepunits: thisProduct.stepunits, quantityAdd: productQuantityInCar - (+event.target.value), orders, customerId })} />

										<div className="arrow arrow_plus  d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'plus', id: thisProduct.id })} ><i className="fa fa-plus" aria-hidden="true"></i></div>

									</div>

									<p className="mb-0" id={`product_price_${thisProduct.id}_cart`}><span name="product_price_cart">{+(this.props.priceIncludedPromotion(thisProduct.price, thisProduct.promotion) * product.quantity).toFixed(1)}</span> грн</p>

								</div>
								<div className="col-1 col-md-1 d-flex justify-content-center align-items-center order-2 order-md-3 px-0">
									<i className={`fa fa-trash ${classes.deleteIcon}`} aria-hidden="true" onClick={event => this.onDelete({ id: thisProduct.id, customerId })}></i>
								</div>
								<div className="col order-4 px-0">
									{this.props.authAdmin
										? <p className="mb-0 text-danger mt-3 rounded p-2" id={`warning_cart_${thisProduct.id}`} >Доступно в магазині: <span className="text-primary" id={`quantity_product_${thisProduct.id}_in_cart`}>{this.state[`product_${thisProduct.id}`] ? this.state[`product_${thisProduct.id}`] : thisProduct.quantity}</span> <span className={'text-primary'} >{thisProduct.units}</span></p>
										: product.quantity
											? <p className="mb-0 text-success mt-1 mt-sm-3 rounded p-2" id={`warning_cart_${thisProduct.id}`} >Товар є в наявності</p>
											: <p className="mb-0 text-danger mt-1 mt-sm-3 rounded p-2" id={`warning_cart_${thisProduct.id}`} >Товару немає в наявності</p>
									}
								</div>
							</div>
						)
					})
				)
			}
		} else {
			return this.state.successfulOrder ? null : <h6 className="my-5 text-danger" id="nullProduct">До кошика не обрано товарів !!!</h6>
		}
	}

	renderModalCart() {

		const orders = [...this.props.orders]
		let idThisCustomers = this.props.customerId

		let { ordersThis } = this.getThisOrder(orders, idThisCustomers)

		//        let statusButtonDisabled = (this.props.hasAccount ? false : !this.state.isFormValid) || !this.state.isOrdersThisCart

		//        let valid = this.props.customerName === 'Шановний клієнт' ? false : true

		return (
			<React.Fragment>
				<Button
					selfType="primary"
					disabled={this.props.customerId === null ? true : false}
					onClick={this.updateIsOrdersThisCart}
					className={`mr-3 position-relative ${classes.btnCart}`}
				>
					&nbsp;
					<i className="fa fa-shopping-basket" aria-hidden="true"></i>
					&nbsp;
					{(ordersThis ? ordersThis.cart.length : null)}
					&nbsp;
					{this.calculationTotalPriceForCart()
						?
						<div className={`h-100 position-absolute totalPriceInCart d-inline-flex align-items-center`} style={this.calculationTotalPriceForCart() > 100 ? this.calculationTotalPriceForCart() > 1000 ? { left: '-52px' } : { left: '-52px' } : { left: '-47px' }} >
							<p className={`mb-0`}>
								{this.calculationTotalPriceForCart()} грн
							</p>
						</div>
						: null
					}

				</Button>

				<Modal show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="py-1 align-items-center">
						<Modal.Title>Кошик</Modal.Title>
					</Modal.Header>
					<Modal.Body className={`py-0 ${classes.modalBodyCart}`} >
						<div className={`h-100 overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToBottom scrollToTop scrollToErrorCart infoAboutCustomer`} onScroll={this.props.onScrollCart} >
							{!this.state.successfulOrder ?
								<p className="mb-0 text-success" data-idthiscustomers={idThisCustomers}>
									{`Доброго дня, ${this.props.customerName ? this.props.customerName : null} !`}
									<span className="d-none text-danger">{`, your id = ${idThisCustomers}`}</span>
								</p>
								: null
							}

							{!this.state.isOrdersThisCart
								? null
								: <p>Ваше замовлення: </p>
							}

							<form onSubmit={event => this.sendOrders({ hasAccount: this.props.hasAccount, event, idThisCustomers })}  >
								<div>
									<div className={`${classes.renderOrders}`} >
										{this.renderOrders()}

									</div>
								</div>


								<div id={'blockInfo'} className="d-none my-3 flex-column flex-sm-row justify-content-between align-items-center p-2 shadow text-info">
									<h2 className="errorInfo text-dark d-none"><span className="text-danger">Вибачте!!!</span> Такої кількості товару <span className="text-danger nameProducts"></span> немає в наявності.  <br />На складі залишилося:</h2>
									<h2 className="successInfo text-success d-none">Вітаємо&nbsp;
										{this.props.customerName ? this.props.customerName : null} !!! </h2>
									<p className="text-info font-weight-bold"></p>

								</div>


								{!this.state.isFormValid && this.state.isOrdersThisCart ?

									<div className="d-flex flex-column flex-sm-row justify-content-between align-items-center py-2">
										<p className="mr-sm-3 font-weight-bold">Загальна сума:&nbsp;
											<span className="text-primary" id="totalPrice">
												{this.calculationTotalPriceForCart()}
											</span> <span className="text-primary">грн</span>
										</p>

										<Button
											type="button"
											id={'goToBottomCart'}
											onClick={this.props.bottomFunctionCart}
											className="btn btn-warning"
										>
											Оформити замовлення
										</Button>

									</div>
									: null

								}

								{this.props.customerName === 'Шановний клієнт' && !this.state.isFormValid ?
									<div>
										<p className={'pt-3 mb-1 text-danger'}>Щоб оформити замовлення введіть свої дані у формі нижче!!! <span><i className={"fa fa-arrow-down"} aria-hidden="true"></i></span></p>
									</div>
									: null}

								{this.state.isFormValid ?
									this.state.isOrdersThisCart ?
										// --- БЛОК З КНОПКАМИ (Кошик ще не порожній) ---
										<div>
											<div className="d-flex flex-column flex-sm-row justify-content-between align-items-center py-2">
												<p className="mr-sm-3 font-weight-bold">Загальна сума: {this.calculationTotalPriceForCart()} грн</p>
												<Button
													type="submit"
													className="btn btn-success"
													disabled={this.state.disabledBtnSend}
													// Додаємо тип 'order' при натисканні
													onClick={() => this.setState({ orderType: 'order' })}
												>
													Оформити замовлення
												</Button>
											</div>

											<div className="d-flex flex-column flex-sm-row justify-content-between align-items-center py-2">
												<p className="mr-sm-3 font-weight-bold">Кількість позицій: {this.calculationTotalQuantityOfInvoiceItems()} шт</p>
												<Button
													type="button"
													className="btn btn-success"
													disabled={this.state.disabledBtnSend}
													onClick={(event) => {
														// Встановлюємо тип 'stock'
														this.setState({ orderType: 'stock' });
														this.addProductToStock({
															hasAccount: this.props.hasAccount,
															event,
															idThisCustomers
														});
													}}
												>
													Поповнити склад
												</Button>
											</div>
										</div>

										:

										// --- БЛОК ПІСЛЯ ВІДПРАВКИ (Кошик порожній) ---
										<div className="d-flex justify-content-center align-items-center py-2">

											{/* Показуємо "Замовлення", якщо натиснули першу кнопку */}
											{this.state.orderType === 'order' && (
												<NavLink to={'/your-orders'} className={`btn btn-success d-block mb-3 ${classes.btnBack}`} onClick={this.handleClose}>
													Ваші оформлені замовлення!
												</NavLink>
											)}

											{/* Показуємо "Склад", якщо натиснули другу кнопку */}
											{this.state.orderType === 'stock' && (
												<NavLink to={'/invoice-stock'} className={`btn btn-success d-block mb-3 ${classes.btnBack}`} onClick={this.handleClose}>
													Ваші поповнення складу!
												</NavLink>
											)}

										</div>
									: null
								}

								{this.state.authAndReg ?
									<div>
										<p className={'pt-3 text-info'}>Ввійдіть до свого аккаунта або зареєструйтеся!</p>
										<NavLink
											to={'/auth'}

										>
											<Button
												selfType="success"
												id="btn_go_to_auth"
												onClick={this.handleClose}
											>
												Вхід
											</Button>
										</NavLink>
										<span className={'mr-3'}></span>
										<NavLink
											to={'/registr'}

										>
											<Button
												selfType="primary"
												id="btn_go_to_auth"
												onClick={this.handleClose}
											>
												Реєстрація
											</Button>
										</NavLink>
									</div>
									: null
								}

								{this.props.customerName === 'Шановний клієнт' ?
									<div className={classes.Registr}>
										<div>

											<form onSubmit={this.submitHandler} className={classes.RegistrForm}>

												{this.renderInputs()}

											</form>

										</div>

									</div>
									: null}

							</form>

							<Button
								type="button"
								style={{ display: 'none' }}
								id={'goToTopCart'}
								onClick={this.props.topFunctionCart}
								className={`btn btn-danger ${classes.btnTop}`}
							>
								<i className="fa fa-arrow-up" aria-hidden="true"></i>
							</Button>
						</div>

					</Modal.Body>
					<Modal.Footer className="d-flex justify-content-start infoAboutCustomer">

						<p className="text-success text-uppercase font-weight-bold">
							Ми стараємося для Вас !!!
						</p>

					</Modal.Footer>
				</Modal>

			</React.Fragment>
		)

	}

	calculationTotalPriceForCart() {

		const orders = [...this.props.orders]
		const customerId = this.props.customerId
		let { ordersThis } = this.getThisOrder(orders, customerId)

		if (ordersThis) {
			return (
				ordersThis.customerId === this.props.customerId
					? ordersThis.cart

						? +(ordersThis.cart.map(product => {

							const { id } = product
							const thisProduct = this.props.products.filter(product => {
								return (
									product.id === id
								)
							})[0]

							let totalPrice = +(product.quantity * this.props.priceIncludedPromotion(thisProduct.price, thisProduct.promotion)).toFixed(1)

							return totalPrice

							//                        if (thisProduct) {
							//                            let totalPrice = product.quantity*thisProduct.price
							//
							//                            return totalPrice
							//                        } else {
							//                            return 0
							//                        }

						}

						).reduce((sum, val) => sum + val, 0)).toFixed(1)
						: null
					: null
			)
		} else {
			return null
		}

	}

	calculationTotalQuantityOfInvoiceItems() {

	}

	componentDidMount() {

	}

	render() {

		return (
			<div className={classes.Cart}>

				<div className="container px-0">
					{this.renderModalCart()}
				</div>

			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		orders: state.products.orders,
		products: state.products.products,
		customers: state.inform.customers,
		customerId: state.inform.customerId,
		customerName: state.inform.customerName,
		hasAccount: state.inform.hasAccount,
		authAdmin: state.inform.authAdmin,
		isOrdersThisCart: state.products.isOrdersThisCart,
		isQuantProdInDB: state.products.isQuantProdInDB
	}
}

function mapDispatchToProps(dispatch) {
	return {
		addNewCustomer: obj => dispatch(addNewCustomer(obj)),
		addProductWithCartToOrdersHistory: obj => dispatch(addProductWithCartToOrdersHistory(obj)),
		updateIsOrdersThisCart: isOrdersThisCart => dispatch(updateIsOrdersThisCart(isOrdersThisCart)),
		onDelete: obj => dispatch(onDelete(obj)),
		setQuantityAll: (quantityAdd, id) => dispatch(setQuantityAll(quantityAdd, id)),
		priceIncludedPromotion: (price, promotion) => dispatch(priceIncludedPromotion(price, promotion)),
		onScrollCart: () => dispatch(onScrollCart()),
		topFunctionCart: () => dispatch(topFunctionCart()),
		bottomFunctionCart: () => dispatch(bottomFunctionCart()),
		errorFunctionCart: () => dispatch(errorFunctionCart()),
		addProductToInvoiceStock: (obj) => dispatch(addProductToInvoiceStock(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Cart)
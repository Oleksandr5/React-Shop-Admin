import React, { Component } from 'react'
import classes from './ProductPage.module.css'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import Loader from '../../components/UI/Loader/Loader'
import axios from '../../axios/axios-quiz'
import firebase from 'firebase'
import { connect } from 'react-redux'
import { addProductToCart, priceIncludedPromotion } from '../../redux/actions/products'
import { NavLink } from 'react-router-dom'
import { addNewUnKnownCustomer } from '../../redux/actions/inform'

class ProductPage extends Component {

	onChangeQuantity(obj) {
		let { value: quantity, price, promotion, id, maxQuantity, stepunits } = obj

		if (quantity < stepunits) {
			return
		}

		let thisPrice = +(this.props.priceIncludedPromotion(price, promotion) * quantity).toFixed(1)

		document.querySelector(`span[id = product_price_${id}]`).innerHTML = thisPrice

	}


	addProductToCart(obj) {

		const { event, productId, price, promotion, customerId, stepunits } = obj
		event.preventDefault()

		this.props.addProductToCart({ event, productId, customerId, price, promotion, stepunits })
	}

	onMaxQuantity(obj) {

		let { value: quantity, maxQuantity, id } = obj

		let elem = document.querySelector(`p[id = warning_${id}]`)
		if (quantity >= maxQuantity) {
			elem.classList.add("shadow")
		} else {
			elem.classList.remove("shadow")
		}

	}

	onClickArrow(obj) {

		let { clickevent, id, maxQuantity } = obj

		let divInputNumber =
			document.querySelector(`.divInputNumberProduct_${id}`),
			numberPlus = divInputNumber.querySelector('.arrow_plus'),
			numberMinus = divInputNumber.querySelector('.arrow_minus'),
			numberInput = divInputNumber.querySelector('[type="number"]'),
			quantity = +numberInput.value,
			min = +numberInput.getAttribute('min'),
			max = +numberInput.getAttribute('max'),
			step = +numberInput.getAttribute('step') || 1

		let valueInput = +numberInput.value

		numberInput.focus()

		if (clickevent === "plus") {

			if (!(max <= valueInput + step)) {
				numberInput.value = (valueInput * 10 + step * 10) / 10
			} else {
				numberInput.value = max
			}

		} else if (clickevent === "minus") {

			if (!(min > valueInput - step)) {
				numberInput.value = (valueInput * 10 - step * 10) / 10
			} else {
				numberInput.value = min
			}

		}

		numberInput.blur()

		this.onMaxQuantity({ value: quantity, maxQuantity, id })

	}

	//    goToHomePage = () => {
	//        this.props.history.push({
	//            pathname: '/'
	//        })
	//    }

	componentDidMount() {

	}

	render() {

		let url = window.location.pathname;
		let id = +url.substring(url.lastIndexOf('/') + 1);
		let thisProduct = this.props.products.filter(product => product.id === id)[0]
		return (
			this.props.loading

				? <Loader />
				: this.props.products[0]
					?
					<div className="overflow-auto webkit_scrollbar_width webkit_scrollbar_style">
						<NavLink to={'/'} className={`d-block mb-2 btnBack`} >
							<i className="fa fa-arrow-left" aria-hidden="true"></i> Вернутись на головну
						</NavLink>

						<div className={`d-flex flex-column col col-xs-6 col-sm-6 col-md-6 col-lg-4 border p-3 ${classes.Product}`}>
							<div>
								<div className={`w-100 mb-3 ${classes.productFoto}`} style={{ backgroundImage: `url(${thisProduct.image})`, backgroundSize: 'cover' }}>
								</div>
								<h3>{thisProduct.name}</h3>
							</div>

							<div className={`p-1 mb-2 border rounded overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.describe}`}>
								<p>{thisProduct.describe}</p>
							</div>

							<p className={`text-info mb-1 mb-xs-3 mt-auto ${classes.pPrice}`}  >
								<span>{thisProduct.promotion ? <span><span className={`text-uppercase text-danger ${classes.spanPromotion}`}>Акція {thisProduct.promotion}%</span> <br /><s className={`text-dark`}><span>{+thisProduct.price.toFixed(1)}</span></s> <span>{this.props.priceIncludedPromotion(thisProduct.price, thisProduct.promotion)}</span></span> : <span>{+thisProduct.price.toFixed(1)}</span>}</span> грн / {thisProduct.units}
							</p>

							<form onSubmit={event => this.addProductToCart({ event, productId: thisProduct.id, customerId: this.props.customerId, price: thisProduct.price, promotion: thisProduct.promotion, stepunits: thisProduct.stepunits })} className={`d-flex align-items-center justify-content-between w-100 product_cart ${classes.productFooter}`} id={`${thisProduct.id}`}>

								<div className={`divInputNumber divInputNumberProduct_${thisProduct.id}  ${classes.divInputNum} mx-right position-relation`}>

									<div className="arrow arrow_minus d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'minus', id: thisProduct.id, maxQuantity: thisProduct.quantity })} ><i className="fa fa-minus" aria-hidden="true"></i></div>

									<Input id={`input_product_${thisProduct.id}`} type="number" labelDisplay="d-none" className={`inputNumber text-center`} min={thisProduct.stepunits} step={thisProduct.stepunits} max={`${thisProduct.quantity}`} name={`product_${thisProduct.id}`} defaultValue={thisProduct.quantity ? 1 : 0} data_price={`${thisProduct.price}`} data_quantity={`${thisProduct.quantity}`} onFocus={event => this.onMaxQuantity({ value: +event.target.value, maxQuantity: thisProduct.quantity, id: thisProduct.id })} onBlur={event => this.onChangeQuantity({ value: +event.target.value, price: thisProduct.price, promotion: thisProduct.promotion, id: thisProduct.id, maxQuantity: thisProduct.quantity, stepunits: thisProduct.stepunits })} />

									<div className="arrow arrow_plus  d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'plus', id: thisProduct.id, maxQuantity: thisProduct.quantity })} ><i className="fa fa-plus" aria-hidden="true"></i></div>

								</div>

								<Button
									type="submit"
									id={thisProduct.id}
									onClick={!window.localStorage.getItem('idThisUnKnownCustomers') ? this.props.addNewUnKnownCustomer : null}
									selfType="success"
									className="btn btn-success btn_to_cart"
									disabled={!thisProduct.quantity}
								>
									<i className="fa fa-shopping-basket" aria-hidden="true"></i>
								</Button>
							</form>

							<p className={`text-success mb-1 mb-xs-3 mt-auto ${classes.pPrice}`}  >
								<span className={`text-info font-weight-bold`}>Total: </span>
								<span id={`product_price_${thisProduct.id}`}>{this.props.priceIncludedPromotion(thisProduct.price, thisProduct.promotion)}</span> грн
							</p>

							{this.props.authAdmin
								? <p className="mb-0 text-danger rounded" id={`warning_${thisProduct.id}`} >Доступно: <span className="text-primary">{`${thisProduct.quantity} ${thisProduct.units}.`}</span></p>
								: thisProduct.quantity
									? <p className="mb-0 text-success rounded" id={`warning_${thisProduct.id}`} >Товар є в наявності</p>
									: <p className="mb-0 text-danger rounded" id={`warning_${thisProduct.id}`} >Товару немає в наявності</p>
							}
						</div>
					</div>
					:
					<div className={`d-flex flex-column col col-xs-6 col-sm-6 col-md-6 col-lg-4 border p-3 ${classes.Product}`}>
						<h2 className="mx-auto text-center">Товар не знайдено!!! </h2>
					</div>
		)


	}
}

function mapStateToProps(state) {
	return {
		customerId: state.inform.customerId,
		authAdmin: state.inform.authAdmin,
		products: state.products.products,
		loading: state.products.loading,
		orders: state.products.orders
	}
}

function mapDispatchToProps(dispatch) {
	return {
		addProductToCart: obj => dispatch(addProductToCart(obj)),
		priceIncludedPromotion: (price, promotion) => dispatch(priceIncludedPromotion(price, promotion)),
		addNewUnKnownCustomer: () => dispatch(addNewUnKnownCustomer())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductPage)
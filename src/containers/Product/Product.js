import React, { Component } from 'react'
import classes from './Product.module.css'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import axios from '../../axios/axios-quiz'
import { connect } from 'react-redux'
import { addProductToCart, priceIncludedPromotion } from '../../redux/actions/products'
import { NavLink } from 'react-router-dom'
import { addNewUnKnownCustomer } from '../../redux/actions/inform'

class Product extends Component {

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

	componentDidMount() {

	}

	render() {

		return (
			<div className={`mb-3 d-flex flex-column col-6 col-xs-6 col-sm-6 col-md-4 col-lg-4 border px-2 py-2 px-sm-3 ${classes.Product}`}>
				<NavLink className={`${classes.a_to_product_page}`} to={'/product/' + this.props.id}>
					<div className={`w-100 mb-1 ${classes.productFoto}`} style={{ backgroundImage: `url(${this.props.image})`, backgroundSize: 'cover' }}>
					</div>
					<h3 className={`mb-1 d-flex align-items-center`}>{this.props.name}</h3>
				</NavLink>

				<div className={`p-1 mb-2 border rounded overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.describe}`}>
					<p>{this.props.describe}</p>
				</div>

				<p className={`d-flex align-items-end text-success mb-xs-2 mt-2 ${classes.pPrice}`}  >
					<span>
						{this.props.promotion
							?
							<span>
								<span className={`text-uppercase text-danger  ${classes.spanPromotion}`}>Акція {this.props.promotion}%</span>
								<br />
								<s className={`${classes.priseWithoutPromotion}`}><span>{+this.props.price.toFixed(1)} грн</span></s>
									&nbsp;
									<span>{this.props.priceIncludedPromotion(this.props.price, this.props.promotion)}
								</span>
							</span>
							: <span>{+this.props.price.toFixed(1)}</span>
						} грн / {this.props.units}
					</span>
				</p>

				<form onSubmit={event => this.addProductToCart({ event, productId: this.props.id, customerId: this.props.customerId, price: this.props.price, promotion: this.props.promotion, stepunits: this.props.stepunits })} className={`d-flex align-items-center justify-content-between w-100 product_cart ${classes.productFooter}`} id={`${this.props.id}`}>

					<div className={`divInputNumber divInputNumberProduct_${this.props.id}  ${classes.divInputNum} mx-right position-relation`}>

						<div className="arrow arrow_minus d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'minus', id: this.props.id, maxQuantity: this.props.quantity })} ><i className="fa fa-minus" aria-hidden="true"></i></div>

						<Input id={`input_product_${this.props.id}`} type="number" labelDisplay="d-none" className={`inputNumber text-center`} min={this.props.stepunits} step={this.props.stepunits} max={`${this.props.quantity}`} name={`product_${this.props.id}`} defaultValue={this.props.quantity ? 1 : 0} data_price={`${this.props.price}`} data_quantity={`${this.props.quantity}`} onFocus={event => this.onMaxQuantity({ value: +event.target.value, maxQuantity: this.props.quantity, id: this.props.id })} onBlur={event => this.onChangeQuantity({ value: +event.target.value, price: this.props.price, promotion: this.props.promotion, id: this.props.id, maxQuantity: this.props.quantity, stepunits: this.props.stepunits })} />

						<div className="arrow arrow_plus  d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'plus', id: this.props.id, maxQuantity: this.props.quantity })} ><i className="fa fa-plus" aria-hidden="true"></i></div>

					</div>

					<Button
						type="submit"
						id={`prod_${this.props.id}`}
						onClick={!window.localStorage.getItem('idThisCustomers') && window.localStorage.getItem('idThisCustomers') !== 0 ? this.props.addNewUnKnownCustomer : null}
						selfType="success"
						className="btn btn-success btn_to_cart"
						disabled={!this.props.quantity}
					>
						<i className="fa fa-shopping-basket" aria-hidden="true"></i>
					</Button>
				</form>

				<p className={`mb-1 mb-xs-3 font-weight-bold`}  >
					<span>Total: </span>
					<span className={`text-info`} id={`product_price_${this.props.id}`}>{this.props.priceIncludedPromotion(this.props.price, this.props.promotion)} грн</span>
				</p>

				{this.props.authAdmin
					? <p className="mb-0 text-danger rounded" id={`warning_${this.props.id}`} >Доступно: <span className="text-primary">{`${this.props.quantity} ${this.props.units}.`}</span></p>
					: this.props.quantity
						? <p className="mb-0 text-success rounded" id={`warning_${this.props.id}`} >Є в наявності</p>
						: <p className="mb-0 text-danger rounded" id={`warning_${this.props.id}`} >Немає в наявності</p>
				}

			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		customerId: state.inform.customerId,
		orders: state.products.orders,
		authAdmin: state.inform.authAdmin
	}
}

function mapDispatchToProps(dispatch) {
	return {
		addProductToCart: obj => dispatch(addProductToCart(obj)),
		priceIncludedPromotion: (price, promotion) => dispatch(priceIncludedPromotion(price, promotion)),
		addNewUnKnownCustomer: () => dispatch(addNewUnKnownCustomer())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Product)
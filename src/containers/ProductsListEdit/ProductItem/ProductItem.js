import React, { Component } from 'react'
import classes from './ProductItem.module.css'
import { connect } from 'react-redux'
import orderBy from 'lodash/orderBy'
import Input from '../../../components/UI/Input/Input'
import Button from '../../../components/UI/Button/Button'
import Select from '../../../components/UI/Select/Select'
import { NavLink } from 'react-router-dom'
import firebase from 'firebase'
import { toggleProduct, removeProducts, onChangePrice, onChangeQuantity, onChangePromotion } from '../../../redux/actions/products'
import ModalEdit from '../ModalForProducts/ModalEdit/ModalEdit'

class ProductItem extends Component {

	state = {
		disabledBtnUpdatePrice: true,
		disabledBtnUpdateQuantity: true,
		disabledBtnUpdatePromotion: true,
		newPriseProduct: null,
		newQuantityProduct: null,
		newPromotionProduct: this.props.promotion
	}

	onBlurPrice(obj) {

		let { price } = obj

		this.setState({
			disabledBtnUpdatePrice: false, newPriseProduct: price
		})

	}

	updateStatusPrice(obj) {

		let { price, id } = obj

		console.log('newPrice', price)
		console.log('idProduct', id)

		if (price < 0) {
			alert("Введіть додатню ціну !!!")
			return
		}

		this.setState({
			disabledBtnUpdatePrice: true
		})

		this.props.onChangePrice({ price, id })

	}

	onBlurQuantity(obj) {

		let { quantity } = obj


		this.setState({
			disabledBtnUpdateQuantity: false, newQuantityProduct: quantity
		})

	}

	updateStatusQuantity(obj) {

		let { quantity, id } = obj

		console.log('newQuantity', quantity)
		console.log('idProduct', id)

		if (quantity < 0) {
			alert("Введіть додатню кількість !!!")
			return
		}

		this.setState({
			disabledBtnUpdateQuantity: true
		})

		this.props.onChangeQuantity({ quantity, id })

	}

	updateStatusPromotionProduct(obj) {

		let { promotion, id } = obj

		console.log('newPromotion', promotion)
		console.log('idProduct', id)

		this.setState({
			disabledBtnUpdatePromotion: true
		})

		this.props.onChangePromotion({ promotion, id })

	}

	onClickArrow(obj) {

		let { clickevent, id, divstr } = obj

		let divInputNumber =
			document.querySelector(`.${divstr}_${id}`),
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

	optionPromotionsProduct = event => {

		const thisPromotionsOptions = []

		for (let i = 0; i <= 100; i += 5) {
			thisPromotionsOptions.push({ text: i, value: i })
		}

		let thisPromotion

		thisPromotionsOptions.forEach((promotion, index) => {

			if (promotion.value === this.state.newPromotionProduct) {
				thisPromotion = promotion

				thisPromotionsOptions.splice(index, 1)
				thisPromotionsOptions.unshift(thisPromotion)
			}

		})

		return thisPromotionsOptions

	}

	onChangeSelectPromotions = event => {

		let newPromotionProduct = +event.target.value

		this.setState({
			disabledBtnUpdatePromotion: false, newPromotionProduct
		})

	}

	render() {

		const selectPromotionsProduct = <Select
			className={"selectPromotionsProduct"}
			name={`promotion_${this.props.productId}`}
			onChange={this.onChangeSelectPromotions}
			option={this.optionPromotionsProduct()}
		/>

		const { index } = this.props

		let product = orderBy(this.props.products, ['popularity', 'promotion', 'price', 'name'], ['desc', 'desc', 'asc', 'desc'])[index]

		//        if(filter) {
		//            product = this.props.selectedProductsAdmin[index]
		//        } else {
		//            product = this.props.products[index]
		//        }

		const cls = [classes.ProductItem]

		let id = product.id

		let checked = product.checked

		if (checked) {
			cls.push('done') // in index.css
		}

		const thisCategory = this.props.categories.filter(category => category.id === product.category)[0]

		const nameCategory = thisCategory.name
		const idCategory = thisCategory.id

		const thisSubcategory = thisCategory.subcategories.filter(subcategory => subcategory.id === product.subcategory)[0]

		const nameSubcategory = thisSubcategory.name
		const idSubcategory = thisSubcategory.id

		return (
			<tr className={cls.join(' ')} id={`product_table_${id}`}>
				<th>
					<div className={classes.leftTitle}>check</div>
					<div className={classes.th_value}>
						<input
							type="checkbox"

							onChange={event => {

								let checked = event.target.checked
								this.props.toggleProduct(id, checked)
							}}
							checked={checked}

						/>
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>id</div>
					<div className={classes.th_value}>{id}</div>
				</th>
				<th className={classes.th_image}>
					<div className={classes.leftTitle}>image</div>
					<div className={`ml-3 my-1 ${classes.productFoto}`} style={{ backgroundImage: `url(${product.image})`, backgroundSize: 'cover' }}></div>
				</th>
				<th className={classes.thName}>
					<div className={classes.leftTitle}>name</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>
						<NavLink className={`${classes.a_to_product_page}`} to={'/product/' + id}>
							{product.name}
						</NavLink>
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>price</div>
					<div className={`d-flex flex-column flex-sm-row py-3 py-sm-0 px-0 px-sm-3 overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>

						<div className={`divInputNumber divInputNumber_${product.id} mx-right position-relation`}>

							<div className="arrow arrow_minus d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'minus', id: product.id, divstr: 'divInputNumber' })} ><i className="fa fa-minus" aria-hidden="true"></i></div>

							<Input type="number" labelDisplay="d-none" min={0} max={10000} step={1} className={`inputNumber text-center ${classes.inputPrice}`} name={`price_product_${product.id}`} defaultValue={product.price} onBlur={event => this.onBlurPrice({ price: +event.target.value })} />

							<div className="arrow arrow_plus  d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'plus', id: product.id, divstr: 'divInputNumber' })} ><i className="fa fa-plus" aria-hidden="true"></i></div>

						</div>

						<Button
							type="button"
							id={'statusUpdate'}
							onClick={() => this.updateStatusPrice({ price: this.state.newPriseProduct, id: product.id })}
							className={`ml-0 ml-sm-3 btn btn-success btn_refresh_price_${product.id} ${classes.btnUpdate}`}
							disabled={this.state.disabledBtnUpdatePrice}
						>
							<i className="fa fa-refresh" aria-hidden="true"></i>
						</Button>

					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>quantity</div>
					<div className={`d-flex flex-column flex-sm-row py-3 py-sm-0 px-0 px-sm-3 overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>
						<div className={`divInputNumber divInputNumberQuantity_${product.id} mx-right position-relation`}>

							<div className="arrow arrow_minus d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'minus', id: product.id, divstr: 'divInputNumberQuantity' })} ><i className="fa fa-minus" aria-hidden="true"></i></div>

							<Input type="number" labelDisplay="d-none" min={0} max={10000} step={product.stepunits} className={`inputNumber text-center ${classes.inputPrice}`} name={`quantity_product_${product.id}`} defaultValue={product.quantity} onBlur={event => this.onBlurQuantity({ quantity: +event.target.value })} />

							<div className="arrow arrow_plus  d-flex justify-content-center align-items-center position-absolute" onClick={() => this.onClickArrow({ clickevent: 'plus', id: product.id, divstr: 'divInputNumberQuantity' })} ><i className="fa fa-plus" aria-hidden="true"></i></div>

						</div>

						<Button
							type="button"
							id={'statusUpdate'}
							onClick={() => this.updateStatusQuantity({ quantity: this.state.newQuantityProduct, id: product.id })}
							className={`ml-0 ml-sm-3 btn btn-success btn_refresh_quantity_${product.id} ${classes.btnUpdate}`}
							disabled={this.state.disabledBtnUpdateQuantity}
						>
							<i className="fa fa-refresh" aria-hidden="true"></i>
						</Button>

					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>promotion</div>
					<div className={`d-flex flex-column flex-sm-row py-3 py-sm-0 px-0 px-sm-3 overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>
						{selectPromotionsProduct}
						<Button
							type="button"
							id={'statusUpdate'}
							onClick={() => this.updateStatusPromotionProduct({ promotion: this.state.newPromotionProduct, id: product.id })}
							className={`ml-0 ml-sm-3 btn btn-success btn_refresh_promotion_${product.id} ${classes.btnUpdate}`}
							disabled={this.state.disabledBtnUpdatePromotion}
						>
							<i className="fa fa-refresh" aria-hidden="true"></i>
						</Button>
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>popularity</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>{product.popularity}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>units</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>{product.units}</div>
				</th>
				<th className={classes.th_describe}>
					<div className={classes.leftTitle}>describe</div>
					<div className={`px-3 py-2 d-flex text-left justify-content-md-center align-items-center overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`} >
						<p className={`h-100 mb-0`}>{product.describe}</p>
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>category</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>{nameCategory}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>subcategory</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>{nameSubcategory}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>visible</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>{product.visibleproduct ? "Видимий" : "Невидимий"}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>edit</div>
					<div className={classes.th_value}>
						<ModalEdit idProduct={id} idSubcategory={idSubcategory} nameCategory={nameCategory} nameSubcategory={nameSubcategory} idCategory={idCategory} units={product.units} stepunits={product.stepunits} visible={product.visibleproduct} promotion={product.promotion} />
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>remove</div>
					<div className={classes.th_value}>
						<button className={classes.btnRemove} onClick={() => this.props.removeProducts(id)}><i className="fa fa-times" aria-hidden="true"></i></button>
					</div>
				</th>
			</tr>

		)
	}
}


function mapStateToProps(state) {
	return {
		products: state.products.products,
		categories: state.products.categories,
		selectedProductsAdmin: state.products.selectedProductsAdmin
	}
}

function mapDispatchToProps(dispatch) {
	return {
		toggleProduct: (id, checked) => dispatch(toggleProduct(id, checked)),
		onChangePrice: obj => dispatch(onChangePrice(obj)),
		onChangeQuantity: obj => dispatch(onChangeQuantity(obj)),
		onChangePromotion: obj => dispatch(onChangePromotion(obj)),
		removeProducts: id => dispatch(removeProducts(id))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductItem)
import React, { Component } from 'react'
import classes from './ModalEdit.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import Select from '../../../../components/UI/Select/Select'
import is from 'is_js' // для валідації емейлу в формі
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { editProduct } from '../../../../redux/actions/products'

class ModalEdit extends Component {

	state = {
		isFormValid: false,
		idSelectedCategory: this.props.idCategory,
		idSelectedSubcategory: this.props.idSubcategory,
		valueSelectedVisible: this.props.visible,
		valueSelectedUnit: this.props.units,
		valueSelectedStepUnit: this.props.stepunits,
		valueSelectedPromotion: this.props.promotion,
		nameCategory: this.props.nameCategory,
		formControls: {
			name: {
				id: 'name',
				htmlFor: 'name',
				value: this.props.products.filter(product => product.id === this.props.idProduct)[0].name,
				name: 'name',
				type: 'text',
				label: 'Введіть назву',
				errorMessage: 'Поле з назвою не повинне бути пустим',
				valid: true,
				touched: false,
				validation: {
					required: true
				}
			},
			price: {
				id: 'price',
				htmlFor: 'price',
				value: this.props.products.filter(product => product.id === this.props.idProduct)[0].price,
				name: 'price',
				type: 'number',
				label: 'Введіть ціну',
				errorMessage: 'Поле з ціною не повинне бути пустим',
				valid: true,
				touched: false,
				validation: {
					required: true
				}
			},
			quantity: {
				id: 'quantity',
				htmlFor: 'quantity',
				value: this.props.products.filter(product => product.id === this.props.idProduct)[0].quantity,
				name: 'quantity',
				type: 'number',
				label: 'Введіть кількість товару',
				errorMessage: 'Поле з кількістю товару не повинне бути пустим',
				valid: true,
				touched: false,
				validation: {
					required: true
				}
			},
			describe: {
				id: 'describe',
				htmlFor: 'describe',
				value: this.props.products.filter(product => product.id === this.props.idProduct)[0].describe,
				name: 'describe',
				type: 'text',
				label: 'Добавте опис',
				errorMessage: 'Поле з описом не повинне бути пустим',
				valid: true,
				touched: false,
				validation: {
					required: true
				}
			},
			image: {
				id: 'image',
				htmlFor: 'image',
				value: this.props.products.filter(product => product.id === this.props.idProduct)[0].image,
				name: 'image',
				type: 'text',
				label: 'Добавте ссилку на картинку',
				errorMessage: 'Введіть ссилку на картинку',
				valid: true,
				touched: false,
				validation: {
					required: true
				}
			}
		},
		name: this.props.products.filter(product => product.id === this.props.idProduct)[0].name,
		price: this.props.products.filter(product => product.id === this.props.idProduct)[0].price,
		//        price: document.querySelector(`input[name = price_product_${id}]`).value,
		quantity: this.props.products.filter(product => product.id === this.props.idProduct)[0].quantity,
		describe: this.props.products.filter(product => product.id === this.props.idProduct)[0].describe,
		image: this.props.products.filter(product => product.id === this.props.idProduct)[0].image
	}

	selectChangeCategory = event => {

		let idSelectedCategory = +event.target.value
		let nameCategory

		this.props.categories.forEach(category => {
			if (category.id === idSelectedCategory) {
				nameCategory = category.name
			}
		})

		this.setState({
			idSelectedCategory, nameCategory
		})


	}

	selectChangeSubcategory = event => {
		let idSelectedSubcategory = +event.target.value

		this.setState({
			idSelectedSubcategory
		})
	}

	selectChangeUnits = event => {

		let valueSelectedUnit = event.target.value

		this.setState({
			valueSelectedUnit
		})

	}

	selectChangeStepUnits = event => {

		let valueSelectedStepUnit = +event.target.value

		this.setState({
			valueSelectedStepUnit
		})

	}

	selectChangePromotions = event => {

		let valueSelectedPromotion = +event.target.value

		this.setState({
			valueSelectedPromotion
		})

	}

	selectChangeVisible = event => {

		let valueSelectedVisible = event.target.value === "true" ? true : false

		this.setState({
			valueSelectedVisible
		})

	}


	//    optionSelectCategory = event => {       
	//       
	//        if(this.props.categories[0]) {
	//            
	//            return this.props.categories.map(category => {
	//                return {text: category.name, value: category.id}
	//            })
	//            
	//        } else {
	//            return [{text: "Немає категорії", value: "Немає категорії"}]
	//        }
	//       
	//        
	//    }

	optionSelectCategory = event => {

		let idSelectedCategory

		if (this.props.categories[0]) {

			const thisOptions = this.props.categories.map(category => {
				return { text: category.name, value: category.id }
			})

			let thisOption

			thisOptions.forEach((category, index) => {

				if (category.text === this.state.nameCategory) {
					thisOption = category
					thisOptions.splice(index, 1)
					thisOptions.unshift(thisOption)
				}

			})



			return thisOptions

		} else {
			return [{ text: "Немає категорії", value: "Немає категорії" }]
		}


	}


	optionSelectSubcategory = idSelectedCategory => {

		if (this.props.categories[idSelectedCategory]) {
			if (this.props.categories[idSelectedCategory].subcategories) {


				const thisOptions = this.props.categories[idSelectedCategory].subcategories.map(subcategory => {
					return { text: `${subcategory.name}`, value: subcategory.id }
				})

				let thisOption

				thisOptions.forEach((subcategory, index) => {

					if (subcategory.value === this.state.idSelectedSubcategory) {
						thisOption = subcategory
						thisOptions.splice(index, 1)
						thisOptions.unshift(thisOption)
					}

				})

				return thisOptions

			} else {
				return [{ text: "Немає підкатегорії", value: "Немає підкатегорії" }]
			}

		} else {
			return [{ text: "Немає підкатегорії", value: "Немає підкатегорії" }]
		}

	}

	optionUnitsProduct = event => {

		const thisUnitsOptions = [{ text: "шт", value: "шт" }, { text: "кг", value: "кг" }]

		let thisUnit

		thisUnitsOptions.forEach((unit, index) => {

			if (unit.value === this.state.valueSelectedUnit) {
				thisUnit = unit
				thisUnitsOptions.splice(index, 1)
				thisUnitsOptions.unshift(thisUnit)
			}

		})

		return thisUnitsOptions

	}

	optionStepUnitsProduct = event => {

		const thisStepUnitsOptions = []

		for (let i = 0.1; i <= 1; i += 0.1) {
			thisStepUnitsOptions.push({ text: +i.toFixed(2), value: +i.toFixed(2) })
		}

		let thisStepUnit

		thisStepUnitsOptions.forEach((stepunit, index) => {

			if (stepunit.value === this.state.valueSelectedStepUnit) {
				thisStepUnit = stepunit

				thisStepUnitsOptions.splice(index, 1)
				thisStepUnitsOptions.unshift(thisStepUnit)
			}

		})

		return thisStepUnitsOptions

	}

	optionPromotionsProduct = event => {

		const thisPromotionsOptions = []

		for (let i = 0; i <= 100; i += 5) {
			thisPromotionsOptions.push({ text: i, value: i })
		}

		let thisPromotion

		thisPromotionsOptions.forEach((promotion, index) => {

			if (promotion.value === this.state.valueSelectedPromotion) {
				thisPromotion = promotion

				thisPromotionsOptions.splice(index, 1)
				thisPromotionsOptions.unshift(thisPromotion)
			}

		})

		return thisPromotionsOptions

	}

	optionVisibleProduct = event => {

		const visibleOptions = [{ text: "Видимий", value: true }, { text: "Невидимий", value: false }]

		//        let thisVisibleOption 
		//        let thisVisible
		//        
		//        if (this.props.visible) {
		//            thisVisible = "Видимий"
		//        } else {
		//            thisVisible = "Невидимий"
		//        }
		//            
		//         const thisVisibleOptions = visibleOptions.filter((visible, index) => {
		//
		//             if(visible.text === thisVisible) {                     
		//                thisVisibleOption = visible                    
		//             }
		//
		//             return visible.text !== thisVisible
		//
		//         })
		//
		//        thisVisibleOptions.unshift(thisVisibleOption)

		let thisVisible

		visibleOptions.forEach((visible, index) => {

			if (visible.value === this.state.valueSelectedVisible) {
				thisVisible = visible
				visibleOptions.splice(index, 1)
				visibleOptions.unshift(thisVisible)
			}

		})

		return visibleOptions

	}

	handleClose = () => {
		this.setState({
			show: false
		})
	}

	handleShow = () => {

		this.setState({
			show: true
		})

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

	editDate(id) {

		const { name, price, quantity, describe, image } = this.state.formControls

		const selectsForm = [...document.querySelectorAll('select.addOptionToEditProduct')].map(select => {
			return { name: select.name, value: select.value }
		});

		const selectValue = ['promotion', 'categories', 'subcategories', 'units', 'stepunits', 'visibleproduct']

		selectsForm.forEach(select => {
			if (select.name === 'promotion') {
				selectValue[0] = +select.value
			} else if (select.name === 'categories') {
				selectValue[1] = +select.value
			} else if (select.name === 'subcategories') {
				selectValue[2] = +select.value
			} else if (select.name === 'units') {
				selectValue[3] = select.value
			} else if (select.name === 'stepunits') {
				selectValue[4] = +select.value
			} else if (select.name === 'visibleproduct') {
				selectValue[5] = select.value === "true" ? true : false
			}
		});

		const [promotion, category, subcategory, units, stepunits, visibleproduct] = selectValue

		this.props.editProduct({
			id,
			name: name.value,
			category,
			subcategory,
			units,
			stepunits,
			price: +price.value,
			quantity: +quantity.value,
			promotion,
			describe: describe.value,
			image: image.value,
			visibleproduct
		})

		this.setState({
			isFormValid: false
		})

		this.handleClose()
	}

	renderModalEdit() {

		const idThisProducts = this.props.idProduct

		const selectPromotionsProduct = <Select
			label="Знижка в %"
			name="promotion"
			className="addOptionToEditProduct"
			onChange={this.selectChangePromotions}
			option={this.optionPromotionsProduct()}
		/>

		const selectCategories = <Select
			label="Виберіть категорію"
			onChange={this.selectChangeCategory}
			name="categories"
			className="addOptionToEditProduct"
			option={this.optionSelectCategory()}
		/>

		const selectSubcategories = <Select
			label="Виберіть підкатегорію"
			onChange={this.selectChangeSubcategory}
			name="subcategories"
			className="addOptionToEditProduct"
			//            disabled={!this.props.isSubcategories}
			option={this.optionSelectSubcategory(this.state.idSelectedCategory)}
		/>

		const selectUnitsProduct = <Select
			label="Одиниці вимірювання"
			name="units"
			className="addOptionToEditProduct"
			onChange={this.selectChangeUnits}
			option={this.optionUnitsProduct()}
		/>

		const selectStepUnitsProduct = <Select
			label="Крок одиниць вимірювань"
			name="stepunits"
			className="addOptionToEditProduct"
			onChange={this.selectChangeStepUnits}
			option={this.optionStepUnitsProduct()}
		/>

		const selectVisibleProduct = <Select
			label="Видимість продукту"
			name="visibleproduct"
			className="addOptionToEditProduct"
			onChange={this.selectChangeVisible}
			option={this.optionVisibleProduct()}
		/>

		return (
			<React.Fragment>
				<Button
					selfType="primary"
					onClick={this.handleShow}
					data_idThisProducts={idThisProducts}
				>
					Редагувати
				</Button>

				<Modal className={classes.ProductsModalEdit} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">
						<Modal.Title>Редагувати:</Modal.Title>
					</Modal.Header>
					<Modal.Body className={classes.modalBodyProductsEdit} >

						{this.props.error ? <h3 className="d-block error text-danger text-center" >{this.props.error.message}</h3> : null}
						<div className={classes.ProductsEdit}>
							<div>

								<form className={classes.ProductsEditForm}>

									{this.renderInputs()}
									{selectPromotionsProduct}
									{selectCategories}
									{selectSubcategories}
									{selectUnitsProduct}
									{selectStepUnitsProduct}
									{selectVisibleProduct}

								</form>

							</div>

						</div>

					</Modal.Body>
					<Modal.Footer className="d-flex justify-content-end">

						<Button
							type="button"
							className="btn btn-success"
							onClick={() => this.editDate(this.props.idProduct)}
						>
							Редагувати
						</Button>

					</Modal.Footer>
				</Modal>
			</React.Fragment>
		)

	}

	componentDidMount() {

	}

	render() {

		return (
			<div className={classes.ModalEdit}>

				<div className="container px-0">
					{this.renderModalEdit()}
				</div>

			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		products: state.products.products,
		categories: state.products.categories,
		error: state.products.error
	}
}

function mapDispatchToProps(dispatch) {
	return {
		editProduct: obj => dispatch(editProduct(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalEdit)
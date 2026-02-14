import React, { Component } from 'react'
import classes from './ModalAdd.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import Select from '../../../../components/UI/Select/Select'
import { createControl, validate, validateForm } from '../../../../form/formFramework'
import Auxiliary from '../../../../hoc/Auxiliary/Auxiliary'
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { addNewProduct } from '../../../../redux/actions/products'

function createFormControls() {
	return {
		name: createControl({
			label: 'Введіть назву',
			errorMessage: 'Поле з назвою не повинне бути пустим'
		}, { required: true }),
		price: createControl({
			label: 'Введіть ціну',
			errorMessage: 'Поле з ціною не повинне бути пустим'
		}, { required: true }),
		quantity: createControl({
			label: 'Введіть кількість товару',
			errorMessage: 'Поле з кількістю товару не повинне бути пустим'
		}, { required: true }),
		describe: createControl({
			label: 'Добавте опис',
			errorMessage: 'Поле з описом не повинне бути пустим'
		}, { required: true }),
		image: createControl({
			label: 'Добавте ссилку на картинку',
			errorMessage: 'Введіть ссилку на картинку'
		}, { required: true }),
	}
}

class ModalAdd extends Component {

	state = {
		idSelectedCategory: 0,
		idSelectedSubcategory: 0,
		isFormValid: false,
		valueSelectedVisible: true,
		valueSelectedUnit: "шт",
		valueSelectedStepUnit: 1,
		valueSelectedPromotion: 0,
		formControls: createFormControls()
	}

	selectChangeCategory = event => {

		let idSelectedCategory = +event.target.value

		this.setState({
			idSelectedCategory
		})

	}

	selectChangePromotions = event => {

		let valueSelectedPromotion = +event.target.value

		this.setState({
			valueSelectedPromotion
		})

	}

	selectChangeSubcategory = event => {
		let idSelectedSubcategory = +event.target.value

		this.setState({
			idSelectedSubcategory
		})
	}

	selectChangeVisible = event => {

		let valueSelectedVisible = event.target.value === "true" ? true : false

		this.setState({
			valueSelectedVisible
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

	addProductHandler = event => {

		const { name, price, quantity, describe, image } = this.state.formControls

		const selectsForm = [...document.querySelectorAll('select.addOptionToAddProduct')].map(select => {
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

		this.props.addNewProduct({
			name: name.value,
			category,
			subcategory,
			price: +price.value,
			promotion,
			units,
			stepunits,
			quantity: +quantity.value,
			describe: describe.value,
			image: image.value,
			visibleproduct
		})

		this.setState({
			isFormValid: false,
			formControls: createFormControls()
		})

		this.handleClose()

	}

	onChangeHandler = (value, controlName) => {
		const formControls = { ...this.state.formControls }
		const control = { ...formControls[controlName] }

		control.value = value
		control.touched = true
		control.valid = validate(control.value, control.validation)

		formControls[controlName] = control

		this.setState({
			formControls,
			isFormValid: validateForm(formControls)
		})
	}

	renderControls() {
		return Object.keys(this.state.formControls).map((controlName, index) => {
			const control = this.state.formControls[controlName]

			return (
				<Auxiliary key={controlName + index}>
					{ controlName === 'price' || controlName === 'quantity'
						? <Input
							className={"w-100"}
							type="number"
							value={control.value}
							valid={control.valid}
							touched={control.touched}
							label={control.label}
							shouldValidate={!!control.validation}
							errorMessage={control.errorMessage}
							onChange={event => this.onChangeHandler(event.target.value, controlName)}
						/>
						: <Input
							className={"w-100"}
							value={control.value}
							valid={control.valid}
							touched={control.touched}
							label={control.label}
							shouldValidate={!!control.validation}
							errorMessage={control.errorMessage}
							onChange={event => this.onChangeHandler(event.target.value, controlName)}
						/>
					}

					{ index === 0 ? <hr /> : null}
				</Auxiliary>
			)

		})
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

	optionSelectCategory = event => {

		if (this.props.categories[0]) {

			//            return this.props.categories.map(category => {
			//                return {text: category.name, value: category.id}
			//            })

			const thisOptions = this.props.categories.map(category => {
				return { text: category.name, value: category.id }
			})

			let thisOption

			thisOptions.forEach((category, index) => {

				if (category.value === this.state.idSelectedCategory) {
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
				//               return this.props.categories[idSelectedCategory].subcategories.map(subcategory => {
				//                    return {text: `${subcategory.name}`, value: subcategory.id}
				//                })

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

	optionVisibleProduct = event => {

		const thisVisibleOptions = [{ text: "Видимий", value: true }, { text: "Невидимий", value: false }]

		let thisVisible

		thisVisibleOptions.forEach((visible, index) => {

			if (visible.value === this.state.valueSelectedVisible) {
				thisVisible = visible
				thisVisibleOptions.splice(index, 1)
				thisVisibleOptions.unshift(thisVisible)
			}

		})

		return thisVisibleOptions

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

	componentDidMount() {

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

	renderModalAdd() {

		const selectPromotionsProduct = <Select
			label="Знижка в %"
			name="promotion"
			className="addOptionToAddProduct"
			onChange={this.selectChangePromotions}
			option={this.optionPromotionsProduct()}
		/>

		const selectCategories = <Select
			label="Виберіть категорію"
			onChange={this.selectChangeCategory}
			name="categories"
			className="addOptionToAddProduct"
			option={this.optionSelectCategory()}
		/>

		const selectSubcategories = <Select
			label="Виберіть підкатегорію"
			onChange={this.selectChangeSubcategory}
			name="subcategories"
			className="addOptionToAddProduct"
			//            disabled={!this.props.isSubcategories}
			option={this.optionSelectSubcategory(this.state.idSelectedCategory)}
		/>

		const selectUnitsProduct = <Select
			label="Одиниці вимірювання"
			name="units"
			className="addOptionToAddProduct"
			onChange={this.selectChangeUnits}
			option={this.optionUnitsProduct()}
		/>

		const selectStepUnitsProduct = <Select
			label="Крок одиниць вимірювань"
			name="stepunits"
			className="addOptionToAddProduct"
			onChange={this.selectChangeStepUnits}
			option={this.optionStepUnitsProduct()}
		/>

		const selectVisibleProduct = <Select
			label="Видимість продукту"
			name="visibleproduct"
			className="addOptionToAddProduct"
			onChange={this.selectChangeVisible}
			option={this.optionVisibleProduct()}
		/>

		return (
			<React.Fragment>
				<Button
					selfType="primary"
					onClick={this.handleShow}
					className={`mb-2 mb-md-3 mr-3 p-2 p-md-3 ${classes.btnOpenModule}`}
				>
					Додати продукт
				</Button>

				<Modal className={classes.ProductsModalAdd} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">

						<Modal.Title>Додати продукт:</Modal.Title>

					</Modal.Header>
					<Modal.Body className={classes.modalBodyProductsAdd} >

						{this.props.error ? <h3 className="d-block error text-danger text-center" >{this.props.error.message}</h3> : null}

						<div className={classes.ProductsAdd}>
							<div>

								<form className={classes.ProductsAddForm}>

									{this.renderControls()}
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
							onClick={this.addProductHandler}
							disabled={!this.state.isFormValid}
						>
							Додати
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
			<div className={classes.ModalAdd}>

				<div className="container px-0">
					{this.renderModalAdd()}
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
		addNewProduct: obj => dispatch(addNewProduct(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalAdd)
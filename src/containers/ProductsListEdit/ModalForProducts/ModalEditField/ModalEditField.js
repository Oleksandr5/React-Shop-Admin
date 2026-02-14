import React, { Component } from 'react'
import classes from './ModalEditField.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import Select from '../../../../components/UI/Select/Select'
import is from 'is_js' // для валідації емейлу в формі
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { editFieldProduct } from '../../../../redux/actions/products'

class ModalEditField extends Component {

	state = {
		valueSelectedTypeVal: "Text",
		isFormValid: false,
		selectedKey: null,
		formControls: {
			val: {
				id: 'val',
				htmlFor: 'val',
				value: '',
				name: 'val',
				type: 'text',
				label: 'Введіть значення',
				errorMessage: 'Поле з значенням не повинне бути пустим',
				valid: true,
				touched: false,
				validation: {
					required: true
				}
			}
		}
	}

	selectChangeKey = event => {

		let selectedKey = event.target.value

		this.setState({
			selectedKey
		})

	}

	optionSelectKey = event => {

		if (this.props.products[0]) {

			const product = this.props.products[0]

			let thisKeys = []

			for (const property in product) {

				thisKeys.push({ text: property, value: property })

			}

			let thisKey

			thisKeys.forEach((key, index) => {

				if (key.text === this.state.selectedKey) {
					thisKey = key
					thisKeys.splice(index, 1)
					thisKeys.unshift(thisKey)
				}

			})

			return thisKeys

		} else {
			return [{ text: "Немає ключів", value: "Немає ключів" }]
		}


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

		const { val } = this.state.formControls

		const selectsForm = [...document.querySelectorAll('select.addOptionToEditField')].map(select => {
			return { name: select.name, value: select.value }
		});

		const selectValue = ['key', 'typeval']

		selectsForm.forEach(select => {
			if (select.name === 'key') {
				selectValue[0] = select.value
			} else if (select.name === 'typeval') {
				selectValue[1] = select.value
			}
		});

		const [key, typeval] = selectValue

		if (typeval === "Text") {
			this.props.editFieldProduct({
				key,
				val: val.value
			})
		} else if (typeval === "Number") {
			this.props.editFieldProduct({
				key,
				val: +val.value
			})
		}

		this.setState({
			isFormValid: false
		})

		this.handleClose()
	}

	selectChangeTypeVal = event => {

		let valueSelectedTypeVal = event.target.value

		this.setState({
			valueSelectedTypeVal
		})

	}

	optionTypeVal = event => {

		const thisTypeValOptions = [{ text: "Text", value: "Text" }, { text: "Number", value: "Number" }]

		let thisTypeVal

		thisTypeValOptions.forEach((typeval, index) => {

			if (typeval.value === this.state.valueSelectedTypeVal) {
				thisTypeVal = typeval
				thisTypeValOptions.splice(index, 1)
				thisTypeValOptions.unshift(thisTypeVal)
			}

		})

		return thisTypeValOptions

	}


	renderModalEditField() {

		const selectKeys = <Select
			label="Виберіть ключ"
			onChange={this.selectChangeKey}
			name="key"
			className="addOptionToEditField"
			option={this.optionSelectKey()}
		/>

		const selectTypeVal = <Select
			label="Тип значення"
			name="typeval"
			className="addOptionToEditField"
			onChange={this.selectChangeTypeVal}
			option={this.optionTypeVal()}
		/>

		return (
			<React.Fragment>
				<Button
					selfType="primary"
					onClick={this.handleShow} className={`mb-2 mb-md-3 mr-3 p-2 p-md-3 ${classes.btnOpenModule}`}
				>
					Редагувати значення
				</Button>

				<Modal className={classes.ProductsModalEditField} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">
						<Modal.Title>Редагувати значення вибраним продуктам:</Modal.Title>
					</Modal.Header>
					<Modal.Body className={classes.modalBodyProductsEdit} >

						{this.props.error ? <h3 className="d-block error text-danger text-center" >{this.props.error.message}</h3> : null}

						{this.props.products.filter(product => product.checked === true)[0] ? null : <div><p className="p-3 border rounded shadow text-danger text-center"><b>Ви не вибрали жодного продукту !!!</b></p></div>}
						<div><p className="p-3 mt-3 border rounded shadow text-info text-center"><b>Обов'язково виберіть тип значення !!!</b></p></div>
						<div className={classes.ProductsEdit}>
							<div>

								<form className={classes.ProductsEditForm}>

									{selectKeys}
									{this.renderInputs()}
									{selectTypeVal}

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
			<div className={classes.ModalEditField}>

				<div className="container px-0">
					{this.renderModalEditField()}
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
		editFieldProduct: obj => dispatch(editFieldProduct(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalEditField)
import React, { Component } from 'react'
import classes from './ModalAddNewField.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import Select from '../../../../components/UI/Select/Select'
import { createControl, validate, validateForm } from '../../../../form/formFramework'
import Auxiliary from '../../../../hoc/Auxiliary/Auxiliary'
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { addNewFieldProduct } from '../../../../redux/actions/products'

function createFormControls() {
	return {
		key: createControl({
			label: 'Ключ',
			errorMessage: 'Поле з ключом не повинне бути пустим'
		}, { required: true }),
		val: createControl({
			label: 'Значення',
			errorMessage: 'Поле з значенням не повинне бути пустим'
		}, { required: true })
	}
}

class ModalAddNewField extends Component {

	state = {
		valueSelectedTypeVal: "Text",
		isFormValid: false,
		formControls: createFormControls()
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

	addFieldProductHandler = event => {

		const { key, val } = this.state.formControls

		const selectsForm = [...document.querySelectorAll('select.addOptionToAddField')].map(select => {
			return { name: select.name, value: select.value }
		});

		const selectValue = ['typeval']

		selectsForm.forEach(select => {
			if (select.name === 'typeval') {
				selectValue[0] = select.value
			}
		});

		//        if (val === "false" || val === '0' || val === 'null') {
		//            val = false
		//        } else if (val === "true") {
		//            val = true
		//        }

		const [typeval] = selectValue

		if (typeval === "Text") {
			this.props.addNewFieldProduct({
				key: key.value,
				val: val.value
			})
		} else if (typeval === "Number") {
			this.props.addNewFieldProduct({
				key: key.value,
				val: +val.value
			})
		}

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
					{
						<Input
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


	componentDidMount() {

	}

	renderModalAddNewField() {

		const selectTypeVal = <Select
			label="Тип значення"
			name="typeval"
			className="addOptionToAddField"
			onChange={this.selectChangeTypeVal}
			option={this.optionTypeVal()}
		/>

		return (
			<React.Fragment>
				<Button
					selfType="primary"
					onClick={this.handleShow}
					className={`mb-2 mb-md-3 mr-3 p-2 p-md-3 ${classes.btnOpenModule}`}
				>
					Додати нове поле
				</Button>

				<Modal className={classes.ProductsModalAddNewField} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">
						<Modal.Title>Додати нове поле всім продуктам:</Modal.Title>
					</Modal.Header>
					<Modal.Body className={classes.modalBodyProductsAdd} >
						{this.props.error ? <h3 className="d-block error text-danger text-center" >{this.props.error.message}</h3> : null}
						<div className="p-3 border rounded shadow text-center">
							<p className="text-danger"><b>Ви додаєте нове поле всім продуктам !!!</b></p>
							<p className="text-info"><b>Обов'язково виберіть тип значення !!!</b></p>
						</div>
						<div className={classes.ProductsAdd}>
							<div>

								<form className={classes.ProductsAddForm}>

									{this.renderControls()}
									{selectTypeVal}

								</form>

							</div>

						</div>

					</Modal.Body>
					<Modal.Footer className="d-flex justify-content-end">

						<Button
							type="button"
							className="btn btn-success"
							onClick={this.addFieldProductHandler}
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
			<div className={classes.ModalAddNewField}>

				<div className="container px-0">
					{this.renderModalAddNewField()}
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
		addNewFieldProduct: obj => dispatch(addNewFieldProduct(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalAddNewField)
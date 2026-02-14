import React, { Component } from 'react'
import classes from './ModalEdit.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import Select from '../../../../components/UI/Select/Select'
import is from 'is_js' // для валідації емейлу в формі
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { editCategory } from '../../../../redux/actions/products'

class ModalEdit extends Component {

	state = {
		isFormValid: false,
		formControls: {
			name: {
				id: 'name',
				htmlFor: 'name',
				value: this.props.categories.filter(category => category.id === this.props.idCategory)[0].subcategories.filter(subcategory => subcategory.id === this.props.idSubcategory)[0].name,
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
			describe: {
				id: 'describe',
				htmlFor: 'describe',
				value: this.props.categories.filter(category => category.id === this.props.idCategory)[0].subcategories.filter(subcategory => subcategory.id === this.props.idSubcategory)[0].describe,
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
				value: this.props.categories.filter(category => category.id === this.props.idCategory)[0].subcategories.filter(subcategory => subcategory.id === this.props.idSubcategory)[0].image,
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
		name: this.props.categories.filter(category => category.id === this.props.idCategory)[0].subcategories.filter(subcategory => subcategory.id === this.props.idSubcategory)[0].name,
		describe: this.props.categories.filter(category => category.id === this.props.idCategory)[0].subcategories.filter(subcategory => subcategory.id === this.props.idSubcategory)[0].describe,
		image: this.props.categories.filter(category => category.id === this.props.idCategory)[0].subcategories.filter(subcategory => subcategory.id === this.props.idSubcategory)[0].image
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

		const { name, describe, image } = this.state.formControls

		//        this.props.editCategory({
		//            id,
		//            name: name.value,             
		//            describe: describe.value,
		//            image: image.value
		//        })        

		this.setState({
			isFormValid: false
		})

		this.handleClose()
	}

	renderModalEdit() {

		const idThisCategory = this.props.idCategory
		const idThisSubcategory = this.props.idSubcategory

		return (
			<React.Fragment>
				<Button
					selfType="primary"
					onClick={this.handleShow}
					data_idThisCategory={idThisCategory}
				>
					Edit
				</Button>

				<Modal className={classes.ModalEdit} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">
						<Modal.Title>Edit date:</Modal.Title>
					</Modal.Header>
					<Modal.Body className={classes.modalBodyProductsEdit} >

						<div className={classes.ProductsEdit}>
							<div>

								<form className={classes.ProductsEditForm}>

									{this.renderInputs()}

								</form>

							</div>

						</div>

					</Modal.Body>
					<Modal.Footer className="d-flex justify-content-end">

						<Button
							type="button"
							className="btn btn-success"
							onClick={() => this.editDate(idThisCategory)}
						>
							Edit
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
		isSubcategories: state.products.isSubcategories,
		error: state.products.error
	}
}

function mapDispatchToProps(dispatch) {
	return {
		editCategory: obj => dispatch(editCategory(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalEdit)
import React, { Component } from 'react'
import classes from './ModalAdd.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import Select from '../../../../components/UI/Select/Select'
import { createControl, validate, validateForm } from '../../../../form/formFramework'
import Auxiliary from '../../../../hoc/Auxiliary/Auxiliary'
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { addNewSubcategory, existingSubcategories } from '../../../../redux/actions/products'
import { onScroll, topFunction } from '../../../../redux/actions/menu'

function createFormControls() {
	return {
		name: createControl({
			label: 'Введіть назву',
			errorMessage: 'Поле з назвою не повинне бути пустим'
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
		isFormValid: false,
		formControls: createFormControls()
	}

	submitHandler = event => {
		event.preventDefault()
	}

	addSubcategoryHandler = obj => {

		let { idCategory } = obj

		const { name, describe, image } = this.state.formControls

		this.props.addNewSubcategory({
			name: name.value,
			idCategory,
			image: image.value,
			describe: describe.value
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
					{ <Input
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

		return (
			<React.Fragment>
				<Button
					selfType="primary"
					onClick={this.handleShow}
					className={"mb-3"}
				>
					Add New Subcategory
				</Button>

				<Modal className={classes.ModalAdd} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">
						<Modal.Title>Add Subcategory:</Modal.Title>
						<h3 className="error text-danger text-center" >{this.props.error ? this.props.error.message : null}</h3>
					</Modal.Header>
					<Modal.Body className={classes.modalBodySubcategoriesAdd} >

						<div className={classes.SubcategoriesAdd}>
							<div>
								<div className="mx-auto d-flex flex-column">
									<h3 className="text-center">Наявні підкатегорії:</h3>

									<div className={`d-inline-block mx-auto border pr-5 overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.existingSubcategories}`} >
										<ul>
											{this.props.existingSubcategories(this.props.idCategory)}
										</ul>
									</div>
								</div>

								<form className={classes.SubcategoriesAddForm}>

									{this.renderControls()}

								</form>

							</div>

						</div>

					</Modal.Body>
					<Modal.Footer className="d-flex justify-content-end">

						<Button
							type="button"
							className="btn btn-success"
							onClick={event => this.addSubcategoryHandler({ event, idCategory: this.props.idCategory })}
							disabled={!this.state.isFormValid}
						>
							Add
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
			<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.SubcategoryCreator}`} onScroll={this.props.onScroll} >

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
		addNewSubcategory: obj => dispatch(addNewSubcategory(obj)),
		existingSubcategories: idCategory => dispatch(existingSubcategories(idCategory)),
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalAdd)
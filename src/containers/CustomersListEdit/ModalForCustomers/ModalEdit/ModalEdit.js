import React, { Component } from 'react'
import classes from './ModalEdit.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import is from 'is_js' // для валідації емейлу в формі
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { editCustomer } from '../../../../redux/actions/inform'

class ModalEdit extends Component {

	state = {
		isFormValid: false,
		formControls: {
			email: {
				id: 'email',
				htmlFor: 'email',
				value: this.props.customers.filter(customer => customer.id === this.props.idCustomer)[0].email,
				name: 'registr',
				type: 'email',
				label: 'Email',
				errorMessage: 'Введіть корректний емейл',
				valid: true,
				touched: false,
				validation: {
					required: true,
					email: true
				}
			},
			name: {
				id: 'name',
				htmlFor: 'name',
				value: this.props.customers.filter(customer => customer.id === this.props.idCustomer)[0].name,
				name: 'registr',
				type: 'text',
				label: 'Ім\'я',
				errorMessage: 'Введіть корректне ім\'я',
				valid: true,
				touched: false,
				validation: {
					required: true
				}
			},
			tel: {
				id: 'tel',
				htmlFor: 'tel',
				value: this.props.customers.filter(customer => customer.id === this.props.idCustomer)[0].tel,
				name: 'registr',
				type: 'number',
				label: 'Номер телефону',
				errorMessage: 'Введіть корректний номер телефону',
				valid: true,
				touched: false,
				validation: {
					required: true
				}
			}
		},
		email: this.props.customers.filter(customer => customer.id === this.props.idCustomer)[0].email,
		name: this.props.customers.filter(customer => customer.id === this.props.idCustomer)[0].name,
		tel: this.props.customers.filter(customer => customer.id === this.props.idCustomer)[0].tel,
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

	editDate(id) {
		const { email, name, tel } = this.state

		this.props.editCustomer({ email, name, tel, idEdit: id })

		this.handleClose()
	}

	renderModalEdit() {

		const idThisCustomers = this.props.idCustomer

		return (
			<React.Fragment>
				<Button
					selfType="primary"
					onClick={this.handleShow}
					data_idthiscustomers={idThisCustomers}
				>
					Edit
				</Button>

				<Modal className={classes.ModalEdit} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">
						<Modal.Title>Edit date:</Modal.Title>
					</Modal.Header>
					<Modal.Body className={classes.modalBodyCustomersEdit} >

						<div className={classes.CustomersEdit}>
							<div>

								<form onSubmit={this.submitHandler} className={classes.CustomersEditForm}>

									{this.renderInputs()}

								</form>

							</div>

						</div>

					</Modal.Body>
					<Modal.Footer className="d-flex justify-content-end">

						<Button
							type="button"
							className="btn btn-success"
							onClick={() => this.editDate(this.props.idCustomer)}
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
		customers: state.inform.customers
	}
}

function mapDispatchToProps(dispatch) {
	return {
		editCustomer: obj => dispatch(editCustomer(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalEdit)
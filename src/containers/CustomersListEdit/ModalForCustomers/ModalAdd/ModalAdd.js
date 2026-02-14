import React, { Component } from 'react'
import classes from './ModalAdd.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import is from 'is_js' // для валідації емейлу в формі
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { addNewCustomer, createUser } from '../../../../redux/actions/inform'

class ModalAdd extends Component {

	state = {
		isFormValid: false,
		formControls: {
			email: {
				id: 'email',
				htmlFor: 'email',
				value: '',
				name: 'registr',
				type: 'email',
				label: 'Email',
				errorMessage: 'Введіть корректний емейл',
				valid: false,
				touched: false,
				validation: {
					required: true,
					email: true
				}
			},
			password: {
				id: 'password',
				htmlFor: 'password',
				value: '',
				name: 'registr',
				type: 'password',
				label: 'Пароль',
				errorMessage: 'Введіть корректний пароль',
				valid: false,
				touched: false,
				validation: {
					required: true,
					minLength: 6
				}
			},
			name: {
				id: 'name',
				htmlFor: 'name',
				value: '',
				name: 'registr',
				type: 'text',
				label: 'Ім\'я',
				errorMessage: 'Введіть корректне ім\'я',
				valid: false,
				touched: false,
				validation: {
					required: true
				}
			},
			tel: {
				id: 'tel',
				htmlFor: 'tel',
				value: '',
				name: 'registr',
				type: 'number',
				label: 'Номер телефону',
				errorMessage: 'Введіть корректний номер телефону',
				valid: false,
				touched: false,
				validation: {
					required: true
				}
			}
		},
		email: '',
		password: ''
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

	createAccount = () => {

		const { email, password, name, tel } = this.state

		this.props.addNewCustomer({ email, password, name, tel, hasAccount: true, auth: true })

		this.props.createUser({ email, password })

		const formControls = Object.assign({ ...this.state.formControls })

		Object.keys(formControls).forEach(name => {
			formControls[name].value = ''
			formControls[name].valid = false
			formControls[name].touched = false
		})

		this.setState({
			formControls, isFormValid: false, email: "", password: ""
		})

		this.handleClose()

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

	handlerChange = event => {
		this.setState({
			[event.target.id]: event.target.value
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
					Add New Customer
				</Button>

				<Modal className={classes.ModalAdd} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">
						<Modal.Title>Add date:</Modal.Title>
					</Modal.Header>
					<Modal.Body className={classes.modalBodyCart} >

						<div className={classes.Registr}>
							<div>

								<form onSubmit={this.submitHandler} className={classes.RegistrForm}>

									{this.renderInputs()}

								</form>

							</div>

						</div>

					</Modal.Body>
					<Modal.Footer className="d-flex justify-content-end">

						<Button
							type="button"
							className="btn btn-success"
							onClick={this.createAccount}
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
		customers: state.inform.customers,
		customerId: state.inform.customerId,
		customersName: state.inform.customerName,
		hasAccount: state.inform.hasAccount
	}
}

function mapDispatchToProps(dispatch) {
	return {
		addNewCustomer: obj => dispatch(addNewCustomer(obj)),
		createUser: obj => dispatch(createUser(obj)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalAdd)
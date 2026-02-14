import React, { Component } from 'react'
import classes from './Auth.module.css'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import is from 'is_js' // для валідації емейлу в формі
import { connect } from 'react-redux'
import { NavLink } from 'react-router-dom'

import { authUser, singOutAccount } from '../../redux/actions/inform'

class Auth extends Component {

	state = {
		isFormValid: false,
		formControls: {
			email: {
				id: 'email',
				htmlFor: 'email',
				value: '',
				name: 'auth',
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
				name: 'auth',
				type: 'password',
				label: 'Пароль',
				errorMessage: 'Введіть корректний пароль',
				valid: false,
				touched: false,
				validation: {
					required: true,
					minLength: 6
				}
			}
		},
		email: '',
		password: '',
		textErrorAuth: ''
	}

	submitHandler = event => {
		event.preventDefault()
	}

	logInToAccount = () => {

		const { email, password } = this.state

		this.props.authUser({ email, password })

		const formControls = Object.assign({ ...this.state.formControls })

		Object.keys(formControls).forEach(name => {
			formControls[name].value = ''
			formControls[name].valid = false
			formControls[name].touched = false
		})

		this.setState({
			formControls, isFormValid: false, email: "", password: ""
		})


		// const allInput = [...document.querySelectorAll(`input[name = auth]`)]
		// allInput.forEach(input => {
		// 	input.value = ''
		// })

	}

	singOutAccount = () => {

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

	componentDidMount() {

	}

	render() {

		const { hasAccount } = this.props

		return (
			<div className={`mb-3 overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.Auth}`}>
				<div>

					<NavLink to={'/'} className={`d-block mb-2 btnBack`} >
						<i className="fa fa-arrow-left" aria-hidden="true"></i> Вернутись на головну
					</NavLink>

					<h1 className={'h1Title'}>Ідентифікація</h1>


					{
						hasAccount
							?
							<div className={"successAuth"}>
								<p className="text-success text-center">Вітаємо {this.props.customerName} !!!</p>
							</div>
							: null
					}


					<h3 className="errorLogin text-danger text-center" >{this.props.textErrorAuth}</h3>

					<form onSubmit={this.submitHandler} className={classes.AuthForm}>

						{!this.props.hasAccount ? this.renderInputs() : null}

						{!this.props.hasAccount ?

							<Button
								selfType="success"
								onClick={this.logInToAccount}
								disabled={!this.state.isFormValid || this.props.hasAccount}
							>
								Ввійти
						</Button>

							: null}

						<Button
							selfType="primary"
							onClick={this.props.singOutAccount}
							disabled={!this.props.hasAccount}
						>
							Вийти
						</Button>

					</form>

					{!this.props.hasAccount ?
						<NavLink
							to={'/registr'}

						>
							<Button
								selfType="primary"
								disabled={this.props.hasAccount} className={`${classes.btnRegistr}`}
							>
								Зареєструватися
							</Button>

						</NavLink>

						: null}



				</div>

			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		hasAccount: state.inform.hasAccount,
		customerName: state.inform.customerName,
		textErrorAuth: state.inform.textErrorAuth
	}
}

function mapDispatchToProps(dispatch) {
	return {
		authUser: obj => dispatch(authUser(obj)),
		singOutAccount: () => dispatch(singOutAccount())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Auth)
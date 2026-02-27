import React, { Component } from 'react'
import classes from './Auth.module.css'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import is from 'is_js' // для валідації емейлу в формі
import { connect } from 'react-redux'
import { NavLink } from 'react-router-dom'

import { authUser, singOutAccount } from '../../redux/actions/inform'
import firebase from 'firebase'; // <-- додано для доступів (🔹)

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
		textErrorAuth: '',
		// 🔹 новий стан для доступів
		uidToAdd: '',
		invoices: false,
		usedMaterials: false,
		fullAccess: false, // 🔹 новий вид доступу
		admins: {}
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
		this.adminsRef = firebase.database().ref('settings/admins');
		this.adminsRef.on('value', snapshot => {
			let admins = snapshot.val() || {};
			this.setState({ admins });
		});
	}

	// Маленька рекомендація (правильна очистка listener) Щоб не було витоків пам’яті. Маленька рекомендація (правильна очистка listener). Щоб не було витоків пам’яті. Це зніме listener при виході з компонента.

	componentWillUnmount() {
		if (this.adminsRef) this.adminsRef.off();
	}

	// 🔹 Додавання або оновлення доступів
	addOrUpdateAdmin = async () => {
		const { uidToAdd, invoices, usedMaterials, fullAccess } = this.state;
		if (!uidToAdd.trim()) return;

		const userRef = firebase.database().ref(`settings/admins/${uidToAdd.trim()}`);

		try {
			await userRef.transaction(currentData => {
				if (!currentData) {
					// новий користувач — створюємо об'єкт із вибраними доступами
					return {
						invoices: !!invoices,
						usedMaterials: !!usedMaterials,
						fullAccess: !!fullAccess
					};
				} else {
					// існуючий користувач — оновлюємо лише ті права, що вибрав адмін
					return {
						invoices: invoices ? true : currentData.invoices,
						usedMaterials: usedMaterials ? true : currentData.usedMaterials,
						fullAccess: fullAccess ? true : currentData.fullAccess
					};
				}
			});

			// очищаємо форму
			this.setState({ uidToAdd: '', invoices: false, usedMaterials: false, fullAccess: false });

		} catch (e) {
			console.error("Помилка додавання/оновлення:", e);
		}
	}

	// 🔹 Видалення конкретного доступу
	removeAdminAccess = async (uid, accessType) => {
		if (!window.confirm(`Видалити доступ "${accessType}" у користувача ${uid}?`)) return;

		const userRef = firebase.database().ref(`settings/admins/${uid}`);

		try {
			await userRef.transaction(currentData => {
				if (!currentData) return;

				const updatedData = { ...currentData, [accessType]: false };
				if (!updatedData.invoices && !updatedData.usedMaterials && !updatedData.fullAccess) return null;

				return updatedData;
			});

		} catch (e) {
			console.error("Помилка видалення доступу:", e);
		}
	}

	// 🔹 Список адміністраторів
	renderAdminsList() {
		const { admins } = this.state;

		return (
			<ul className="list-group list-group-flush mb-3">
				{Object.entries(admins).map(([uid, rights]) => (
					<li key={uid} className="list-group-item admin-item">

						<div className="admin-info">
							<strong>{uid}</strong><br />
							Invoices: {rights.invoices ? '✅' : '❌'} |{" "}
							Materials: {rights.usedMaterials ? '✅' : '❌'} |{" "}
							FullAccess: {rights.fullAccess ? '✅' : '❌'}
						</div>

						<div className="admin-buttons">
							{rights.invoices && (
								<button
									className="btn btn-sm btn-outline-danger"
									onClick={() => this.removeAdminAccess(uid, 'invoices')}
								>
									× Invoices
								</button>
							)}

							{rights.usedMaterials && (
								<button
									className="btn btn-sm btn-outline-danger"
									onClick={() => this.removeAdminAccess(uid, 'usedMaterials')}
								>
									× Materials
								</button>
							)}

							{rights.fullAccess && (
								<button
									className="btn btn-sm btn-outline-danger"
									onClick={() => this.removeAdminAccess(uid, 'fullAccess')}
								>
									× FullAccess
								</button>
							)}
						</div>

					</li>
				))}
			</ul>
		);
	}


	render() {

		const { uidToAdd, invoices, usedMaterials, fullAccess, admins } = this.state;
		const { hasAccount } = this.props

		// ✅ перевірка, чи користувач має fullAccess
		const idThisCustomers = window.localStorage.getItem("idThisCustomers");
		const isAdminFullAccess = hasAccount && admins[idThisCustomers]?.fullAccess;

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
				{/* 🔹 блок керування доступами лише для користувачів з fullAccess */}
				{isAdminFullAccess && (
					<div className={classes.AccessControl}>
						<h4>Керування доступом</h4>
						<h6>Список користувачів:</h6>
						{this.renderAdminsList()}

						<div className="mt-3 d-flex flex-column">
							<div className="mb-2">
								<Input
									label="UID користувача"
									value={uidToAdd}
									onChange={(e) => this.setState({ uidToAdd: e.target.value })}
								/>
							</div>

							<div className="form-check mb-2">
								<input
									type="checkbox"
									className="form-check-input"
									id="invoices"
									checked={invoices}
									onChange={(e) => this.setState({ invoices: e.target.checked })}
								/>
								<label className="form-check-label" htmlFor="invoices">
									Доступ до Invoices
								</label>
							</div>

							<div className="form-check mb-2">
								<input
									type="checkbox"
									className="form-check-input"
									id="usedMaterials"
									checked={usedMaterials}
									onChange={(e) => this.setState({ usedMaterials: e.target.checked })}
								/>
								<label className="form-check-label" htmlFor="usedMaterials">
									Доступ до Used Materials
								</label>
							</div>

							<div className="form-check mb-2">
								<input
									type="checkbox"
									className="form-check-input"
									id="fullAccess"
									checked={fullAccess}
									onChange={(e) => this.setState({ fullAccess: e.target.checked })}
								/>
								<label className="form-check-label" htmlFor="fullAccess">
									Full Access
								</label>
							</div>

							<Button
								selfType="success"
								className={classes.btnAddAccess}
								onClick={this.addOrUpdateAdmin}
							>
								Додати / Оновити доступ
							</Button>
						</div>
					</div>
				)}
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
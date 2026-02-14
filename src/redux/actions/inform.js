import { ADD_NEW_CUSTOMER, HAS_ACCOUNT, FETCH_CUSTOMERS_DATA_SUCCESS, FETCH_CUSTOMERS_DATA_ERROR, CUSTOMER_NEXT_ID, TOGGLE_ALL_CUSTOMERS, UPDATE_CUSTOMERS, UPDATE_CUSTOMER_NAME, UPDATE_ORDERS, UPDATE_ORDERS_HISTORY, UPDATE_CUSTOMER_ID, UPDATE_ID_LAST_CUSTOMER, AUTH_SUCCESS, AUTH_SUCCESS_ADMIN, AUTH_LOGOUT, AUTH_LOGOUT_ADMIN, FETCH_DATE_OF_FIRST_VISIT_NEW_CUSTOMER, FETCH_QUANTITY_VISITORS, FETCH_QUANTITY_OF_DOWNLOADS } from './actionTypes'
import axios from '../../axios/axios-quiz'
import firebase from 'firebase'

export function fetchCustomersData() {
	return async dispatch => {

		try {

			const responseCustomers = await axios.get('customers.json')
			const customersData = responseCustomers.data

			const responseIdLastCustomer = await axios.get('idLastCustomer.json')
			const idLastCustomerData = responseIdLastCustomer.data

			dispatch(fetchCustomersDataSuccess(customersData, idLastCustomerData))

			// update quantityVisitors````````

			const responseQuantityVisitors = await axios.get('quantityVisitors.json')
			const quantityVisitorsData = responseQuantityVisitors.data

			const responseDateOfFirstVisitNewCustomer = await axios.get('dateOfFirstVisitNewCustomer.json')
			const dateOfFirstVisitNewCustomerData = responseDateOfFirstVisitNewCustomer.data

			let ifVisitedShop = window.localStorage.getItem('https://react-shop-54401.web.app/')
			if (ifVisitedShop) {
				console.log('ifVisitedShop', true)
				dispatch(fetchQuantityVisitors(quantityVisitorsData))
				dispatch(fetchDateOfFirstVisitNewCustomer(dateOfFirstVisitNewCustomerData))

			} else {
				console.log('ifVisitedShop', false)
				window.localStorage.setItem('https://react-shop-54401.web.app/', 'visited')



				const newQuantityVisitorsData = quantityVisitorsData ? (quantityVisitorsData + 1) : 1
				const newDateOfFirstVisitNewCustomerData = getDate()

				try {

					const db = firebase.database()
					db.ref(`quantityVisitors`).set(newQuantityVisitorsData)
					db.ref(`dateOfFirstVisitNewCustomer`).set(newDateOfFirstVisitNewCustomerData)
					dispatch(fetchQuantityVisitors(newQuantityVisitorsData))
					dispatch(fetchDateOfFirstVisitNewCustomer(newDateOfFirstVisitNewCustomerData))

				} catch (e) {
					dispatch(fetchCustomersDataError(e))
				}
			}

			// update quantityVisitors............

			// update quantityOfDownloads````````

			const responseQuantityOfDownloads = await axios.get('quantityOfDownloads.json')

			const quantityOfDownloadsData = responseQuantityOfDownloads.data

			const newQuantityOfDownloadsData = quantityOfDownloadsData ? (quantityOfDownloadsData + 1) : 1

			try {

				const db = firebase.database()
				db.ref(`quantityOfDownloads`).set(newQuantityOfDownloadsData)
				dispatch(fetchQuantityOfDownloads(newQuantityOfDownloadsData))

			} catch (e) {
				dispatch(fetchCustomersDataError(e))
			}

			// update quantityOfDownloads............

		} catch (e) {
			dispatch(fetchCustomersDataError(e))
		}
	}
}

export function fetchQuantityVisitors(quantityVisitors) {
	console.log('fetchQuantityVisitors', quantityVisitors)
	return {
		type: FETCH_QUANTITY_VISITORS,
		quantityVisitors
	}
}

export function fetchDateOfFirstVisitNewCustomer(dateOfFirstVisitNewCustomer) {
	console.log('fetchDateOfFirstVisitNewCustomer', dateOfFirstVisitNewCustomer)
	return {
		type: FETCH_DATE_OF_FIRST_VISIT_NEW_CUSTOMER,
		dateOfFirstVisitNewCustomer
	}
}

export function updateStatusQuantityVisitors() {
	return async dispatch => {

		const responseQuantityVisitors = await axios.get('quantityVisitors.json')
		const quantityVisitorsData = responseQuantityVisitors.data

		const responseDateOfFirstVisitNewCustomer = await axios.get('dateOfFirstVisitNewCustomer.json')
		const dateOfFirstVisitNewCustomerData = responseDateOfFirstVisitNewCustomer.data

		document.querySelector(`.status_quantityVisitors`).innerHTML = quantityVisitorsData
		document.querySelector(`.status_date_first_visit_new_customer`).innerHTML = dateOfFirstVisitNewCustomerData

		document.querySelector(`.btn_refresh_quantityVisitors`).blur()

	}
}

export function fetchQuantityOfDownloads(quantityOfDownloads) {

	return {
		type: FETCH_QUANTITY_OF_DOWNLOADS,
		quantityOfDownloads
	}
}

export function updateStatusQuantityOfDownloads() {
	return async (dispatch, getState) => {

		const responseQuantityOfDownloads = await axios.get('quantityOfDownloads.json')
		const quantityOfDownloadsData = responseQuantityOfDownloads.data

		document.querySelector(`.status_quantityOfDownloads`).innerHTML = quantityOfDownloadsData

		document.querySelector(`.btn_refresh_quantityOfDownloads`).blur()

	}
}

function getDate() {
	Number.prototype.pad = function (size) {
		let s = String(this);
		while (s.length < (size || 2)) { s = "0" + s; }
		return s;
	}
	let today = new Date()
	let dd = String(today.getDate()).padStart(2, '0');
	let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
	let yyyy = today.getFullYear();
	let time = `${(today.getHours()).pad(2)}:${(today.getMinutes()).pad(2)}, ${dd}/${mm}/${yyyy}`
	return time
}

export function addNewCustomer(obj) {
	return async (dispatch, getState) => {

		try {

			const responseCustomers = await axios.get('customers.json')
			const customers = responseCustomers.data ? responseCustomers.data : getState().inform.customers

			let idThisCustomers = window.localStorage.getItem('idThisUnKnownCustomers') ? window.localStorage.getItem('idThisUnKnownCustomers') : null

			const responseIdLastCustomer = await axios.get('idLastCustomer.json')

			const idLastCustomerData = responseIdLastCustomer.data

			let indexThisUnKnownCustomer

			if (!idThisCustomers) {

				let idLastCustomers = -1

				if (idLastCustomerData !== null) {
					idLastCustomers = idLastCustomerData
				}

				idThisCustomers = idLastCustomers + 1

				dispatch(updateIdLastCustomer(idThisCustomers))

				indexThisUnKnownCustomer = customers.length

			} else {

				// find indexThisUnKnownCustomer

				let whereIdThisUnKnownCustomers = customers.filter((customer, index) => {

					if (customer.id === +idThisCustomers) {
						indexThisUnKnownCustomer = index
					}

					return (
						customer.id === +idThisCustomers
					)
				})[0]

				if (!whereIdThisUnKnownCustomers) {
					indexThisUnKnownCustomer = customers.length
				}
			}

			let { email, name, tel, auth } = obj

			let time = getDate()

			const thisCustomer = {
				email, name, tel: +tel, id: +idThisCustomers, date: time, checked: false, auth
			}

			let indexThisCustomerEmailInBase

			const thisCustomerEmailInBase = customers.filter((customer, index) => {

				if (customer.email === thisCustomer.email) {
					indexThisCustomerEmailInBase = index
				}

				return (
					customer.email === thisCustomer.email
				)

			})[0]

			const isThisCustomerEmailInBase = thisCustomerEmailInBase ? true : false

			const { hasAccount } = obj

			if (!isThisCustomerEmailInBase) {
				//                await axios.post('customers.json', thisCustomer)
				const db = firebase.database()
				db.ref(`customers/${indexThisUnKnownCustomer}`).set(thisCustomer)

				if (+idThisCustomers > idLastCustomerData) {
					db.ref(`idLastCustomer`).set(+idThisCustomers)
				}

				customers[indexThisUnKnownCustomer] = thisCustomer

				if (hasAccount) {
					dispatch(addNewCustomerSuccess(customers, +idThisCustomers, name, hasAccount))
					window.localStorage.removeItem('idThisUnKnownCustomers')
					window.localStorage.setItem('idThisCustomers', +idThisCustomers)
					window.localStorage.setItem('nameThisCustomers', name)
					window.localStorage.setItem('hasAccount', hasAccount)
				} else {
					dispatch(addNewCustomerSuccess(customers, +idThisCustomers, name, hasAccount))
					window.localStorage.removeItem('idThisUnKnownCustomers')
					window.localStorage.setItem('idThisCustomers', +idThisCustomers)
					window.localStorage.setItem('nameThisCustomers', name)
					window.localStorage.setItem('hasAccount', hasAccount)
				}


			} else {


				const auth = thisCustomerEmailInBase.auth

				if (auth) {
					alert('Вибачте, під цим емейлом вже зареєстрований користувач, ідентифікуйтеся або введіть інший емейл!!!')
				} else {

					customers.forEach((customer, index) => {
						if (customer.id === thisCustomer.id) {
							customers.splice(index, 1)
						}
					})
					idThisCustomers = thisCustomerEmailInBase.id
					thisCustomer.id = idThisCustomers

					customers[indexThisCustomerEmailInBase] = thisCustomer

					const db = firebase.database()
					db.ref(`customers`).set(customers)

					if (hasAccount) {
						dispatch(addNewCustomerSuccess(customers, +idThisCustomers, name, hasAccount))
						window.localStorage.removeItem('idThisUnKnownCustomers')
						window.localStorage.setItem('idThisCustomers', +idThisCustomers)
						window.localStorage.setItem('nameThisCustomers', name)
						window.localStorage.setItem('hasAccount', hasAccount)
					} else {
						dispatch(addNewCustomerSuccess(customers, +idThisCustomers, name, hasAccount))
						window.localStorage.removeItem('idThisUnKnownCustomers')
						window.localStorage.setItem('idThisCustomers', +idThisCustomers)
						window.localStorage.setItem('nameThisCustomers', name)
						window.localStorage.setItem('hasAccount', hasAccount)
					}
				}

			}

		} catch (e) {
			dispatch(fetchCustomersDataError(e))
		}

	}
}

export function editCustomer(obj) {
	return async (dispatch, getState) => {

		try {

			let { email, name, tel, idEdit } = obj

			const responseCustomers = await axios.get('customers.json')
			const customers = responseCustomers.data ? responseCustomers.data : getState().inform.customers

			let indexThisCustomerEmailInBase

			const customerEmailInBase = customers.filter((customer, index) => {

				if (customer.id === idEdit) {
					indexThisCustomerEmailInBase = index
				}

				return (
					customer.id === idEdit
				)

			})[0]


			customerEmailInBase.email = email
			customerEmailInBase.name = name
			if (+window.localStorage.getItem('idThisCustomers') === idEdit) {
				window.localStorage.setItem('nameThisCustomers', name)
				dispatch(updateCustomerName(name))
			}
			customerEmailInBase.tel = tel

			customers[indexThisCustomerEmailInBase] = customerEmailInBase

			const db = firebase.database()
			db.ref(`customers`).set(customers)

			dispatch(updateCustomers(customers))

		} catch (e) {
			dispatch(fetchCustomersDataError(e))
		}

	}
}

export function addNewUnKnownCustomer() {
	return async (dispatch, getState) => {

		const customerId = getState().inform.customerId

		const responseCustomers = await axios.get('customers.json')
		const customers = responseCustomers.data ? responseCustomers.data : getState().inform.customers

		try {

			let isIdThisUnKnownCustomers = window.localStorage.getItem('idThisUnKnownCustomers') ? window.localStorage.getItem('idThisUnKnownCustomers') : null

			let isIdThisCustomers = window.localStorage.getItem('idThisCustomers') ? window.localStorage.getItem('idThisCustomers') : null

			let isNameThisCustomers = window.localStorage.getItem('nameThisCustomers') ? window.localStorage.getItem('nameThisCustomers') : null

			let isHasAccount = window.localStorage.getItem('hasAccount') === 'true' ? true : false

			if (isIdThisUnKnownCustomers) {

				if (isIdThisCustomers) {

					dispatch(addNewCustomerSuccess(customers, +isIdThisCustomers, isNameThisCustomers, isHasAccount))

					return

				} else {

					const isIdThisUnKnownCustomersInDB = customers.filter(customer => customer.id === +isIdThisUnKnownCustomers)[0]

					if (isIdThisUnKnownCustomersInDB) {

						dispatch(nextUnKnownCustomerId(+isIdThisUnKnownCustomers))
						return

					}

					// update quantityVisitors````````

					const responseQuantityVisitors = await axios.get('quantityVisitors.json')
					const quantityVisitorsData = responseQuantityVisitors.data

					window.localStorage.setItem('https://react-shop-54401.web.app/', 'visited')

					const newQuantityVisitorsData = quantityVisitorsData ? (quantityVisitorsData + 1) : 1
					const newDateOfFirstVisitNewCustomerData = getDate()

					try {

						const db = firebase.database()
						db.ref(`quantityVisitors`).set(newQuantityVisitorsData)
						db.ref(`dateOfFirstVisitNewCustomer`).set(newDateOfFirstVisitNewCustomerData)
						dispatch(fetchQuantityVisitors(newQuantityVisitorsData))
						dispatch(fetchDateOfFirstVisitNewCustomer(newDateOfFirstVisitNewCustomerData))

					} catch (e) {
						dispatch(fetchCustomersDataError(e))
					}

					// update quantityVisitors............

				}

			}

			if (isIdThisCustomers) {

				dispatch(addNewCustomerSuccess(customers, +isIdThisCustomers, isNameThisCustomers, isHasAccount))

				return
			}

			let idLastCustomers = -1

			const responseIdLastCustomer = await axios.get('idLastCustomer.json')

			const idLastCustomerData = responseIdLastCustomer.data

			if (idLastCustomerData !== null) {
				idLastCustomers = idLastCustomerData
			}

			let idThisCustomers = idLastCustomers + 1

			dispatch(updateIdLastCustomer(idThisCustomers))


			// add New UnKnown Customer:
			window.localStorage.setItem('idThisUnKnownCustomers', idThisCustomers)

			let name = "Шановний клієнт"

			let time = getDate()

			const thisCustomer = {
				name, email: '', tel: '', id: idThisCustomers, date: time, checked: false, auth: false
			}

			dispatch(nextUnKnownCustomerId(idThisCustomers))


			const db = firebase.database()

			db.ref(`customers/${customers.length}`).set(thisCustomer)

			db.ref(`idLastCustomer`).set(idThisCustomers)

			customers.push(thisCustomer)

			const hasAccount = false

			dispatch(addNewCustomerSuccess(customers, idThisCustomers, name, hasAccount))
		} catch (e) {
			dispatch(fetchCustomersDataError(e))
		}

	}
}

//export function updateUnKnownCustomer() {
//    return async (dispatch, getState) => {
//        
//        const responseCustomers = await axios.get('customers.json')
//        const customers = responseCustomers.data ? responseCustomers.data : getState().inform.customers
//        
//        const responseIdLastCustomer = await axios.get('idLastCustomer.json')
//
//        const idLastCustomerData = responseIdLastCustomer.data
//
//        let idLastCustomer = -1
//
//        if (idLastCustomerData !== null) {
//            idLastCustomer = idLastCustomerData
//        }
//
//        let idThisCustomer = idLastCustomer + 1
//        
//        dispatch(updateIdLastCustomer(idThisCustomer))
//
//        // update id UnKnown Customer:
//        window.localStorage.setItem('idThisUnKnownCustomers', idThisCustomer)
//        
//        try { 
//
//            let name = "Шановний клієнт"                
//
//            let time = getDate()
//            
//            const thisCustomer = {
//                name, email: '', tel: '', id: idThisCustomer, date: time, checked: false, auth: false
//            }           
//
//            dispatch(nextUnKnownCustomerId(idThisCustomer))           
//
//
//            const db = firebase.database()
//
//            db.ref(`customers/${customers.length}`).set(thisCustomer)
//
//            customers.push(thisCustomer)
//
//            const hasAccount = false                
//
//            dispatch(addNewCustomerSuccess(customers, idThisCustomer, name, hasAccount))                      
//        } catch (e) {
//            dispatch(fetchCustomersDataError(e))
//        }      
//        
//    }
//}

export function nextUnKnownCustomerId(id) {
	const customerNextId = id === null ? null : +id
	return {
		type: CUSTOMER_NEXT_ID,
		payload: { id: customerNextId }
	}
}

export function createUser(obj) {
	return async dispatch => {

		try {
			let { email, password } = obj

			firebase.auth().createUserWithEmailAndPassword(email, password)
				.catch(error => console.log(error))

		} catch (e) {
			dispatch(fetchCustomersDataError(e))
		}

	}
}

export function authUser(obj) {
	return async (dispatch, getState) => {

		try {
			let { email, password } = obj

			firebase.auth().signInWithEmailAndPassword(email, password)
				.then(response => {

					const thisCustomer = getState().inform.customers.filter(customer => customer.email === email)[0]

					const { id, name } = thisCustomer

					dispatch(hasAccount({ hasAccount: true, textErrorAuth: '', customerId: id, customerName: name }))

					window.localStorage.setItem('idThisCustomers', id)
					window.localStorage.setItem('nameThisCustomers', name)
					window.localStorage.setItem('hasAccount', true)

					if (email === 'admin@ukr.net') {
						dispatch(authSuccessAdmin())
					} // signIn for Admin

				})
				.catch(e => {

					let idThisUnKnownCustomers = window.localStorage.getItem('idThisUnKnownCustomers') ? +window.localStorage.getItem('idThisUnKnownCustomers') : null

					dispatch(hasAccount({ textErrorAuth: 'Введіть будь ласка правильний емейл і пароль!', customerId: idThisUnKnownCustomers }))

					dispatch(fetchCustomersDataError(e))
				})

		} catch (e) {
			dispatch(fetchCustomersDataError(e))
		}



	}
}

export function authSuccess(token) {
	return {
		type: AUTH_SUCCESS,
		token
	}
}

export function authSuccessAdmin() {

	window.localStorage.setItem('authAdmin', true)

	return {
		type: AUTH_SUCCESS_ADMIN
	}
}

export function logout() {

	return {
		type: AUTH_LOGOUT
	}
}

export function logoutAdmin() {

	window.localStorage.removeItem('authAdmin')

	return {
		type: AUTH_LOGOUT_ADMIN
	}
}

export function singOutAccount() {
	return async (dispatch, getState) => {

		firebase.auth().signOut().then(() => {
			window.localStorage.removeItem('idThisCustomers')
			window.localStorage.removeItem('nameThisCustomers')
			window.localStorage.removeItem('hasAccount')
		})

		let idThisUnKnownCustomers = +window.localStorage.getItem('idThisUnKnownCustomers')
		if (idThisUnKnownCustomers) {
			dispatch(nextUnKnownCustomerId(idThisUnKnownCustomers))
		} else {
			dispatch(nextUnKnownCustomerId(null))
		}

		dispatch(logout())
		dispatch(logoutAdmin())
	}
}



export function hasAccount(obj) {

	const { hasAccount, textErrorAuth, customerId, customerName } = obj

	return {
		type: HAS_ACCOUNT,
		payload: { hasAccount, textErrorAuth, customerId, customerName }
	}
}

export function fetchCustomersDataSuccess(customers, idLastCustomer) {
	return {
		type: FETCH_CUSTOMERS_DATA_SUCCESS,
		payload: { customers, idLastCustomer }
	}
}

export function addNewCustomerSuccess(customers, idThisCustomers, name, hasAccount) {
	return {
		type: ADD_NEW_CUSTOMER,
		payload: { customers, idThisCustomers, name, hasAccount }
	}
}


export function fetchCustomersDataError(e) {
	return {
		type: FETCH_CUSTOMERS_DATA_ERROR,
		error: e
	}
}

export function toggleCustomer(id, checked) {

	return async (dispatch, getState) => {

		const customers = getState().inform.customers

		const thisCustomers = customers.map(customer => {
			if (customer.id === id) {
				customer.checked = checked
			}
			return customer
		})

		dispatch(updateCustomers(thisCustomers))

	}

}

export function toggleAllCustomers(checked) {

	return async (dispatch, getState) => {

		const customers = getState().inform.customers

		const thisCustomers = customers.map(customer => {
			customer.checked = checked
			return customer
		})

		dispatch(updateCustomers(thisCustomers))

	}

}

export function removeCustomers(id, email) {

	return async (dispatch, getState) => {

		const responseCustomers = await axios.get('customers.json')
		const customers = responseCustomers.data ? responseCustomers.data : getState().inform.customers

		customers.forEach((customer, index) => {
			if (customer.id === id) {
				customers.splice(index, 1)
			}
		})

		let elem = document.querySelector(`tr[id = customer_table_${id}]`)

		elem.classList.add("d-none")

		const db = firebase.database()

		db.ref(`customers`).set(customers)


		//        const admin = require('firebase-admin')
		//        let app = admin.initializeApp()
		//        
		//        admin.auth().getUserByEmail(email).then((user) => {
		//            return admin.auth().deleteUser(user.uid);
		//          })

		const responseOrders = await axios.get('orders.json')
		const orders = responseOrders.data ? responseOrders.data : getState().products.orders

		orders.forEach((order, index) => {
			if (order.customerId === id) {
				orders.splice(index, 1)
			}
		})

		db.ref(`orders`).set(orders)

		dispatch(updateOrders(orders))

		const responseOrdersHistory = await axios.get('ordersHistory.json')
		const ordersHistory = responseOrdersHistory.data ? responseOrdersHistory.data : getState().products.ordersHistory

		ordersHistory.forEach((order, index) => {
			if (order.customerId === id) {
				ordersHistory.splice(index, 1)
			}
		})

		db.ref(`ordersHistory`).set(ordersHistory)

		dispatch(updateOrdersHistory(ordersHistory))


		if (+window.localStorage.getItem('idThisUnKnownCustomers') === id) {
			window.localStorage.removeItem('idThisUnKnownCustomers')
			let customerId = window.localStorage.getItem('idThisCustomers') ? +window.localStorage.getItem('idThisCustomers') : null
			dispatch(updateCustomerId(customerId))
		}

		if (+window.localStorage.getItem('idThisCustomers') === id) {
			window.localStorage.removeItem('idThisCustomers')
			window.localStorage.removeItem('nameThisCustomers')
			window.localStorage.removeItem('hasAccount')
			let customerId = window.localStorage.getItem('idThisUnKnownCustomers') ? +window.localStorage.getItem('idThisUnKnownCustomers') : null
			dispatch(updateCustomerId(customerId))
			dispatch(addNewCustomerSuccess(customers, null, 'Шановний клієнт', false))
		}

		dispatch(updateCustomers(customers))

	}

}

export function updateOrders(orders) {
	return {
		type: UPDATE_ORDERS,
		payload: { orders }
	}
}

export function updateOrdersHistory(ordersHistory) {
	return {
		type: UPDATE_ORDERS_HISTORY,
		payload: { ordersHistory }
	}
}


export function updateCustomers(customers) {
	return {
		type: UPDATE_CUSTOMERS,
		customers
	}
}

export function updateCustomerId(customerId) {
	return {
		type: UPDATE_CUSTOMER_ID,
		customerId
	}
}

export function updateIdLastCustomer(idLastCustomer) {
	return {
		type: UPDATE_ID_LAST_CUSTOMER,
		idLastCustomer
	}
}

export function updateCustomerName(name) {
	return {
		type: UPDATE_CUSTOMER_NAME,
		name
	}
}

//export function toggleAll(id, checked) {   
//      
//    return {
//        type: TOGGLE_ALL_CUSTOMERS,
//        id, checked       
//    }
//    
//}

//export function addChecked() {
//    
//    return async (dispatch, getState) => {
//            
//        const categories = getState().products.categories
//        const thisCategories = categories.map((category, index) => {
//            category.checked = false
//            
//            category.subcategories.map(subcat => {
//                subcat.checked = false
//                return subcat
//            })
//            
//
//            return category
//        })
//        
//        const db = firebase.database()
//
//        db.ref(`categories`).set(thisCategories)
//        
//        console.log('thisCategories', thisCategories)
//        
//    }
//}
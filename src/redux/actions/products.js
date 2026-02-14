import { FETCH_PRODUCTS_DATA_START, FETCH_PRODUCTS_DATA_SUCCESS, FETCH_PRODUCTS_DATA_ERROR, TOGGLE_FILTER_HANDLER, MENU_CLOSE_HANDLER, ON_SELECTED_PRODUCTS, ON_SELECTED_PRODUCTS_ADMIN, RESET_FILTERS, RESET_FILTERS_ADMIN, UPDATE_IS_SUBCATEGORY, UPDATE_ORDERS, UPDATE_ORDERS_HISTORY, UPDATEPRODUCTS, UPDATE_PRODUCTS_DELETED, UPDATECATEGORIES, UPDATE_IS_ORDERS_THIS_CART, UPDATE_IS_ORDERS_HISTORY_THIS_CART, UPDATE_FILTER_PROPS, UPDATE_FILTER_PROPS_ADMIN, UPDATE_IS_QUANT_PROD_IN_DB, SET_FILTER_BY, SET_SEARCH_QUERY, SET_CURRENT_PAGE, SET_TOTAL_PRODUCTS_COUNT, CHANGE_PORTION_NUMBER } from './actionTypes'
import axios from '../../axios/axios-quiz'
import firebase from 'firebase'
import classes from '../../containers/Cart/Cart.module.css'
import Input from '../../components/UI/Input/Input'
import { NavLink } from 'react-router-dom'

export function fetchProductsData() {
	return async dispatch => {

		dispatch(fetchProductsDataStart())

		try {

			const responseCategories = await axios.get('categories.json')

			const categoriesData = responseCategories.data

			const responseProducts = await axios.get('products.json')

			const products = responseProducts.data

			dispatch(setTotalProductsCount(products.length))

			const responseProductsDeleted = await axios.get('productsDeleted.json')

			const productsDeleted = responseProductsDeleted.data


			const responseOrders = await axios.get('orders.json')

			const ordersData = responseOrders.data

			const responseOrdersHistory = await axios.get('ordersHistory.json')

			const ordersHistoryData = responseOrdersHistory.data

			dispatch(fetchProductsDataSuccess(categoriesData, products, productsDeleted, ordersData, ordersHistoryData))

		} catch (e) {
			dispatch(fetchProductsDataError(e))
		}
	}
}

export function fetchProductsDataStart() {
	return {
		type: FETCH_PRODUCTS_DATA_START
	}
}

export function fetchProductsDataSuccess(categories, products, productsDeleted, orders, ordersHistory) {
	return {
		type: FETCH_PRODUCTS_DATA_SUCCESS,
		payload: { categories, products, productsDeleted, orders, ordersHistory }
	}
}

export function fetchProductsDataError(e) {
	return {
		type: FETCH_PRODUCTS_DATA_ERROR,
		error: e
	}
}

export function getIndexCategory(idCategory, categories) {

	let indexCategory

	const category = categories.filter((category, index) => {

		if (category.id === idCategory) {
			indexCategory = index
		}

		return category.id === idCategory

	})[0]

	return indexCategory
}

function getCategory(indexCategory, categories) {

	const category = categories[indexCategory]

	return category
}

export function getIsSubcategories(indexCategory, categories) {

	let isSubcategories = Object.keys(categories[indexCategory]).filter(category => category === "subcategories")[0] ? true : false

	return isSubcategories
}

function getSubcategories(indexCategory, categories) {

	const subcategories = categories[indexCategory].subcategories

	return subcategories
}

function getIndexSubcategory(idSubcategory, subcategories) {
	let indexSubcategory
	let subcategory = subcategories.filter((subcategory, index) => {

		if (subcategory.id === idSubcategory) {
			indexSubcategory = index
		}

		return subcategory.id === idSubcategory

	})[0]

	return indexSubcategory
}

export function fetchIsSubcategories(idCategory = 0) {
	return async dispatch => {

		const responseCategories = await axios.get('categories.json')
		const categories = responseCategories.data

		let indexCategory = getIndexCategory(idCategory, categories)

		let isSubcategories = getIsSubcategories(indexCategory, categories)

		dispatch(updateIsSubcategory(isSubcategories))
	}
}

export function updateIsSubcategory(isSubcategories) {
	return {
		type: UPDATE_IS_SUBCATEGORY,
		isSubcategories
	}
}

export function addNewProduct(obj) {
	return async (dispatch, getState) => {

		const { name, category, subcategory, price, promotion, units, stepunits, quantity, describe, image, visibleproduct } = obj

		let idLastProduct = -1

		const responseIdLastProduct = await axios.get('idLastProduct.json')
		const idLastProductData = responseIdLastProduct.data

		if (idLastProductData !== null) {
			idLastProduct = idLastProductData
		}

		//        const products = [...getState().products.products]

		//        if (products[0]) {                
		//            idLastProduct = idLastProductData
		//        } else {
		//            idLastProduct = -1
		//        } 

		let idThisProduct = idLastProduct + 1

		const products = [...getState().products.products]

		const existingNameProduct = products.filter(product => product.category === category && product.subcategory === subcategory && product.name.toLowerCase() === name.toLowerCase())[0] ? true : false


		if (!existingNameProduct) {
			const productItem = {
				name,
				category,
				subcategory,
				price,
				units,
				stepunits,
				quantity,
				describe,
				image,
				id: idThisProduct,
				checked: false,
				promotion,
				popularity: 0,
				visibleproduct,
				visibleproductAdmin: true
			}


			try {

				//            await axios.post('products.json', this.state.products)      

				const db = firebase.database()
				db.ref(`products/${products.length}`).set(productItem)
				db.ref(`idLastProduct`).set(idThisProduct)

			} catch (e) {
				dispatch(fetchProductsDataError(e))
			}

			//        axios.post('products.json', this.state.product)
			//        .then(response => console.log(response))
			//        .catch(error => console.log(error))

			products.push(productItem)

			dispatch(updateProducts(products))
		} else {
			alert("Вибачте, в даній підкатегорії продукт з такою назвою вже існує!")
		}


	}
}

export function addNewFieldProduct(obj) {
	return async (dispatch, getState) => {

		const { key, val } = obj


		const products = [...getState().products.products]

		console.log('key', key)
		console.log('val', val)

		const newProducts = products.map(product => {

			product[key] = val
			product.checked = false

			return product
		})

		console.log('newProducts', newProducts)


		try {

			const db = firebase.database()
			db.ref(`products`).set(newProducts)

		} catch (e) {
			dispatch(fetchProductsDataError(e))
		}

		dispatch(updateProducts(newProducts))

	}
}

export function removeFieldProduct(obj) {
	return async (dispatch, getState) => {

		const { key } = obj


		const products = [...getState().products.products]

		console.log('key', key)

		const newProducts = products.map(product => {

			delete product[key]

			return product
		})

		console.log('newProducts', newProducts)


		try {

			const db = firebase.database()
			db.ref(`products`).set(newProducts)

		} catch (e) {
			dispatch(fetchProductsDataError(e))
		}

		dispatch(updateProducts(newProducts))

	}
}

export function editFieldProduct(obj) {
	return async (dispatch, getState) => {

		const { key, val } = obj


		const products = [...getState().products.products]

		console.log('key', key)
		console.log('val', val)

		const newProducts = products.map(product => {

			if (product.checked === true) {
				product[key] = val
				product.checked = false
				console.log('product', product)
			}

			return product
		})

		console.log('newProducts', newProducts)


		try {

			const db = firebase.database()
			db.ref(`products`).set(newProducts)

		} catch (e) {
			dispatch(fetchProductsDataError(e))
		}

		dispatch(updateProducts(newProducts))

	}
}


export function editProduct(obj) {
	return async (dispatch, getState) => {

		const { id, name, category, subcategory, price, quantity, describe, image, units, stepunits, visibleproduct, promotion } = obj

		const productItem = {
			name,
			category,
			subcategory,
			price,
			units,
			stepunits,
			quantity,
			describe,
			image,
			id,
			checked: false,
			promotion,
			visibleproduct,
			visibleproductAdmin: true
		}

		const products = [...getState().products.products]

		let indexProducts

		const product = products.filter((product, index) => {

			if (product.id === id) {
				indexProducts = index

			}

			return product.id === id

		})


		try {

			const db = firebase.database()
			db.ref(`products/${indexProducts}`).set(productItem)


		} catch (e) {
			dispatch(fetchProductsDataError(e))
		}

		products[indexProducts] = productItem

		dispatch(updateProducts(products))

		document.querySelector(`input[name = price_product_${id}]`).value = price
	}
}

export function editCategory(obj) {
	return async (dispatch, getState) => {

		const { id, name, describe, image } = obj


		const categories = [...getState().products.categories]

		const indexCategory = getIndexCategory(id, categories)
		const subcategories = getSubcategories(indexCategory, categories)

		const categoryItem = {
			name,
			describe,
			image,
			id,
			checked: false,
			subcategories
		}

		try {

			const db = firebase.database()
			db.ref(`categories/${indexCategory}`).set(categoryItem)

		} catch (e) {
			dispatch(fetchProductsDataError(e))
		}

		categories[indexCategory] = categoryItem

		dispatch(updateCategories(categories))

	}
}

export function editSubcategory(obj) {
	return async (dispatch, getState) => {

		const { idThisCategory, idThisSubcategory, name, describe, image } = obj


		const categories = [...getState().products.categories]
		const indexCategory = getIndexCategory(idThisCategory, categories)
		const subcategories = getSubcategories(indexCategory, categories)
		const indexSubcategory = getIndexSubcategory(idThisSubcategory, subcategories)
		//        console.log('editSubcategory_categories', categories)
		//        console.log('editSubcategory_indexCategory', indexCategory)
		//        console.log('editSubcategory_subcategories', subcategories)
		//        console.log('editSubcategory_indexSubcategory', indexSubcategory)
		const category = getCategory(indexCategory, categories)

		const subcategoryItem = {
			name,
			describe,
			image,
			id: idThisSubcategory,
			checked: false
		}

		subcategories[indexSubcategory] = subcategoryItem

		const categoryItem = {
			name: category.name,
			describe: category.describe,
			image: category.image,
			id: idThisCategory,
			checked: category.checked,
			subcategories
		}


		try {

			const db = firebase.database()
			db.ref(`categories/${indexCategory}`).set(categoryItem)

		} catch (e) {
			dispatch(fetchProductsDataError(e))
		}

		categories[indexCategory] = categoryItem

		dispatch(updateCategories(categories))

	}
}

export function onChangePrice(obj) {
	return async (dispatch, getState) => {

		let { price, id } = obj

		const products = [...getState().products.products]

		products.forEach(product => {
			if (product.id === id) {
				product.price = price
			}
		})

		try {

			const db = firebase.database()
			db.ref(`products`).set(products)

		} catch (e) {
			console.log(e)
		}

		dispatch(updateProducts(products))

	}
}

export function onChangeQuantity(obj) {
	return async (dispatch, getState) => {

		let { quantity, id } = obj

		const products = [...getState().products.products]

		products.forEach(product => {
			if (product.id === id) {
				product.quantity = quantity
			}
		})

		try {

			const db = firebase.database()
			db.ref(`products`).set(products)

		} catch (e) {
			console.log(e)
		}

		dispatch(updateProducts(products))

	}
}

export function onChangePromotion(obj) {
	return async (dispatch, getState) => {

		let { promotion, id } = obj

		const products = [...getState().products.products]

		products.forEach(product => {
			if (product.id === id) {
				product.promotion = promotion
			}
		})

		try {

			const db = firebase.database()
			db.ref(`products`).set(products)

		} catch (e) {
			console.log(e)
		}

		dispatch(updateProducts(products))

	}
}

export function updateProducts(products) {
	return {
		type: UPDATEPRODUCTS,
		products
	}
}

export function updateProductsDeleted(productsDeleted) {
	return {
		type: UPDATE_PRODUCTS_DELETED,
		productsDeleted
	}
}

export function addNewCategory(obj) {
	return async (dispatch, getState) => {

		const { name, describe, image } = obj

		let idLastCategory = -1


		const categories = [...getState().products.categories]

		if (categories[0]) {

			const isCategory = categories.filter((category, index) => category.name.toLowerCase() === name.toLowerCase())[0]

			if (!isCategory) {
				const responseIdLastCategory = await axios.get('idLastCategory.json')
				const idLastCategoryData = responseIdLastCategory.data

				if (idLastCategoryData !== null) {
					idLastCategory = idLastCategoryData
				}

			} else {
				alert("Така категорія вже існує")
				return
			}

		}

		let idThisCategory = idLastCategory + 1

		const categoryItem = {
			name,
			describe,
			image,
			id: idThisCategory,
			checked: false
		}

		categories.push(categoryItem)

		try {

			const db = firebase.database()
			db.ref(`categories/${categories.length - 1}`).set(categoryItem)
			db.ref(`idLastCategory`).set(idThisCategory)

		} catch (e) {
			console.log(e)
		}

		dispatch(updateCategories(categories))
	}
}

export function updateCategories(categories) {
	return {
		type: UPDATECATEGORIES,
		categories
	}
}

export function existingCategories() {
	return (dispatch, getState) => {

		const categories = [...getState().products.categories]

		if (categories[0]) {

			return categories.map((category, index) => {
				return (
					<li key={index}>
						{category.name}
					</li>
				)
			})

		} else {
			return (
				<li>
					Немає категорій
				</li>
			)
		}



	}
}

export function existingSubcategories(idCategory) {
	return (dispatch, getState) => {

		const categories = [...getState().products.categories]

		if (categories[0]) {

			const indexCategory = getIndexCategory(idCategory, categories)
			const isSubcategories = getIsSubcategories(indexCategory, categories)

			if (isSubcategories) {

				const subcategories = getSubcategories(indexCategory, categories)

				return subcategories.map((subcategory, index) => {
					return (
						<li key={index}>
							{subcategory.name}
						</li>
					)
				})

			} else {
				return (
					<li>
						Немає підкатегорій
					</li>
				)
			}

		} else {
			return (
				<li>
					Немає підкатегорій
				</li>
			)
		}

	}
}

export function optionSelectCategory(idCategory) {
	return (dispatch, getState) => {

		const categories = [...getState().products.categories]

		if (categories[0]) {

			//            return categories.map(category => {
			//                return {text: `${category.name}`, value: category.id}
			//            })

			const thisOptions = categories.map(category => {
				return { text: category.name, value: category.id }
			})

			let thisOption

			thisOptions.forEach((category, index) => {

				if (category.value === idCategory) {
					thisOption = category
					thisOptions.splice(index, 1)
					thisOptions.unshift(thisOption)
				}

			})

			return thisOptions

		} else {
			return [{ text: "Немає категорій", value: "Немає категорій" }]
		}

	}
}

export function addNewSubcategory(obj) {
	return async (dispatch, getState) => {

		const { name, describe, image, idCategory } = obj

		let idLastSubcategory = -1

		const categories = [...getState().products.categories]
		const indexCategory = getIndexCategory(idCategory, categories)

		//        if(categories[0] && idCategory) {
		if (categories[0]) {

			const indexCategory = getIndexCategory(idCategory, categories)
			const isSubcategories = getIsSubcategories(indexCategory, categories)

			const responseIdLastSubcategory = await axios.get('idLastSubcategory.json')
			const idLastSubcategoryData = responseIdLastSubcategory.data

			if (idLastSubcategoryData !== null) {
				idLastSubcategory = idLastSubcategoryData
			}

			let idThisSubcategory = idLastSubcategory + 1

			if (!isSubcategories) {

				const subcategoryItem = [{
					name,
					id: idThisSubcategory,
					image,
					describe,
					checked: false
				}]

				categories[indexCategory].subcategories = subcategoryItem

			} else {

				const subcategories = getSubcategories(indexCategory, categories)

				const isSubcategoryName = subcategories.filter((subcategory, index) => subcategory.name.toLowerCase() === name.toLowerCase())[0] ? true : false

				if (!isSubcategoryName) {

					const subcategoryItem = {
						name,
						id: idThisSubcategory,
						image,
						describe,
						checked: false
					}

					categories[indexCategory].subcategories.push(subcategoryItem)

				} else {
					alert("Така підкатегорія вже існує!")
					return
				}

			}

			try {

				const db = firebase.database()
				db.ref(`categories/${indexCategory}`).set(categories[indexCategory])
				db.ref(`idLastSubcategory`).set(idThisSubcategory)

				dispatch(updateCategories(categories))


			} catch (e) {
				console.log(e)
			}
		}

	}
}

export function menuCloseHandler() {
	return {
		type: MENU_CLOSE_HANDLER
	}
}

// start filter products on main page

export function toggleFilterHandler() {
	return {
		type: TOGGLE_FILTER_HANDLER
	}
}

export function resetFilter() {
	return async (dispatch, getState) => {

		const products = getState().products.products
		console.log('products.length', products.length)
		dispatch(setTotalProductsCount(products.length))

		dispatch(resetFilters())
		dispatch(updateIsSubcategory(false))

	}
}

export function changePortionNumber(portionNumber) {
	return {
		type: CHANGE_PORTION_NUMBER,
		portionNumber
	}
}

export function filterCondition(objproduct, objprops) {
	return (dispatch, getState) => {

		let filterCond = true

		for (const property in objprops) {

			let condition

			if (property === 'promotion') {
				if (objprops[property]) {
					if (objproduct[property] !== 0) {
						condition = true
					} else {
						condition = false
					}
				} else {
					condition = true
				}
			} else {
				condition = objproduct[property] === objprops[property]
			}

			if (filterCond === true || filterCond === false) {
				let newCondition = filterCond && condition
				filterCond = newCondition
			} else {
				filterCond = condition
			}
		}

		return filterCond
	}
}

export function categoriesFilter(obj) {

	return (dispatch, getState) => {

		removeActiveClass('promotionFilter')

		//selectedProducts:
		const products = getState().products.products

		const { categoryid } = obj

		let selectedProducts = products.filter(product => product.category === categoryid && product.visibleproduct === true)

		dispatch(onSelectedProducts(selectedProducts))
		dispatch(setTotalProductsCount(selectedProducts.length))
		dispatch(setCurrentPage(1))

		//updateFilterProps:        
		const filterProps = getState().products.filterProps

		delete filterProps.promotion
		delete filterProps.subcategory
		filterProps.category = categoryid

		dispatch(updateFilterProps(filterProps))


	}

}

export function subcategoriesFilter(obj) {

	return (dispatch, getState) => {

		removeActiveClass('promotionFilter')

		//selectedProducts:
		const products = getState().products.products

		const { categoryid, subcategoryid } = obj

		let selectedProducts = products.filter(product => product.category === categoryid && product.subcategory === subcategoryid && product.visibleproduct === true)

		dispatch(onSelectedProducts(selectedProducts))
		dispatch(setTotalProductsCount(selectedProducts.length))
		dispatch(setCurrentPage(1))

		//updateFilterProps:  
		const filterProps = getState().products.filterProps

		delete filterProps.promotion
		filterProps.category = categoryid
		filterProps.subcategory = subcategoryid

		dispatch(updateFilterProps(filterProps))

	}
}

export function promotionFilter(obj) {

	return (dispatch, getState) => {

		//        const allLinks = [...document.querySelectorAll('.filter_link')]   
		//    
		//        allLinks.forEach(link => {
		//            link.classList.remove('active')
		//        })

		const { status } = obj

		//selectedProducts:
		const products = getState().products.products

		let selectedProducts

		if (status) {
			selectedProducts = products.filter(product => product.promotion !== 0)
		} else {
			selectedProducts = products.filter(product => product.promotion >= 0)
		}

		dispatch(onSelectedProducts(selectedProducts))
		dispatch(setTotalProductsCount(selectedProducts.length))
		dispatch(setCurrentPage(1))

		//updateFilterProps:        
		const filterProps = getState().products.filterProps

		//        delete filterProps.subcategory
		//        delete filterProps.category
		filterProps.promotion = status

		dispatch(updateFilterProps(filterProps))


	}

}

export function updateFilterProps(filterProps) {
	return {
		type: UPDATE_FILTER_PROPS,
		filterProps
	}
}

export function setFilterBy(val) {

	const sortLinks = [...document.querySelectorAll('.aSort .nav-link')]
	sortLinks.forEach(link => {
		link.classList.remove('active')
	})

	const sortLinksThis = [...document.querySelectorAll(`.nav-link[name = ${val}]`)]
	sortLinksThis.forEach(link => {
		link.classList.add('active')
	})

	return {
		type: SET_FILTER_BY,
		val
	}
}

export function setSearchQuery(val, totalProductsCount) {
	return {
		type: SET_SEARCH_QUERY,
		val, totalProductsCount
	}
}

export function resetFilters() {

	removeActiveClass('filter_link')
	removeActiveClass('promotionFilter')

	return {
		type: RESET_FILTERS
	}
}

export function onSelectedProducts(selectedProducts) {

	if (selectedProducts.length) {
		return {
			type: ON_SELECTED_PRODUCTS,
			payload: { selectedProducts }
		}
	} else {

		return {
			type: ON_SELECTED_PRODUCTS,
			payload: { selectedProducts: [null] }
		}
	}
}

// end filter products on main page


// start filter products on admin products page

export function filterConditionAdmin(objproduct, objprops) {
	return (dispatch, getState) => {

		let filterCond = true

		for (const property in objprops) {

			let condition

			if (property === 'popularity') {

				if (objprops[property]) {
					if (objproduct[property] !== 0) {
						condition = true
					} else {
						condition = false
					}
				} else {
					condition = true
				}

			} else {
				condition = objproduct[property] === objprops[property]
			}

			if (filterCond === true || filterCond === false) {
				let newCondition = filterCond && condition
				filterCond = newCondition
			} else {
				filterCond = condition
			}
		}

		return filterCond
	}
}

export function visibleFilterAdmin(obj) {

	return (dispatch, getState) => {

		const products = getState().products.products

		const { visibleproduct } = obj

		let selectedProductsAdmin = products.filter(product => product.visibleproduct === visibleproduct)

		dispatch(onSelectedProductsAdmin(selectedProductsAdmin))

		//updateFilterPropsAdmin:        
		const filterPropsAdmin = getState().products.filterPropsAdmin

		removeActiveClass('popularityFilterAdmin')
		delete filterPropsAdmin.popularity
		filterPropsAdmin.visibleproduct = visibleproduct

		dispatch(updateFilterPropsAdmin(filterPropsAdmin))

	}
}

export function unitFilterAdmin(obj) {

	return (dispatch, getState) => {

		const products = getState().products.products

		const { units } = obj

		let selectedProductsAdmin = products.filter(product => product.units === units)

		dispatch(onSelectedProductsAdmin(selectedProductsAdmin))

		//updateFilterPropsAdmin:        
		const filterPropsAdmin = getState().products.filterPropsAdmin

		removeActiveClass('popularityFilterAdmin')
		delete filterPropsAdmin.popularity
		filterPropsAdmin.units = units

		dispatch(updateFilterPropsAdmin(filterPropsAdmin))

	}
}

export function promotionFilterAdmin(obj) {

	return (dispatch, getState) => {

		const products = getState().products.products

		const { promotion } = obj

		let selectedProductsAdmin = products.filter(product => product.promotion === promotion)

		dispatch(onSelectedProductsAdmin(selectedProductsAdmin))

		//updateFilterPropsAdmin:        
		const filterPropsAdmin = getState().products.filterPropsAdmin

		removeActiveClass('popularityFilterAdmin')
		delete filterPropsAdmin.popularity
		filterPropsAdmin.promotion = promotion

		dispatch(updateFilterPropsAdmin(filterPropsAdmin))

	}
}

export function categoriesFilterAdmin(obj) {

	return (dispatch, getState) => {

		//selectedProductsAdmin:
		const products = getState().products.products
		const categories = getState().products.categories

		const { categoryid } = obj

		const indexCategory = getIndexCategory(categoryid, categories)

		//        const subcategoryid = categories[indexCategory].subcategories[0].id

		let selectedProductsAdmin = products.filter(product => product.category === categoryid)

		dispatch(onSelectedProductsAdmin(selectedProductsAdmin))

		//updateFilterPropsAdmin:        
		const filterPropsAdmin = getState().products.filterPropsAdmin

		removeActiveClass('popularityFilterAdmin')
		delete filterPropsAdmin.popularity
		filterPropsAdmin.category = categoryid
		//        filterPropsAdmin.subcategory = subcategoryid

		dispatch(updateFilterPropsAdmin(filterPropsAdmin))

	}

}

export function subcategoriesFilterAdmin(obj) {

	return (dispatch, getState) => {

		//selectedProductsAdmin:
		const products = getState().products.products

		const { categoryid, subcategoryid } = obj

		let selectedProductsAdmin = products.filter(product => product.category === categoryid && product.subcategory === subcategoryid)

		dispatch(onSelectedProductsAdmin(selectedProductsAdmin))


		//updateFilterPropsAdmin:  
		const filterPropsAdmin = getState().products.filterPropsAdmin

		removeActiveClass('popularityFilterAdmin')
		delete filterPropsAdmin.popularity
		filterPropsAdmin.category = categoryid
		filterPropsAdmin.subcategory = subcategoryid

		dispatch(updateFilterPropsAdmin(filterPropsAdmin))

	}
}

export function popularityFilterAdmin(obj) {

	return (dispatch, getState) => {

		const { status } = obj

		//selectedProducts:
		const products = getState().products.products

		let selectedProductsAdmin

		if (status) {
			selectedProductsAdmin = products.filter(product => product.popularity !== 0)
		} else {
			selectedProductsAdmin = products.filter(product => product.popularity >= 0)
		}


		dispatch(onSelectedProductsAdmin(selectedProductsAdmin))

		//updateFilterProps:        
		const filterPropsAdmin = getState().products.filterPropsAdmin

		filterPropsAdmin.popularity = status

		dispatch(updateFilterPropsAdmin(filterPropsAdmin))


	}

}

export function updateFilterPropsAdmin(filterPropsAdmin) {
	return {
		type: UPDATE_FILTER_PROPS_ADMIN,
		filterPropsAdmin
	}
}

function removeActiveClass(filter) {
	const links = [...document.querySelectorAll(`.${filter}`)]

	links.forEach(link => {
		link.classList.remove('active')
	})
}
export function resetFiltersAdmin() {

	removeActiveClass('popularityFilterAdmin')

	return {
		type: RESET_FILTERS_ADMIN
	}
}

export function onSelectedProductsAdmin(selectedProductsAdmin) {

	if (selectedProductsAdmin.length) {
		return {
			type: ON_SELECTED_PRODUCTS_ADMIN,
			payload: { selectedProductsAdmin }
		}
	} else {

		return {
			type: ON_SELECTED_PRODUCTS_ADMIN,
			payload: { selectedProductsAdmin: [null] }
		}
	}
}

// end filter products on admin products page

export function priceIncludedPromotion(price, promotion) {

	return (dispatch, getState) => {

		const thisPrise = +(Math.round(price * ((100 - promotion) / 100)))

		return thisPrise

	}
}

function priceIncludedPromotion2(price, promotion) {

	const thisPrise = +(Math.round(price * ((100 - promotion) / 100)))

	return thisPrise
}



export function addProductToCart(obj) {
	return async (dispatch, getState) => {

		const { event, productId, price, promotion, stepunits, quantityProductYourOrder, indexOrderInHistory } = obj
		let { customerId } = obj

		if (customerId === null) {

			const responseIdLastCustomer = await axios.get(`idLastCustomer.json`)
			//
			customerId = responseIdLastCustomer.data + 1
		}

		const responseProducts = await axios.get(`products.json`)
		const productsData = responseProducts.data

		const quantityThisProductInDataBase = productsData.filter(product => product.id === productId)[0].quantity

		let productQuantity

		if (quantityProductYourOrder) {
			productQuantity = +document.querySelector(`input[name = product_${productId}_inHistory_${indexOrderInHistory}]`).value
		} else {
			productQuantity = +document.querySelector(`input[name = product_${productId}]`).value
		}

		if (productQuantity <= quantityThisProductInDataBase) {

			const responseOrders = await axios.get(`orders.json`)
			const ordersState = responseOrders.data ? responseOrders.data : []
			//            const ordersState = [...getState().products.orders]

			let { indexOrders, ordersThis } = getThisOrder(ordersState, customerId)

			let time = getDate()

			let orders

			if (ordersThis) {

				orders = { ...ordersThis }

				const cart = orders.cart
				if (cart) {
					const isProduct = cart.filter((cart, index) => cart.id === productId)[0]

					if (isProduct) {
						const quantityInCart = isProduct.quantity

						let quantityTotal = +(quantityInCart + productQuantity).toFixed(1)

						isProduct.quantity = quantityTotal

					} else {
						cart[cart.length] = { id: productId, quantity: productQuantity }
					}
				} else {
					orders.cart = []
					orders.cart[0] = { id: productId, quantity: productQuantity }
				}

				orders.date = time
				orders.status = 'in process...'

			} else {
				const db = firebase.database();
				const orderId = await addOrderId(db);

				orders = {
					orderId: orderId,      // 👈 додаємо
					customerId: customerId,
					cart: [{ id: productId, quantity: productQuantity }],
					date: time,
					status: 'in process...',
					checked: false
				}

			}

			ordersState[indexOrders] = orders
			dispatch(updateOrders(ordersState))

			try {
				//            await axios.post(`orders/${customerId}`, this.state.orders)

				const db = firebase.database()
				db.ref(`orders/${indexOrders}`).set(orders)

			} catch (e) {
				console.log(e)
			}
			if (!quantityProductYourOrder) {
				document.querySelector(`input[id = input_product_${productId}]`).value = 1

				document.querySelector(`span[id = product_price_${productId}]`).innerHTML = priceIncludedPromotion2(price, promotion)

			} else {
				document.querySelector(`input[id = input_product_${productId}_inHistory_${indexOrderInHistory}]`).value = quantityProductYourOrder

				document.querySelector(`p[id = product_price_${productId}_inHistory_${indexOrderInHistory}]`).querySelector('span').innerHTML = price
			}

		} else {
			alert('Вибачте, такої кількості товару немає в наявності!')
		}
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

export function setQuantityAll(productsdata) {
	return async (dispatch, getState) => {

		dispatch(updateProducts(productsdata))

		try {

			const db = firebase.database()
			db.ref(`products`).set(productsdata)

		} catch (e) {
			console.log(e)
		}

	}
}

export function updateStatusYourOrder(customerId, index) {
	return async (dispatch, getState) => {

		const responseOrdersHistory = await axios.get('ordersHistory.json')
		const ordersHistoryData = responseOrdersHistory.data

		const thisStatusOrderHistory = ordersHistoryData ? ordersHistoryData.filter(order => order.customerId === customerId)[0].cartsHistory[index].status : null

		document.querySelector(`.status_order_${index}`).innerHTML = thisStatusOrderHistory

		if (thisStatusOrderHistory === "in process...") {
			document.querySelector(`.status_order_${index}`).classList.add("text-danger")
			document.querySelector(`.status_order_${index}`).classList.remove("text-success")
		} else if (thisStatusOrderHistory === "completed") {
			document.querySelector(`.status_order_${index}`).classList.add("text-success")
			document.querySelector(`.status_order_${index}`).classList.remove("text-danger")
		}

		document.querySelector(`.btn_refresh_${index}`).blur()

	}
}

export function updateIsQuantProdInDB(status) {
	return {
		type: UPDATE_IS_QUANT_PROD_IN_DB,
		payload: { status }
	}
}

export function updateIsQuantProdInDBNew(customerId, index) {
	return async (dispatch, getState) => {
		const db = firebase.database();

		try {
			// 1️⃣ Отримуємо ordersHistory
			const responseOrdersHistory = await axios.get('ordersHistory.json');
			const ordersHistoryData = responseOrdersHistory.data ?? [];

			// 2️⃣ Знаходимо конкретне замовлення
			const customerOrderIndex = ordersHistoryData.findIndex(order => order.customerId === customerId);
			if (customerOrderIndex === -1) return;

			const order = ordersHistoryData[customerOrderIndex];
			const cartHistoryItem = order.cartsHistory[index];
			if (!cartHistoryItem) return;

			const cart = cartHistoryItem.cart;

			// 3️⃣ Отримуємо products.json
			const responseProducts = await axios.get('products.json');
			const productsData = responseProducts.data ?? [];

			// 4️⃣ Перевіряємо наявність товарів
			let insufficientProducts = [];

			cart.forEach(cartItem => {
				const productInDB = productsData.find(p => p.id === cartItem.id);
				if (productInDB) {
					if (cartItem.quantity > productInDB.quantity) {
						insufficientProducts.push({
							name: productInDB.name,
							available: productInDB.quantity,
							requested: cartItem.quantity
						});
					}
				} else {
					insufficientProducts.push({
						name: cartItem.name ?? `ID:${cartItem.id}`,
						available: 0,
						requested: cartItem.quantity
					});
				}
			});

			// 5️⃣ Якщо є недостатні товари — повідомляємо адміна і виходимо
			if (insufficientProducts.length > 0) {
				let message = '❌ Не вистачає товарів для списання:\n';
				insufficientProducts.forEach(item => {
					message += `${item.name}: доступно ${item.available}, запрошено ${item.requested}\n`;
				});

				alert(message); // або показати на фронтенді в спеціальному блоці для адміна
				return; // не списуємо нічого поки адмін не змінить кількість
			}

			// 6️⃣ Списуємо товари з бази
			cart.forEach(cartItem => {
				const productInDB = productsData.find(p => p.id === cartItem.id);
				if (productInDB) {
					productInDB.quantity -= cartItem.quantity;
					productInDB.popularity += 1;
				}
			});

			// 7️⃣ Оновлюємо статус замовлення на confirmed
			cartHistoryItem.status = 'confirmed';

			// 8️⃣ Оновлюємо базу даних
			await db.ref('products').set(productsData);
			await db.ref(`ordersHistory/${customerOrderIndex}`).set(order);

			// 9️⃣ Оновлюємо Redux
			dispatch({
				type: 'UPDATE_ORDERS_HISTORY',
				payload: ordersHistoryData
			});

			console.log(`✅ Замовлення клієнта ${customerId} підтверджено, товари списані.`);
		} catch (err) {
			console.error('❌ Помилка при підтвердженні замовлення:', err);
		}
	};
}

export const addOrderId = async () => {
	try {
		// Отримуємо поточне значення idLastOrder
		const responseIdLastOrder = await axios.get('idLastOrder.json');
		let idLastOrder = responseIdLastOrder.data !== null ? responseIdLastOrder.data : -1;

		const idThisOrder = idLastOrder + 1;

		// Оновлюємо значення в базі

		const db = firebase.database()
		await db.ref('idLastOrder').set(idThisOrder);

		return idThisOrder;
	} catch (e) {
		console.error('Помилка addOrderId:', e);
		throw e;
	}
};

// Додає новий orderHistoryId, використовуючи Axios
export const addOrderHistoryId = async () => {
	try {
		// Отримуємо поточне значення idLastOrderHistory

		const responseIdLastOrderHistory = await axios.get('idLastOrderHistory.json');
		let idLastOrderHistory = responseIdLastOrderHistory.data !== null ? responseIdLastOrderHistory.data : -1;

		const idThisOrderHistory = idLastOrderHistory + 1;

		// Оновлюємо значення в базі

		const db = firebase.database()
		await db.ref('idLastOrderHistory').set(idThisOrderHistory);

		return idThisOrderHistory;
	} catch (e) {
		console.error('Помилка addOrderHistoryId:', e);
		throw e;
	}
};

export const updateExistingOrders = async (db) => {
	try {
		const responseOrders = await axios.get('orders.json');
		const ordersData = responseOrders.data;

		if (!ordersData || !Array.isArray(ordersData)) return;

		for (let i = 0; i < ordersData.length; i++) {
			const order = ordersData[i];

			if (!order.cart) continue;

			// Генеруємо унікальний orderId
			const orderId = await addOrderId(db); // або createNewOrderId()
			order.orderId = orderId;
		}

		// Записуємо назад у базу
		await db.ref('orders').set(ordersData);
		console.log('Всі orderId додані успішно!');
	} catch (e) {
		console.error('Помилка при оновленні orders:', e);
	}
};

// Додає orderHistoryId у всі існуючі історії замовлень
// export const updateExistingOrdersHistory = async (db) => {
// 	try {
// 		const responseOrdersHistory = await axios.get('ordersHistory.json');
// 		const ordersHistoryData = responseOrdersHistory.data;

// 		if (!ordersHistoryData || !Array.isArray(ordersHistoryData)) return;

// 		for (let i = 0; i < ordersHistoryData.length; i++) {
// 			const orderHistory = ordersHistoryData[i];

// 			if (!orderHistory.cartsHistory) continue;

// 			// Генеруємо унікальний orderHistoryId
// 			const orderHistoryId = await addOrderHistoryId(db); // або createNewOrderHistoryId()
// 			orderHistory.orderHistoryId = orderHistoryId;
// 		}

// 		// Записуємо назад у базу
// 		await db.ref('ordersHistory').set(ordersHistoryData);
// 		console.log('Всі orderHistoryId додані успішно!');
// 	} catch (e) {
// 		console.error('Помилка при оновленні ordersHistory:', e);
// 	}
// };

export const updateExistingOrdersHistory = async (db) => {
	try {
		const responseOrdersHistory = await axios.get('ordersHistory.json');
		const ordersHistoryData = responseOrdersHistory.data;

		if (!ordersHistoryData || !Array.isArray(ordersHistoryData)) return;

		for (let i = 0; i < ordersHistoryData.length; i++) {
			const orderHistory = ordersHistoryData[i];

			if (!orderHistory.cartsHistory) continue;

			for (let j = 0; j < orderHistory.cartsHistory.length; j++) {
				const cartItem = orderHistory.cartsHistory[j];

				// Додаємо orderHistoryId тільки якщо його ще немає
				if (!cartItem.orderHistoryId) {
					const newId = await addOrderHistoryId(db);
					cartItem.orderHistoryId = newId;
				}
			}
		}

		// Записуємо назад у базу
		await db.ref('ordersHistory').set(ordersHistoryData);

		console.log('orderHistoryId додані в cartsHistory успішно!');
	} catch (e) {
		console.error('Помилка при оновленні ordersHistory:', e);
	}
};

export const removeOrderHistoryIds = async (db) => {
	try {
		const responseOrdersHistory = await axios.get('ordersHistory.json');
		const ordersHistoryData = responseOrdersHistory.data;

		if (!ordersHistoryData || !Array.isArray(ordersHistoryData)) return;

		for (let i = 0; i < ordersHistoryData.length; i++) {
			const orderHistory = ordersHistoryData[i];

			if (!orderHistory.cartsHistory) continue;

			// Видаляємо поле orderHistoryId якщо воно є
			delete orderHistory.orderHistoryId;

			// Якщо orderHistoryId знаходиться всередині cartsHistory
			for (let j = 0; j < orderHistory.cartsHistory.length; j++) {
				delete orderHistory.cartsHistory[j].orderHistoryId;
			}
		}

		await db.ref('ordersHistory').set(ordersHistoryData);

		console.log('Всі orderHistoryId видалені успішно!');
	} catch (e) {
		console.error('Помилка при видаленні orderHistoryId:', e);
	}
};

export function addProductWithCartToOrdersHistory(obj) {
	return async (dispatch, getState) => {

		const db = firebase.database()
		let { customerId } = obj
		const { email } = obj

		const customersState = [...getState().inform.customers]
		const responseOrders = await axios.get(`orders.json`)
		const ordersState = responseOrders.data ? responseOrders.data : []

		// find indexOrders in the database orders
		let { indexOrders, ordersThis } = getThisOrder(ordersState, customerId)

		console.log('addProductWithCartToOrdersHistory_ordersThis_cart', ordersThis.cart)

		// add price in ordersThis.cart`````````````````

		const responseProducts = await axios.get(`products.json`)
		const productsData = responseProducts.data

		let counterIdInOrdersThisCart = 0
		const arrPropsIsQuantityInDB = []

		for (let i = 0; i < productsData.length; i++) {

			if (counterIdInOrdersThisCart >= ordersThis.cart.length) {
				console.log('The cycle ended with an iteration:', i)
				break;
			}

			ordersThis.cart.forEach((cart, index) => {

				if (productsData[i].id === cart.id) {

					ordersThis.cart[index].price = priceIncludedPromotion2(productsData[i].price, productsData[i].promotion)

					counterIdInOrdersThisCart++
				}

			})
		}

		console.log('addProductWithCartToOrdersHistory_ordersThisCart', ordersThis.cart)

		// add price in ordersThis.cart..............

		// check if there is a customer in the database customers
		const customerInBase = customersState.filter(customer => customer.email === email)[0]

		const idThisCustomerInBase = customerInBase ? customerInBase.id : null

		if (idThisCustomerInBase) {
			customerId = idThisCustomerInBase
		}

		const responseOrdersHistory = await axios.get(`ordersHistory.json`)
		const ordersHistoryData = responseOrdersHistory.data ? responseOrdersHistory.data : []

		let orders

		let time = getDate()

		const orderHistoryId = await addOrderHistoryId(db);

		if (ordersHistoryData[0]) {

			// find indexOrders in the database ordersHistory
			let { indexOrders: indexOrdersHistory, ordersThis: ordersHistoryThis } = getThisOrder(ordersHistoryData, idThisCustomerInBase)

			if (ordersHistoryThis) {

				orders = { ...ordersHistoryThis }
				orders.cartsHistory.push({ orderHistoryId, cart: ordersThis.cart, date: time, status: 'in process...', customerId, checked: false })

			} else {
				orders = { customerId, cartsHistory: [{ orderHistoryId, cart: ordersThis.cart, date: time, status: 'in process...', customerId, checked: false }], checked: false }
			}

			ordersHistoryData[indexOrdersHistory] = orders

			dispatch(updateOrdersHistory(ordersHistoryData))

			try {
				//            await axios.post(`orders/${customerId}`, this.state.orders)

				db.ref(`ordersHistory/${indexOrdersHistory}`).set(orders)

			} catch (e) {
				console.log(e)
			}



		} else {
			orders = { customerId, cartsHistory: [{ orderHistoryId, cart: ordersThis.cart, date: time, status: 'in process...', customerId, checked: false }], checked: false }

			ordersHistoryData[0] = orders

			dispatch(updateOrdersHistory(ordersHistoryData))

			try {
				//            await axios.post(`orders/${customerId}`, this.state.orders)

				db.ref(`ordersHistory/0`).set(orders)

			} catch (e) {
				console.log(e)
			}


		}

		//        const responseOrders = await axios.get(`orders.json`)
		//
		//        const ordersState = responseOrders.data  

		ordersState.splice(indexOrders, 1)

		dispatch(updateOrders(ordersState))

		try {
			//            await axios.post(`orders/${customerId}`, this.state.orders)

			db.ref(`orders`).set(ordersState)

		} catch (e) {
			console.log(e)
		}

		dispatch(updateIsOrdersThisCart(false))

		// try {

		// 	db.ref(`requestProducts`).set(false)

		// 	console.log('sended_your_order!!!')
		// 	console.log('requestProducts_false')

		// } catch (e) {
		// 	console.log(e)
		// }

	}
}

export function updateIsOrdersHistoryThisCart(status) {
	return {
		type: UPDATE_IS_ORDERS_HISTORY_THIS_CART,
		payload: { status }
	}
}

export function updateIsOrdersThisCart(status) {
	return {
		type: UPDATE_IS_ORDERS_THIS_CART,
		payload: { status }
	}
}

// export function changeStatusCustomersOrders(customerId, index, valueSelectedStatusOrder) {
// 	return async (dispatch, getState) => {

// 		const ordersHistory = [...getState().products.ordersHistory]
// 		const thisOrdersHistory = ordersHistory.filter(order => order.customerId === customerId)[0] ? ordersHistory.filter(order => order.customerId === customerId)[0].cartsHistory[index] : null

// 		let statusCustomersOrdersInBase = thisOrdersHistory.status
// 		//         
// 		thisOrdersHistory.status = valueSelectedStatusOrder

// 		try {

// 			const db = firebase.database()
// 			db.ref(`ordersHistory`).set(ordersHistory)

// 			dispatch(updateOrdersHistory(ordersHistory))

// 		} catch (e) {
// 			console.log(e)
// 		}

// 	}
// }

export function changeStatusCustomersOrders(customerId, orderHistoryId, valueSelectedStatusOrder) {
	return async (dispatch, getState) => {
		const db = firebase.database();

		/* ========= 1️⃣ Orders history ========= */
		const ordersHistory = [...getState().products.ordersHistory];
		const orderIndex = ordersHistory.findIndex(o => o.customerId === customerId);
		if (orderIndex === -1) return;

		const order = ordersHistory[orderIndex];
		const cartItem = order.cartsHistory.find(c => c.orderHistoryId === orderHistoryId);
		if (!cartItem) return;

		const oldStatus = cartItem.status;
		if (oldStatus === valueSelectedStatusOrder) return;

		/* ========= 2️⃣ Products ========= */
		const products = [...getState().products.products];
		const productsMap = new Map(products.map(p => [p.id, p]));

		/* ========= 3️⃣ Перевірка кількості при підтвердженні ========= */
		if (oldStatus === 'in process...' && valueSelectedStatusOrder === 'completed') {
			const insufficient = cartItem.cart.filter(item => {
				const product = productsMap.get(item.id);
				return !product || Number(product.quantity) < Number(item.quantity);
			});

			if (insufficient.length) {
				const msg = insufficient.map(item => {
					const product = productsMap.get(item.id);
					return `${product?.name || product?.title || item.productName || item.nameProduct || 'Без назви'}: замовлено ${item.quantity}, доступно ${product?.quantity || 0} ${product?.units || ''}`;
				}).join('\n');

				alert(`Неможливо підтвердити замовлення:\n${msg}`);
				return;
			}
		}

		/* ========= 4️⃣ Списання / повернення товарів ========= */
		cartItem.cart.forEach(item => {
			const product = productsMap.get(item.id);
			if (!product) return;

			product.quantity = Number(product.quantity) || 0;
			product.popularity = Number(product.popularity) || 0;

			if (oldStatus === 'in process...' && valueSelectedStatusOrder === 'completed') {
				product.quantity -= Number(item.quantity);
				product.popularity += 1;
			}

			if (oldStatus === 'completed' && valueSelectedStatusOrder === 'in process...') {
				product.quantity += Number(item.quantity);
			}
		});

		/* ========= 5️⃣ Міняємо статус ========= */
		cartItem.status = valueSelectedStatusOrder;

		/* ========= 6️⃣ Firebase: products + orders ========= */
		await Promise.all([
			db.ref('products').set(products),
			db.ref('ordersHistory').set(ordersHistory)
		]);

		/* ========= 7️⃣ Invoices ========= */
		const invoiceRef = db.ref(`invoices/${customerId}/${orderHistoryId}`);

		if (oldStatus === 'in process...' && valueSelectedStatusOrder === 'completed') {
			// створюємо накладну
			const invoiceItems = cartItem.cart.map(item => {
				const product = productsMap.get(item.id);
				return {
					productId: item.id ?? 'unknown-id',
					name: product?.name || product?.title || item.productName || item.nameProduct || 'Без назви',
					units: product?.units || 'шт',
					quantity: Number(item.quantity) || 0,
					price: product?.price || 0
				};
			});

			const invoiceData = {
				idOrderHistory: cartItem.orderHistoryId,
				customerId,
				date: cartItem.date,
				status: 'done',
				items: invoiceItems
			};

			await invoiceRef.set(invoiceData);
		}

		if (oldStatus === 'completed' && valueSelectedStatusOrder === 'in process...') {
			// видаляємо накладну
			await invoiceRef.remove();
		}

		/* ========= 8️⃣ invoicesSummary — ПОВНИЙ ПЕРЕРАХУНОК ========= */
		const summaryRef = db.ref(`invoicesSummary/${customerId}`);
		const invoicesSnapshot = await db.ref(`invoices/${customerId}`).once('value');
		const invoicesData = invoicesSnapshot.val();

		if (!invoicesData) {
			await summaryRef.remove();
		} else {
			const summary = {};

			Object.values(invoicesData).forEach(inv => {
				inv.items.forEach(item => {
					if (!summary[item.productId]) {
						summary[item.productId] = {
							productId: item.productId,
							name: item.name,
							units: item.units,
							totalQuantity: 0
						};
					}
					summary[item.productId].totalQuantity += Number(item.quantity);
				});
			});

			await summaryRef.set(summary);
		}

		/* ========= 9️⃣ Redux ========= */
		dispatch(updateOrdersHistory(ordersHistory));
		dispatch(updateProducts(products));

		console.log('✅ Статус змінено:', oldStatus, '→', valueSelectedStatusOrder);
	};
}


export function changeStatusCustomersCarts(customerId, index, valueSelectedStatusOrder) {
	return async (dispatch, getState) => {

		const orders = [...getState().products.orders]
		const thisOrders = orders.filter(order => order.customerId === customerId)[0] ? orders.filter(order => order.customerId === customerId)[0] : null

		let statusCustomersOrdersInBase = thisOrders.status
		//         
		thisOrders.status = valueSelectedStatusOrder

		try {

			const db = firebase.database()
			db.ref(`orders`).set(orders)

			dispatch(updateOrders(orders))

		} catch (e) {
			console.log(e)
		}

	}
}



export function onDelete(obj) {
	return async (dispatch, getState) => {
		let { id, customerId } = obj

		const responseOrders = await axios.get(`orders.json`)
		const orders = responseOrders.data ? responseOrders.data : []

		let { indexOrders, ordersThis } = getThisOrder(orders, customerId)

		const cart = ordersThis.cart

		cart.forEach((product, index) => {
			if (product.id === id) {
				cart.splice(index, 1)
			}
		})

		//        let elem = document.querySelector(`div[id = product_cart_${id}]`)

		//        elem.remove() // Удаляю всю сторінку

		//        elem.classList.add("d-none")
		//        orders[indexOrders] = ordersThis


		//        const productQuantity = +document.querySelector(`input[name = quantity_product_${id}]`).value 
		//        
		//        const responseProducts = await axios.get(`products.json`)
		//        const productsData = responseProducts.data 
		//        productsData.forEach((product, index) => {
		//            if(product.id === id) {
		//                let productQuantityInDataBase = productsData[index].quantity
		//                let productQuantityNow = +(productQuantityInDataBase + productQuantity).toFixed(1)
		//                console.log('productQuantityInDataBase', productQuantityInDataBase)
		//                console.log('productQuantity', productQuantity)
		//                console.log('productQuantityNow', productQuantityNow)
		//                productsData[index].quantity = productQuantityNow
		//            }
		//        })     
		//        
		//        dispatch(updateProducts(productsData))

		if (!ordersThis.cart[0]) {
			orders.splice(indexOrders, 1)
			ordersThis = null
		}

		dispatch(updateOrders(orders))

		try {

			const db = firebase.database()
			if (!ordersThis) {
				db.ref(`orders`).set(orders)
			} else {
				db.ref(`orders/${indexOrders}`).update(ordersThis)
			}

			//            db.ref(`products`).set(productsData)

		} catch (e) {
			console.log(e)
		}

		let isOrdersThisCart

		if (ordersThis) {
			let ordersThisCart = Object.keys(ordersThis).filter(order => order === 'cart')[0] ? true : false
			if (ordersThisCart) {
				isOrdersThisCart = ordersThis.cart[0] ? true : false
			}
		}

		dispatch(updateIsOrdersThisCart(isOrdersThisCart))

	}
}

export function removeOrdersCustomer(idCustomer) {

	return async (dispatch, getState) => {

		const responseOrders = await axios.get('orders.json')
		const orders = responseOrders.data ? responseOrders.data : []

		orders.forEach((order, index) => {
			if (order.customerId === idCustomer) {
				orders.splice(index, 1)
			}
		})

		let elem = document.querySelector(`li[id = li_customer_orders_${idCustomer}]`)

		elem.classList.add("d-none")


		const db = firebase.database()

		db.ref(`orders`).set(orders)

		dispatch(updateOrders(orders))

	}

}

export function removeOrdersHistoryCustomer(idCustomer, page) {

	return async (dispatch, getState) => {

		const responseOrdersHistory = await axios.get('ordersHistory.json')
		const ordersHistory = responseOrdersHistory.data ? responseOrdersHistory.data : []

		ordersHistory.forEach((order, index) => {
			if (order.customerId === idCustomer) {
				ordersHistory.splice(index, 1)
			}
		})

		if (page === 'SwitchCustomersOrders') {
			let elem = document.querySelector(`li[id = li_customer_orders_${idCustomer}]`)

			elem.classList.add("d-none")
		}


		const db = firebase.database()

		db.ref(`ordersHistory`).set(ordersHistory)

		dispatch(updateOrdersHistory(ordersHistory))

	}

}

export function removeOrderHistoryCustomer(idCustomer, indexorder) {

	return async (dispatch, getState) => {

		const responseOrdersHistory = await axios.get('ordersHistory.json')
		const ordersHistory = responseOrdersHistory.data ? responseOrdersHistory.data : []

		const thisOrderHistory = ordersHistory.filter(order => order.customerId === idCustomer)[0].cartsHistory

		thisOrderHistory.forEach((order, index) => {
			if (index === indexorder) {
				thisOrderHistory.splice(index, 1)
			}
		})

		let elem = document.querySelector(`div[id = customer_order_${indexorder}]`)

		elem.classList.add("d-none")

		const db = firebase.database()

		db.ref(`ordersHistory`).set(ordersHistory)

		dispatch(updateOrdersHistory(ordersHistory))

	}

}

function getThisOrder(orders, customerId) {
	let indexOrders
	let indexOrdersNext
	let ordersThis

	const order = orders.filter((order, index) => {

		if (order.customerId === customerId) {
			indexOrders = index
			ordersThis = order
		}

		return order.customerId === customerId

	})

	if (!order[0]) {
		indexOrders = null
		ordersThis = null
	}

	indexOrdersNext = orders.length

	return { indexOrders: ordersThis ? indexOrders : indexOrdersNext, ordersThis: ordersThis ? { ...ordersThis } : null }
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

export function toggleProduct(id, checked) {

	return async (dispatch, getState) => {

		const products = getState().products.products

		const thisProducts = products.map(product => {
			if (product.id === id) {
				product.checked = checked
			}
			return product
		})

		dispatch(updateProducts(thisProducts))

	}

}

export function toggleAllProducts(checked) {

	return async (dispatch, getState) => {

		const products = getState().products.products

		const thisProducts = products.map(product => {
			product.checked = checked
			return product
		})

		dispatch(updateProducts(thisProducts))

	}

}

export function toggleCategory(id, checked) {

	return async (dispatch, getState) => {

		const categories = getState().products.categories

		const thisCategories = categories.map(category => {
			if (category.id === id) {
				category.checked = checked
			}
			return category
		})

		dispatch(updateCategories(thisCategories))

	}

}

export function toggleAllCategories(checked) {

	return async (dispatch, getState) => {

		const categories = getState().products.categories

		const thisCategories = categories.map(category => {
			category.checked = checked
			return category
		})

		dispatch(updateCategories(thisCategories))

	}

}

export function toggleSubcategory(idCategory, subcategoryId, checked) {

	return async (dispatch, getState) => {

		const categories = getState().products.categories
		const indexCategory = getIndexCategory(idCategory, categories)
		const subcategories = getSubcategories(indexCategory, categories)

		const thisSubcategories = subcategories.map(subcategory => {
			if (subcategory.id === subcategoryId) {
				subcategory.checked = checked
			}
			return subcategory
		})

		dispatch(updateCategories(categories))

	}

}

export function toggleAllSubcategories(idCategory, checked) {

	return async (dispatch, getState) => {

		const categories = getState().products.categories
		const indexCategory = getIndexCategory(idCategory, categories)
		const subcategories = getSubcategories(indexCategory, categories)

		const thisSubcategories = subcategories.map(subcategory => {
			subcategory.checked = checked
			return subcategory
		})

		dispatch(updateCategories(categories))

	}

}



export function removeProducts(id) {

	return async (dispatch, getState) => {

		const db = firebase.database()

		// delete product from orders:

		const responseOrders = await axios.get(`orders.json`)
		let ordersData = responseOrders.data

		if (ordersData) {
			ordersData.forEach(order => {

				let isCart = Object.keys(order).filter(k => k === "cart")[0] ? true : false
				if (isCart) {
					order.cart = order.cart.filter(cartItem => cartItem.id !== id)
				}

			})

			// delete cart without products````````````
			const ordersDataWithoutElem = ordersData.filter(elem => elem.cart[0] !== undefined)
			ordersData = ordersDataWithoutElem
			// delete cart without products.............

			dispatch(updateOrders(ordersData))
			db.ref(`orders`).set(ordersData)

		}


		//        // delete product from ordersHistory:
		//        
		//        const responseOrdersHistory = await axios.get(`ordersHistory.json`)
		//        const ordersHistoryData = responseOrdersHistory.data        
		//        
		//        if(ordersHistoryData) {
		//            
		//            ordersHistoryData.forEach(order => {
		//                
		//                const carts = order.cartsHistory
		//                
		//                carts.forEach(cartsItem => {                
		//                    
		//                    let isCart = Object.keys(cartsItem).filter(k => k === "cart")[0] ? true : false
		//                    if (isCart) {
		//                        cartsItem.cart = cartsItem.cart.filter(cartItem => cartItem.id !== id)
		//                    } 
		//                    
		//                    
		//                })
		//                
		//            })
		//            
		//            dispatch(updateOrdersHistory(ordersHistoryData))        
		//            db.ref(`ordersHistory`).set(ordersHistoryData)
		//            
		//        }


		// delete product from products:

		const responseProductsDeleted = await axios.get('productsDeleted.json')
		const productsDeleted = responseProductsDeleted.data ? responseProductsDeleted.data : getState().products.productsDeleted

		const responseProducts = await axios.get('products.json')
		const products = responseProducts.data ? responseProducts.data : getState().products.products

		products.forEach((product, index) => {
			if (product.id === id) {
				products.splice(index, 1)
				product.status = 'deleted'
				productsDeleted.push(product)
			}
		})

		let elem = document.querySelector(`tr[id = product_table_${id}]`)

		elem.classList.add("d-none")

		db.ref(`products`).set(products)
		db.ref(`productsDeleted`).set(productsDeleted)

		dispatch(updateProducts(products))
		dispatch(updateProductsDeleted(productsDeleted))

	}

}

export function removeCategories(id) {

	return async (dispatch, getState) => {

		const db = firebase.database()

		const responseProducts = await axios.get('products.json')
		const products = responseProducts.data

		if (products) {
			const productsThisCategory = []

			products.forEach(product => {

				if (product.category === id) {
					productsThisCategory.push(product.id)
				}
			})

			// delete product from orders:

			const responseOrders = await axios.get(`orders.json`)
			const ordersData = responseOrders.data

			if (ordersData) {
				ordersData.forEach(order => {

					let isCart = Object.keys(order).filter(k => k === "cart")[0] ? true : false
					if (isCart) {
						productsThisCategory.forEach(id => {
							order.cart = order.cart.filter(cartItem => cartItem.id !== id)
						})
					}

				})



				dispatch(updateOrders(ordersData))
				db.ref(`orders`).set(ordersData)
			}

			// delete product from ordersHistory:

			const responseOrdersHistory = await axios.get(`ordersHistory.json`)
			const ordersHistoryData = responseOrdersHistory.data

			if (ordersHistoryData) {

				ordersHistoryData.forEach(order => {

					const carts = order.cartsHistory

					carts.forEach(cartsItem => {

						let isCart = Object.keys(cartsItem).filter(k => k === "cart")[0] ? true : false
						if (isCart) {
							productsThisCategory.forEach(id => {
								cartsItem.cart = cartsItem.cart.filter(cartItem => cartItem.id !== id)
							})

						}


					})

				})

				dispatch(updateOrdersHistory(ordersHistoryData))
				db.ref(`ordersHistory`).set(ordersHistoryData)

			}

			// delete product from products:

			productsThisCategory.forEach(id => {
				products.forEach((product, index) => {
					if (product.id === id) {
						products.splice(index, 1)
					}
				})
			})

			let elem = document.querySelector(`tr[id = category_table_${id}]`)

			elem.classList.add("d-none")

			db.ref(`products`).set(products)
			dispatch(updateProducts(products))
		}


		const responseCategories = await axios.get('categories.json')
		const categories = responseCategories.data

		if (categories) {
			const newCategories = categories.filter(category => category.id !== id)

			dispatch(updateCategories(newCategories))
			db.ref(`categories`).set(newCategories)
		}

		// update idLastCategory

		const responseIdLastCategory = await axios.get('idLastCategory.json')
		const idLastCategoryData = responseIdLastCategory.data
		let idLastCategory = idLastCategoryData

		let idLastCategoryNow = idLastCategory - 1

		try {

			const db = firebase.database()
			db.ref(`idLastCategory`).set(idLastCategoryNow)

		} catch (e) {
			console.log(e)
		}

	}

}

export function setCurrentPage(currentPage) {
	return {
		type: SET_CURRENT_PAGE,
		currentPage
	}
}

export function setTotalProductsCount(totalProductsCount) {
	return {
		type: SET_TOTAL_PRODUCTS_COUNT,
		totalProductsCount
	}
}

export function removeSubcategories(idCategory, subcategoryId) {

	return async (dispatch, getState) => {

		const db = firebase.database()

		const responseProducts = await axios.get('products.json')
		const products = responseProducts.data

		if (products) {
			const productsThisSubcategory = []

			products.forEach(product => {

				if (product.subcategory === subcategoryId) {
					productsThisSubcategory.push(product.id)
				}
			})

			// delete product from orders:

			const responseOrders = await axios.get(`orders.json`)
			const ordersData = responseOrders.data

			if (ordersData) {
				ordersData.forEach(order => {

					let isCart = Object.keys(order).filter(k => k === "cart")[0] ? true : false
					if (isCart) {
						productsThisSubcategory.forEach(id => {
							order.cart = order.cart.filter(cartItem => cartItem.id !== id)
						})
					}

				})



				dispatch(updateOrders(ordersData))
				db.ref(`orders`).set(ordersData)
			}

			// delete product from ordersHistory:

			const responseOrdersHistory = await axios.get(`ordersHistory.json`)
			const ordersHistoryData = responseOrdersHistory.data

			if (ordersHistoryData) {

				ordersHistoryData.forEach(order => {

					const carts = order.cartsHistory

					carts.forEach(cartsItem => {

						let isCart = Object.keys(cartsItem).filter(k => k === "cart")[0] ? true : false
						if (isCart) {
							productsThisSubcategory.forEach(id => {
								cartsItem.cart = cartsItem.cart.filter(cartItem => cartItem.id !== id)
							})

						}


					})

				})

				dispatch(updateOrdersHistory(ordersHistoryData))
				db.ref(`ordersHistory`).set(ordersHistoryData)

			}

			// delete product from products:

			productsThisSubcategory.forEach(id => {
				products.forEach((product, index) => {
					if (product.id === id) {
						products.splice(index, 1)
					}
				})
			})

			let elem = document.querySelector(`tr[id = subcategory_table_${subcategoryId}]`)

			elem.classList.add("d-none")

			db.ref(`products`).set(products)
			dispatch(updateProducts(products))
		}

		const responseCategories = await axios.get('categories.json')
		const categories = responseCategories.data

		const indexCategory = getIndexCategory(idCategory, categories)
		const subcategories = getSubcategories(indexCategory, categories)

		if (categories) {
			const newSubcategories = subcategories.filter(subcategory => subcategory.id !== subcategoryId)

			categories[indexCategory].subcategories = newSubcategories

			dispatch(updateCategories(categories))
			db.ref(`categories`).set(categories)
		}

	}

}
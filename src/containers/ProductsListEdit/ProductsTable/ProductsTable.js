import React, { Component } from 'react'
import classes from './ProductsTable.module.css'
import ProductItem from '../ProductItem/ProductItem'
import { connect } from 'react-redux'
import orderBy from 'lodash/orderBy'
import Select from '../../../components/UI/Select/Select'
import { toggleAllProducts, fetchIsSubcategories, resetFiltersAdmin, categoriesFilterAdmin, subcategoriesFilterAdmin, unitFilterAdmin, promotionFilterAdmin, visibleFilterAdmin, filterConditionAdmin, popularityFilterAdmin } from '../../../redux/actions/products'

class ProductsTable extends Component {

	state = {
		checked: false,
		idSelectedCategory: 0,
		idSelectedSubcategory: 0,
		valueSelectedPromotion: 0,
		valueSelectedVisible: true,
		disabledOptionChooseCategory: false,
		disabledOptionChooseSubcategory: false,
		disabledOptionChooseUnit: false,
		disabledOptionChoosePromotion: false,
		disabledOptionChooseVisible: false,
		popularityFilterAdmin: false
	}

	useInputCheckedAll(defaultValue = '') {  // self hook chanch value in input

		return {
			bind: {
				onChange: event => { this.setState({ checked: event.target.checked }) },
				type: "checkbox",
				onClick: event => {

					let status = event.target.checked

					this.props.toggleAllProducts(status)
				}
			}

		}
	}

	selectChangeCategory = event => {

		let idSelectedCategory = +event.target.value

		this.setState({
			idSelectedCategory, disabledOptionChooseCategory: true
		})

		this.props.fetchIsSubcategories(idSelectedCategory)

		this.clickFiltersAdmin({ filter: 'categoriesFilterAdmin', event, categoryid: idSelectedCategory })

	}

	selectChangeSubcategory = event => {

		let idSelectedCategory = this.state.idSelectedCategory

		let idSelectedSubcategory = +event.target.value

		this.setState({
			idSelectedSubcategory, disabledOptionChooseSubcategory: true
		})

		this.clickFiltersAdmin({ filter: 'subcategoriesFilterAdmin', event, categoryid: idSelectedCategory, subcategoryid: idSelectedSubcategory })

	}

	selectChangeUnits = event => {

		let valueSelectedUnit = event.target.value

		this.setState({
			valueSelectedUnit, disabledOptionChooseUnit: true
		})

		this.clickFiltersAdmin({ filter: 'unitFilterAdmin', event, units: valueSelectedUnit })

	}

	selectChangePromotions = event => {

		let valueSelectedPromotion = +event.target.value

		this.setState({
			valueSelectedPromotion, disabledOptionChoosePromotion: true
		})

		this.clickFiltersAdmin({ filter: 'promotionFilterAdmin', event, promotion: valueSelectedPromotion })

	}

	selectChangeVisible = event => {

		let valueSelectedVisible = event.target.value === "true" ? true : false

		this.setState({
			valueSelectedVisible, disabledOptionChooseVisible: true
		})

		this.clickFiltersAdmin({ filter: 'visibleFilterAdmin', event, visibleproduct: valueSelectedVisible })

	}


	optionSelectCategory = event => {

		if (this.props.categories[0]) {

			//            return this.props.categories.map(category => {
			//                return {text: category.name, value: category.id}
			//            })

			const thisOptions = this.props.categories.map(category => {
				return { text: category.name, value: category.id }
			})

			let thisOption

			thisOptions.forEach((category, index) => {

				if (category.value === this.state.idSelectedCategory) {
					thisOption = category
					thisOptions.splice(index, 1)
					thisOptions.unshift(thisOption)
				}

			})

			thisOptions.unshift({ text: 'Виберіть категорію', value: -1, disabled: this.state.disabledOptionChooseCategory })

			return thisOptions

		} else {
			return [{ text: "Немає категорії", value: "Немає категорії" }]
		}


	}

	optionPromotionsProduct = event => {

		const thisPromotionsOptions = []

		for (let i = 0; i <= 100; i += 5) {
			thisPromotionsOptions.push({ text: i, value: i })
		}

		let thisPromotion

		thisPromotionsOptions.forEach((promotion, index) => {

			if (promotion.value === this.state.valueSelectedPromotion) {
				thisPromotion = promotion

				thisPromotionsOptions.splice(index, 1)
				thisPromotionsOptions.unshift(thisPromotion)
			}

		})

		thisPromotionsOptions.unshift({ text: 'Виберіть знижку', value: -1, disabled: this.state.disabledOptionChoosePromotion })

		return thisPromotionsOptions

	}

	optionSelectSubcategory = idSelectedCategory => {

		if (this.props.categories[idSelectedCategory]) {
			if (this.props.categories[idSelectedCategory].subcategories) {
				//               return this.props.categories[idSelectedCategory].subcategories.map(subcategory => {         
				//                   
				//                    if(subcategory.id === 0) {
				//                        return {text: `${subcategory.name}`, value: subcategory.id, selected: 'selected'}
				//                    }
				//                   
				//                    return {text: `${subcategory.name}`, value: subcategory.id}
				//                })

				const thisOptions = this.props.categories[idSelectedCategory].subcategories.map(subcategory => {
					return { text: subcategory.name, value: subcategory.id }
				})

				let thisOption

				thisOptions.forEach((subcategory, index) => {

					if (subcategory.value === this.state.idSelectedSubcategory) {
						thisOption = subcategory
						thisOptions.splice(index, 1)
						thisOptions.unshift(thisOption)
					}

				})

				thisOptions.unshift({ text: 'Виберіть підкатегорію', value: -1, disabled: this.state.disabledOptionChooseSubcategory })

				return thisOptions

			} else {
				return [{ text: "Немає підкатегорії", value: "Немає підкатегорії" }]
			}

		} else {
			return [{ text: "Немає підкатегорії", value: "Немає підкатегорії" }]
		}

	}

	optionUnitsProduct = event => {

		const thisUnitsOptions = [{ text: "шт", value: "шт" }, { text: "кг", value: "кг" }]

		let thisUnit

		thisUnitsOptions.forEach((unit, index) => {

			if (unit.value === this.state.valueSelectedUnit) {
				thisUnit = unit
				thisUnitsOptions.splice(index, 1)
				thisUnitsOptions.unshift(thisUnit)
			}

		})

		thisUnitsOptions.unshift({ text: 'Виберіть одиниці', value: -1, disabled: this.state.disabledOptionChooseUnit })

		return thisUnitsOptions

	}

	optionVisibleProduct = event => {

		const thisVisibleOptions = [{ text: "Видимий", value: true }, { text: "Невидимий", value: false }]

		let thisVisible

		thisVisibleOptions.forEach((visible, index) => {

			if (visible.value === this.state.valueSelectedVisible) {
				thisVisible = visible
				thisVisibleOptions.splice(index, 1)
				thisVisibleOptions.unshift(thisVisible)
			}

		})

		thisVisibleOptions.unshift({ text: 'Виберіть видимість', value: -1, disabled: this.state.disabledOptionChooseVisible })

		return thisVisibleOptions

	}

	//    resetFiltersAdmin = event => {       
	//            
	//        this.props.resetFiltersAdmin()
	//        
	//        this.setState({            
	//            idSelectedCategory: 0, idSelectedSubcategory: 0, valueSelectedPromotion: 0, valueSelectedVisible: true, disabledOptionChooseCategory: false, disabledOptionChooseSubcategory: false, disabledOptionChooseUnit: false, disabledOptionChooseVisible: false, disabledOptionChoosePromotion: false, popularityFilterAdmin: false
	//        })
	//        
	////        document.querySelector(`select[name = "categories"]`).value = 0        
	////        document.querySelector(`select[name = "subcategories"]`).value = 0        
	//                
	//    }

	//    popularityFilterAdmin = () => {
	//                    
	//        const popularityLinks = [...document.querySelectorAll('.popularityFilterAdmin')]
	//           
	//        popularityLinks.forEach(link => {
	//            link.classList.toggle('active')
	//        })
	//
	//        let status
	//        
	//        if (this.state.popularityFilterAdmin === false) {
	//            status = true
	//            this.props.popularityFilterAdmin({status})
	//            this.setState({ popularityFilterAdmin: true })
	//        } else {
	//            status = false
	//            this.props.popularityFilterAdmin({status})
	//            this.setState({ popularityFilterAdmin: false })
	//        }
	//        
	//        
	//        
	//        
	//    }

	clickFiltersAdmin = obj => {

		const { filter, event } = obj

		console.log('filter', filter)
		console.log('event.target.dataset', event.target.dataset)

		if (filter === 'resetFiltersAdmin') {

			this.props.resetFiltersAdmin()

			this.setState({
				idSelectedCategory: 0, idSelectedSubcategory: 0, valueSelectedPromotion: 0, valueSelectedVisible: true, disabledOptionChooseCategory: false, disabledOptionChooseSubcategory: false, disabledOptionChooseUnit: false, disabledOptionChooseVisible: false, disabledOptionChoosePromotion: false, popularityFilterAdmin: false
			})

		} else if (filter === 'promotionFilterAdmin') {

			const { promotion } = obj

			this.props.promotionFilterAdmin({ promotion })

			this.setState({
				popularityFilterAdmin: false
			})

		} else if (filter === 'popularityFilterAdmin') {

			const popularityLinks = [...document.querySelectorAll('.popularityFilterAdmin')]

			popularityLinks.forEach(link => {
				link.classList.toggle('active')
			})

			let status

			if (this.state.popularityFilterAdmin === false) {
				status = true
				this.props.popularityFilterAdmin({ status })
				this.setState({ popularityFilterAdmin: true })
			} else {
				status = false
				this.props.popularityFilterAdmin({ status })
				this.setState({ popularityFilterAdmin: false })
			}

		} else if (filter === 'categoriesFilterAdmin') {

			const { categoryid } = obj

			this.props.categoriesFilterAdmin({ categoryid })

			this.setState({
				popularityFilterAdmin: false
			})

		} else if (filter === 'unitFilterAdmin') {

			const { units } = obj

			this.props.unitFilterAdmin({ units })

			this.setState({
				popularityFilterAdmin: false
			})

		} else if (filter === 'visibleFilterAdmin') {

			const { visibleproduct } = obj

			this.props.visibleFilterAdmin({ visibleproduct })

			this.setState({
				popularityFilterAdmin: false
			})

		} else if (filter === 'subcategoriesFilterAdmin') {

			const { categoryid, subcategoryid } = obj

			this.props.subcategoriesFilterAdmin({ categoryid, subcategoryid })

			this.setState({
				popularityFilterAdmin: false
			})

		}

	}

	componentDidMount() {

	}

	render() {

		const inputCheckedAll = this.useInputCheckedAll(false)

		const selectPromotionsProduct = <Select
			name="promotion"
			onChange={this.selectChangePromotions}
			option={this.optionPromotionsProduct()}
		/>

		const selectCategories = <Select
			onChange={this.selectChangeCategory}
			name="categories"
			option={this.optionSelectCategory()}
		/>

		const selectSubcategories = <Select
			onChange={this.selectChangeSubcategory}
			name="subcategories"
			option={this.optionSelectSubcategory(this.state.idSelectedCategory)}
		/>

		const selectUnitsProduct = <Select
			name="units"
			onChange={this.selectChangeUnits}
			option={this.optionUnitsProduct()}
		/>

		const selectVisibleProduct = <Select
			onChange={this.selectChangeVisible}
			name="visibleproduct"
			option={this.optionVisibleProduct()}
		/>

		return (
			<table className={classes.ProductsTable}>
				<thead>
					<tr className={classes.trHeader}>
						<th className={classes.headerTitleCheckAll}>
							<div className={classes.leftTitle}>Check All</div>
							<div className={classes.th_value}><input {...inputCheckedAll.bind} /></div>
						</th>
						<th className={classes.headerTitle}>id</th>
						<th className={`${classes.headerTitle} ${classes.min_width} ${classes.th_image}`}>image</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>name</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>price</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>quantity</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>promotion</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>popularity</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>units</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>describe</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>category</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>subcategory</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>visible</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>Edit</th>
						<th className={`${classes.headerTitle} ${classes.min_width}`}>remove</th>
					</tr>
				</thead>
				<thead className={classes.productsFilters}>
					<tr className={classes.trHeaderSelect}>
						<th className={classes.headerTitleCheckAll}>

						</th>
						<th className={classes.headerTitle}></th>
						<th className={classes.headerTitle}></th>
						<th className={classes.headerTitle}>name</th>
						<th className={classes.headerTitle}></th>
						<th className={classes.headerTitle}></th>
						<th className={classes.headerTitleSelect}>{selectPromotionsProduct}</th>
						<th className={`${classes.headerTitle, classes.headerTitleFilter}`}><span className={`mb-3 mb-lg-0 d-inline-block border-0 d-lg-flex flex-column justify-content-center align-items-center popularityFilterAdmin ${classes.popularityFilterAdmin}`} onClick={event => this.clickFiltersAdmin({ filter: 'popularityFilterAdmin', event })} >Популярні <i className="ml-3 ml-lg-0 fa fa-hand-pointer-o" aria-hidden="true"></i></span></th>
						<th className={classes.headerTitleSelect}>{selectUnitsProduct}</th>
						<th className={classes.headerTitle}></th>
						<th className={classes.headerTitle, classes.headerTitleSelect}>{selectCategories}</th>
						<th className={classes.headerTitle, classes.headerTitleSelect}>{selectSubcategories}</th>
						<th className={classes.headerTitle, classes.headerTitleSelect}>{selectVisibleProduct}</th>
						<th className={classes.headerTitle}></th>
						<th className={classes.headerTitle, classes.headerTitleFilter}>{this.props.categories[0] ? <span className={`d-inline-block d-lg-flex flex-column justify-content-center align-items-center mb-3 ${classes.resetFiltersAdmin}`} onClick={event => this.clickFiltersAdmin({ filter: 'resetFiltersAdmin', event })} >Скинути фільтри <i className="ml-3 ml-lg-0 fa fa-hand-pointer-o" aria-hidden="true"></i></span> : null}</th>
					</tr>
				</thead>
				<tbody>
					{this.props.selectedProductsAdmin[0]
						? orderBy(this.props.products, ['popularity', 'promotion', 'price', 'name'], ['desc', 'desc', 'asc', 'desc']).map((product, index) => {
							if (this.props.filterConditionAdmin(product, this.props.filterPropsAdmin)) {
								return <ProductItem key={product.id} productId={product.id} promotion={product.promotion} index={index} />
							}
						})
						: this.props.selectedProductsAdmin[0] === null
							? <tr><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th><h3 className="text-danger text-center m-1">В даній категорії немає продуктів</h3></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th><th className={classes.mob_d_none}></th></tr>
							: orderBy(this.props.products, ['popularity', 'promotion', 'price', 'name'], ['desc', 'desc', 'asc', 'desc']).map((product, index) => {
								if (this.props.filterConditionAdmin(product, this.props.filterPropsAdmin)) {
									return <ProductItem key={product.id} productId={product.id} promotion={product.promotion} index={index} />
								}
							})
					}
				</tbody>

			</table>
		)
	}
}

function mapStateToProps(state) {
	return {
		products: state.products.products,
		categories: state.products.categories,
		isSubcategories: state.products.isSubcategories,
		selectedProductsAdmin: state.products.selectedProductsAdmin,
		filterPropsAdmin: state.products.filterPropsAdmin
	}
}

function mapDispatchToProps(dispatch) {
	return {
		toggleAllProducts: status => dispatch(toggleAllProducts(status)),
		fetchIsSubcategories: idCategory => dispatch(fetchIsSubcategories(idCategory)),
		categoriesFilterAdmin: obj => dispatch(categoriesFilterAdmin(obj)),
		subcategoriesFilterAdmin: obj => dispatch(subcategoriesFilterAdmin(obj)),
		unitFilterAdmin: obj => dispatch(unitFilterAdmin(obj)),
		promotionFilterAdmin: obj => dispatch(promotionFilterAdmin(obj)),
		visibleFilterAdmin: obj => dispatch(visibleFilterAdmin(obj)),
		resetFiltersAdmin: () => dispatch(resetFiltersAdmin()),
		popularityFilterAdmin: obj => dispatch(popularityFilterAdmin(obj)),
		filterConditionAdmin: (objproduct, objprops) => dispatch(filterConditionAdmin(objproduct, objprops))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductsTable)
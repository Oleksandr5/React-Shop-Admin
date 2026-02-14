import React, { Component } from 'react'
import classes from './SubcategoriesListEdit.module.css'
import SubcategoriesTable from './SubcategoriesTable/SubcategoriesTable'
import { connect } from 'react-redux'
import Button from '../../components/UI/Button/Button'
import ModalAdd from './ModalForSubcategories/ModalAdd/ModalAdd'
import { getIsSubcategories, getIndexCategory } from '../../redux/actions/products'
import { onScroll, topFunction } from '../../redux/actions/menu'

class SubcategoriesListEdit extends Component {

	state = {
		hasAccount: false
	}

	componentDidMount() {

	}

	render() {

		const categories = this.props.categories

		let url = window.location.pathname
		let idCategory = +url.substring(url.lastIndexOf('/') + 1)

		const nameCategoty = categories[0] ? categories.filter(category => category.id === idCategory)[0].name : null

		const { hasAccount } = this.props

		const indexCategory = getIndexCategory(idCategory, categories)

		const isSubcategories = getIsSubcategories(indexCategory, categories)


		return (
			<div className={`wrapper overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.SubcategoriesListEdit}`} onScroll={this.props.onScroll} >

				<div className={'px-0'}>
					<h2 className="text-info h1Title">Категорія <span>{nameCategoty}</span></h2>
					<h3 className={'h1Title'}>Список підкатегорій:</h3>
					<ModalAdd idCategory={idCategory} />

					<div className={"successAuth"}>
						{
							hasAccount
								? <p className="text-success text-center">Вітаємо {this.props.customerName}, Ви успішно ідентифікувалися !!!</p>
								: null
						}
					</div>
					{isSubcategories ? <SubcategoriesTable idCategory={idCategory} /> : <p>No subcategories!</p>}
				</div>

				<Button
					type="button"
					style={{ display: 'none' }}
					id={'goToTop'}
					onClick={this.props.topFunction}
					className={`btn btn-danger ${classes.btnTop}`}
				>
					<i className="fa fa-arrow-up" aria-hidden="true"></i>
				</Button>

			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		hasAccount: state.inform.hasAccount,
		customerName: state.inform.customerName,
		products: state.products.products,
		categories: state.products.categories
	}
}

function mapDispatchToProps(dispatch) {
	return {
		getIsSubcategories: (indexCategory, categories) => dispatch(getIsSubcategories(indexCategory, categories)),
		getIndexCategory: (idCategory, categories) => dispatch(getIndexCategory(idCategory, categories)),
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(SubcategoriesListEdit)
import React, { Component } from 'react'
import classes from './SubcategoriesTable.module.css'
import SubcategoryItem from '../SubcategoryItem/SubcategoryItem'
import { connect } from 'react-redux'
import Select from '../../../components/UI/Select/Select'
import { toggleAllSubcategories, getIndexCategory } from '../../../redux/actions/products'

class SubcategoriesTable extends Component {

	state = {
		checked: false
	}

	useInputCheckedAll(defaultValue = '') {  // self hook chanch value in input

		return {
			bind: {
				onChange: event => { this.setState({ checked: event.target.checked }) },
				type: "checkbox",
				onClick: event => {

					let status = event.target.checked

					this.props.toggleAllSubcategories(this.props.idCategory, status)
				}
			}

		}
	}

	componentDidMount() {

	}

	render() {

		const inputCheckedAll = this.useInputCheckedAll(false)
		const indexCategory = getIndexCategory(this.props.idCategory, this.props.categories)

		return (
			<table className={classes.SubcategoriesTable}>
				<thead>
					<tr className={classes.trHeader}>
						<th className={classes.headerTitleCheckAll}>
							<div className={classes.leftTitle}>Check All</div>
							<div className={classes.th_value}><input {...inputCheckedAll.bind} /></div>
						</th>
						<th className={classes.headerTitle}>id</th>
						<th className={classes.headerTitle}>image</th>
						<th className={classes.headerTitle}>name</th>
						<th className={classes.headerTitle}>describe</th>
						<th className={classes.headerTitle}>edit</th>
						<th className={classes.headerTitle}>remove</th>
					</tr>
				</thead>
				<tbody>
					{
						this.props.categories[indexCategory].subcategories.map((subcategory, index) => {

							return <SubcategoryItem categoryId={this.props.idCategory} thisSubcategory={subcategory} subcategoryId={subcategory.id} key={subcategory.id} index={index} checked={subcategory.checked} />
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
		categories: state.products.categories
	}
}

function mapDispatchToProps(dispatch) {
	return {
		toggleAllSubcategories: (idCategory, status) => dispatch(toggleAllSubcategories(idCategory, status)),
		getIndexCategory: (idCategory, categories) => dispatch(getIndexCategory(idCategory, categories))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(SubcategoriesTable)
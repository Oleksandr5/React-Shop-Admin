import React, { Component } from 'react'
import classes from './CategoriesTable.module.css'
import CategoryItem from '../CategoryItem/CategoryItem'
import { connect } from 'react-redux'
import Select from '../../../components/UI/Select/Select'
import { toggleAllCategories } from '../../../redux/actions/products'

class CategoriesTable extends Component {

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

					this.props.toggleAllCategories(status)
				}
			}

		}
	}

	componentDidMount() {

	}

	render() {

		const inputCheckedAll = this.useInputCheckedAll(false)

		return (
			<table className={classes.CategoriesTable}>
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
						<th className={classes.headerTitle}>subcategories</th>
						<th className={classes.headerTitle}>edit</th>
						<th className={classes.headerTitle}>remove</th>
					</tr>
				</thead>
				<tbody>
					{
						this.props.categories.map((category, index) => {
							return <CategoryItem category={category} categoryId={category.id} key={category.id} index={index} />
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
		toggleAllCategories: status => dispatch(toggleAllCategories(status))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CategoriesTable)
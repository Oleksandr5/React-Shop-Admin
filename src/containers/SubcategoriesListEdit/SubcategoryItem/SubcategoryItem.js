import React, { Component } from 'react'
import classes from './SubcategoryItem.module.css'
import { connect } from 'react-redux'
import { NavLink } from 'react-router-dom'
import axios from '../../../axios/axios-quiz'
import { toggleSubcategory, removeSubcategories, existingSubcategories } from '../../../redux/actions/products'
import ModalEdit from '../ModalForSubcategories/ModalEdit/ModalEdit'

class SubcategoryItem extends Component {

	state = {
		checked: false
	}

	render() {

		const { index } = this.props

		let idCategory = this.props.categoryId
		let subcategoryId = this.props.subcategoryId
		let thisSubcategory = this.props.thisSubcategory

		const cls = [classes.SubcategoryItem]

		let indexCategory
		let indexSubcategory

		const checked = this.props.categories.filter(category => category.id === idCategory)[0].subcategories.filter(subcategory => subcategory.id === subcategoryId)[0].checked

		//        let checked = this.props.checked

		if (checked) {
			cls.push('done') // in index.css
		}

		return (
			<tr className={cls.join(' ')} id={`subcategory_table_${subcategoryId}`}>
				<th>
					<div className={classes.leftTitle}>check</div>
					<div className={classes.th_value}>
						<input
							type="checkbox"

							onChange={event => {

								let checked = event.target.checked

								this.setState({ checked })

								this.props.toggleSubcategory(idCategory, subcategoryId, checked)
							}}
							checked={checked}

						/>
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>subcategoryId</div>
					<div className={classes.th_value}>{subcategoryId}</div>
				</th>
				<th className={classes.th_image}>
					<div className={classes.leftTitle}>image</div>
					<div className={`mx-3 my-1 ${classes.subcategoryFoto}`} style={{ backgroundImage: `url(${thisSubcategory.image})`, backgroundSize: 'cover' }}></div>
				</th>
				<th>
					<div className={classes.leftTitle}>name</div>
					<div className={classes.th_value}>{thisSubcategory.name}</div>
				</th>
				<th className={classes.th_describe}>
					<div className={classes.leftTitle}>describe</div>
					<div className={`pl-3 d-flex text-left justify-content-md-center align-items-center overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`} >{thisSubcategory.describe}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>edit</div>
					<div className={classes.th_value}>
						<ModalEdit idCategory={idCategory} idSubcategory={subcategoryId} />
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>remove</div>
					<div className={classes.th_value}>
						<button className={classes.btnRemove} onClick={() => this.props.removeSubcategories(idCategory, subcategoryId)} ><i className="fa fa-times" aria-hidden="true"></i></button>
					</div>
				</th>
			</tr>

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
		toggleSubcategory: (idCategory, subcategoryId, checked) => dispatch(toggleSubcategory(idCategory, subcategoryId, checked)),
		removeSubcategories: (idCategory, subcategoryId) => dispatch(removeSubcategories(idCategory, subcategoryId)),
		existingSubcategories: idCategory => dispatch(existingSubcategories(idCategory))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(SubcategoryItem)
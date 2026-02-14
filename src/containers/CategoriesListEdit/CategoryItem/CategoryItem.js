import React, { Component } from 'react'
import classes from './CategoryItem.module.css'
import { connect } from 'react-redux'
import { NavLink } from 'react-router-dom'
import axios from '../../../axios/axios-quiz'
import { toggleCategory, removeCategories, existingSubcategories } from '../../../redux/actions/products'
import ModalEdit from '../ModalForCategories/ModalEdit/ModalEdit'

class CategoryItem extends Component {

	state = {
		checked: false
	}

	//    existingSubcategories(idCategory) {        
	//        
	//        const categories = this.props.categories
	//
	//        if(categories[0]) {
	//
	//            let isSubcategories = Object.keys(categories[idCategory]).filter(category => category === "subcategories")[0] ? true : false
	//
	//            if (isSubcategories){
	//                const subcategories = categories[idCategory].subcategories
	//
	//                return subcategories.map((subcategory, index) => {
	//                    return (
	//                        <li key={index} >
	//                            {subcategory.name}
	//                            <ModalEditSubc idCategory={idCategory} idSubcategory={subcategory.id} />
	//                        </li>
	//                    )
	//                })
	//
	//            } else {
	//                return (
	//                    <li>
	//                        Немає підкатегорій
	//                    </li>
	//                )
	//            }
	//
	//        } else {
	//            return (
	//                <li>
	//                    Немає підкатегорій
	//                </li>
	//            )
	//        }        
	//    }

	render() {

		const { index, categoryId } = this.props

		let category = this.props.category

		const cls = [classes.CategoryItem]

		let id = categoryId

		let checked = category.checked

		if (checked) {
			cls.push('done') // in index.css
		}

		const thisCategory = this.props.categories.filter(category => category.id === this.props.categoryId)[0]

		//        const nameCategory = thisCategory.name
		//        const idCategory = thisCategory.id

		const thisSubcategory = thisCategory.subcategories

		//        const nameSubcategory = thisSubcategory.name
		//        const idSubcategory = thisSubcategory.id

		return (
			<tr className={cls.join(' ')} id={`category_table_${id}`}>
				<th>
					<div className={classes.leftTitle}>check</div>
					<div className={classes.th_value}>
						<input
							type="checkbox"

							onChange={event => {

								let checked = event.target.checked

								this.setState({ checked })

								this.props.toggleCategory(id, checked)
							}}
							checked={checked}
						/>
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>id</div>
					<div className={classes.th_value}>{id}</div>
				</th>
				<th className={classes.th_image}>
					<div className={classes.leftTitle}>image</div>
					<div className={`ml-3 my-1 ${classes.categoryFoto}`} style={{ backgroundImage: `url(${category.image})`, backgroundSize: 'cover' }}></div>
				</th>
				<th>
					<div className={classes.leftTitle}>name</div>
					<div className={classes.th_value}>{category.name}</div>
				</th>
				<th className={classes.th_describe}>
					<div className={classes.leftTitle}>describe</div>
					<div className={`pl-3 d-flex text-left justify-content-md-center align-items-center overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`} >{category.describe}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>subcategory</div>
					<div className={classes.th_value}>
						<div className={`d-inline-block border pr-3 ${classes.existingSubcategories}`}>
							<NavLink to={`/subcategories/${id}`} className="text-dunger" >
								<h3 className={`mb-0 ${classes.h3}`}>Підкатегорії</h3>
							</NavLink>
						</div>
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>edit</div>
					<div className={classes.th_value}>
						<ModalEdit idCategory={id} />
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>remove</div>
					<div className={classes.th_value}>
						<button className={classes.btnRemove} onClick={() => this.props.removeCategories(id)} ><i className="fa fa-times" aria-hidden="true"></i></button>
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
		toggleCategory: (id, checked) => dispatch(toggleCategory(id, checked)),
		removeCategories: id => dispatch(removeCategories(id)),
		existingSubcategories: idCategory => dispatch(existingSubcategories(idCategory))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CategoryItem)
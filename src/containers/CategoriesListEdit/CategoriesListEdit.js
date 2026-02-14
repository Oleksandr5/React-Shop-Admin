import React, { Component } from 'react'
import classes from './CategoriesListEdit.module.css'
import CategoriesTable from './CategoriesTable/CategoriesTable'
import { connect } from 'react-redux'
import Button from '../../components/UI/Button/Button'
import ModalAdd from './ModalForCategories/ModalAdd/ModalAdd'
import { onScroll, topFunction } from '../../redux/actions/menu'

class CategoriesListEdit extends Component {

	state = {
		hasAccount: false
	}

	componentDidMount() {

	}

	render() {

		const { hasAccount } = this.props

		return (
			<div className={`wrapper overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.CategoriesListEdit}`} onScroll={this.props.onScroll} >

				<div className={'px-0'}>
					<h1 className={'h1Title'}>Список категорій</h1>
					<ModalAdd />

					<div className={"successAuth"}>
						{
							hasAccount
								? <p className="text-success text-center">Вітаємо {this.props.customerName}, Ви успішно ідентифікувалися !!!</p>
								: null
						}
					</div>

					{this.props.products.length ? <CategoriesTable /> : <p>No categories!</p>}
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
		products: state.products.products
	}
}

function mapDispatchToProps(dispatch) {
	return {
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CategoriesListEdit)
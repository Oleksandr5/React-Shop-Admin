import React, { Component } from 'react'
import classes from './ProductsListEdit.module.css'
import ProductsTable from './ProductsTable/ProductsTable'
import { connect } from 'react-redux'
import Button from '../../components/UI/Button/Button'
import ModalAdd from './ModalForProducts/ModalAdd/ModalAdd'
import ModalAddNewField from './ModalForProducts/ModalAddNewField/ModalAddNewField'
import ModalEditField from './ModalForProducts/ModalEditField/ModalEditField'
import ModalRemoveField from './ModalForProducts/ModalRemoveField/ModalRemoveField'
import { onScroll, topFunction, leftFunction, rightFunction } from '../../redux/actions/menu'

class ProductsListEdit extends Component {

	state = {
		hasAccount: false
	}

	componentDidMount() {

	}

	render() {

		const { hasAccount } = this.props

		return (
			<div className={`wrapper overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop scrollToLeft scrollToRight ${classes.ProductsListEdit}`} onScroll={this.props.onScroll} >

				<div>
					<h1 className={'h1Title'}>Список продуктів</h1>
					<div className={`d-flex flex-wrap align-items-center ${classes.ProductsModals}`}>

						<ModalAdd />
						<ModalAddNewField />
						<ModalEditField />
						<ModalRemoveField />

					</div>


					<div className={"successAuth"}>
						{
							hasAccount
								? <p className="text-success text-center">Вітаємо {this.props.customerName}, Ви успішно ідентифікувалися !!!</p>
								: null
						}
					</div>

					{this.props.products.length ? <ProductsTable /> : <p>No products!</p>}
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

				<Button
					type="button"
					id={'goToRight'}
					onClick={this.props.rightFunction}
					className={`btn btn-danger ${classes.btnRight}`}
				>
					<i className="fa fa-arrow-right" aria-hidden="true"></i>
				</Button>

				<Button
					type="button"
					id={'goToLeft'}
					onClick={this.props.leftFunction}
					className={`btn btn-danger ${classes.btnLeft}`}
				>
					<i className="fa fa-arrow-left" aria-hidden="true"></i>
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
		topFunction: () => dispatch(topFunction()),
		leftFunction: () => dispatch(leftFunction()),
		rightFunction: () => dispatch(rightFunction())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductsListEdit)
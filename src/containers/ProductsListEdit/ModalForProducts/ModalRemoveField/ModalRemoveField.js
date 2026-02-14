import React, { Component } from 'react'
import classes from './ModalRemoveField.module.css'
import Button from '../../../../components/UI/Button/Button'
import Input from '../../../../components/UI/Input/Input'
import Select from '../../../../components/UI/Select/Select'
import is from 'is_js' // для валідації емейлу в формі
import { Modal } from 'react-bootstrap'
import { connect } from 'react-redux'
import { fetchProductsData, removeFieldProduct } from '../../../../redux/actions/products'

class ModalRemoveField extends Component {

	state = {
		selectedKey: null,
		removeField: false
	}

	selectChangeKey = event => {

		let selectedKey = event.target.value

		this.setState({
			selectedKey
		})

	}

	optionSelectKey = event => {

		if (this.props.products[0]) {

			const product = this.props.products[0]

			let thisKeys = []

			for (const property in product) {

				thisKeys.push({ text: property, value: property })

			}

			let thisKey

			thisKeys.forEach((key, index) => {

				if (key.text === this.state.selectedKey) {
					thisKey = key
					thisKeys.splice(index, 1)
					thisKeys.unshift(thisKey)
				}

			})

			return thisKeys

		} else {
			return [{ text: "Немає ключів", value: "Немає ключів" }]
		}


	}

	handleClose = () => {
		this.setState({
			show: false
		})
	}

	handleShow = () => {

		this.setState({
			show: true
		})

	}

	removeDate(id) {

		const selectsForm = [...document.querySelectorAll('select.addOptionToRemoveField')].map(select => {
			return { name: select.name, value: select.value }
		});

		const selectValue = ['key']

		selectsForm.forEach(select => {
			if (select.name === 'key') {
				selectValue[0] = select.value
			}
		});

		const [key] = selectValue

		this.props.removeFieldProduct({
			key
		})

		this.handleClose()
	}

	renderModalRemoveField() {

		const selectKeys = <Select
			label="Виберіть ключ"
			onChange={this.selectChangeKey}
			name="key"
			className="addOptionToRemoveField"
			option={this.optionSelectKey()}
		/>

		return (
			<React.Fragment>
				<Button
					selfType="error"
					onClick={this.handleShow} className={`mb-2 mb-md-3 mr-3 p-2 p-md-3 ${classes.btnOpenModule}`}
				>
					Видалити ключ
				</Button>

				<Modal className={classes.ProductsModalRemoveField} show={this.state.show} onHide={this.handleClose}>
					<Modal.Header closeButton className="align-items-center">
						<Modal.Title>Видалити ключ:</Modal.Title>
					</Modal.Header>
					<Modal.Body className={classes.modalBodyProductsEdit} >

						{this.props.error ? <h3 className="d-block error text-danger text-center" >{this.props.error.message}</h3> : null}

						<div className="p-3 border rounded shadow text-center">
							<p className="text-danger"><b>Ви видаляєте ключ всім продуктам !!!</b></p>
						</div>
						<div className={classes.ProductsEdit}>
							<div>

								<form className={classes.ProductsEditForm}>

									{selectKeys}

								</form>

							</div>

						</div>

					</Modal.Body>
					<Modal.Footer className="d-flex flex-column align-items-end">

						{this.state.removeField
							?
							(
								<>
									<h5 className="text-right text-danger d-block p-3 border rounded shadow" ><b>Точно видалити цей ключ?</b></h5>
									<Button
										type="button"
										className="btn btn-danger"
										onClick={() => this.removeDate()}
									>
										Видалити
							</Button>
								</>
							)
							:
							<Button
								type="button"
								className="btn btn-warning"
								onClick={() => this.setState({ removeField: true })}
							>
								Видалити
						</Button>
						}



					</Modal.Footer>
				</Modal>
			</React.Fragment>
		)

	}

	componentDidMount() {

	}

	render() {

		return (
			<div className={classes.ModalRemoveField}>

				<div className="container px-0">
					{this.renderModalRemoveField()}
				</div>

			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		products: state.products.products,
		categories: state.products.categories,
		error: state.products.error
	}
}

function mapDispatchToProps(dispatch) {
	return {
		removeFieldProduct: obj => dispatch(removeFieldProduct(obj))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalRemoveField)
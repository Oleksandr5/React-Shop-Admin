import React, { Component } from 'react'
import classes from './CustomersListEdit.module.css'
import CustomersTable from './CustomersTable/CustomersTable'
import { connect } from 'react-redux'
import Button from '../../components/UI/Button/Button'
import ModalAdd from './ModalForCustomers/ModalAdd/ModalAdd'
import { onScroll, topFunction } from '../../redux/actions/menu'
import { updateStatusQuantityVisitors, updateStatusQuantityOfDownloads } from '../../redux/actions/inform'

class CustomersListEdit extends Component {

	state = {
		hasAccount: false
	}

	componentDidMount() {

	}

	render() {
		console.log('quantityVisitors22', this.props.quantityVisitors)
		const { hasAccount } = this.props

		const quantityVisitors = this.props.quantityVisitors
		const dateOfFirstVisitNewCustomer = this.props.dateOfFirstVisitNewCustomer
		const quantityOfDownloads = this.props.quantityOfDownloads

		return (
			<div className={`wrapper overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.CustomersListEdit}`} onScroll={this.props.onScroll} >

				<div className={'px-0'}>
					<h1 className={'h1Title'}>Список користувачів</h1>
					<ModalAdd />

					<div className="mb-3 d-flex divInfoQuantityVisitors">
						<div>
							<p className={`mb-0 text-danger`}>К-ть відвідувань сайту: &nbsp;<span className={"text-info status_quantityVisitors"}>{quantityVisitors}</span></p>

							<p className={`mb-0 text-success`}>Дата першого візиту<br className={'d-md-none'} /> нового користувача: &nbsp;<br className={'d-sm-none'} /><span className={"text-info status_date_first_visit_new_customer"}>{dateOfFirstVisitNewCustomer}</span></p>
						</div>

						<Button
							type="button"
							id={'updateStatusQuantityVisitors'}
							onClick={() => this.props.updateStatusQuantityVisitors()}
							className={`ml-3 btn btn-success btn_refresh_quantityVisitors`}
						>
							<i className="fa fa-refresh" aria-hidden="true"></i>
						</Button>

					</div>

					<div className="mb-3 d-flex align-items-center divInfoQuantityOfDownloads">

						<p className={`mb-0 text-danger`}>К-ть загрузок сайту: &nbsp;<span className={"text-info status_quantityOfDownloads"}>{quantityOfDownloads}</span></p>

						<Button
							type="button"
							id={'statusUpdateQuantityOfDownloads'}
							onClick={() => this.props.updateStatusQuantityOfDownloads()}
							className={`ml-3 btn btn-success btn_refresh_quantityOfDownloads`}
						>
							<i className="fa fa-refresh" aria-hidden="true"></i>
						</Button>

					</div>

					<div className={"successAuth"}>
						{
							hasAccount
								? <p className="text-success text-center">Вітаємо {this.props.customerName}, Ви успішно ідентифікувалися !!!</p>
								: null
						}
					</div>

					{this.props.customers.length ? <CustomersTable /> : <p>No customers!</p>}
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
		quantityVisitors: state.inform.quantityVisitors,
		dateOfFirstVisitNewCustomer: state.inform.dateOfFirstVisitNewCustomer,
		quantityOfDownloads: state.inform.quantityOfDownloads,
		customers: state.inform.customers
	}
}

function mapDispatchToProps(dispatch) {
	return {
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction()),
		updateStatusQuantityVisitors: () => dispatch(updateStatusQuantityVisitors()),
		updateStatusQuantityOfDownloads: () => dispatch(updateStatusQuantityOfDownloads())
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomersListEdit)
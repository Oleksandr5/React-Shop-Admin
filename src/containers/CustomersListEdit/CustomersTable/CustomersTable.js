import React, { Component } from 'react'
import classes from './CustomersTable.module.css'
import CustomerItem from '../CustomerItem/CustomerItem'
import { connect } from 'react-redux'
import { toggleAllCustomers } from '../../../redux/actions/inform'

class CustomersTable extends Component {

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

					this.props.toggleAllCustomers(status)
				}
			}

		}
	}

	componentDidMount() {

	}

	render() {

		const inputCheckedAll = this.useInputCheckedAll(false)

		return (
			<table className={classes.CustomersTable}>
				<thead>
					<tr className={classes.trHeader}>
						<th className={classes.headerTitleCheckAll}>
							<div className={classes.leftTitle}>Check All</div>
							<div className={classes.th_value}><input {...inputCheckedAll.bind} /></div>
						</th>
						<th className={classes.headerTitle}>id</th>
						<th className={classes.headerTitle}>name</th>
						<th className={classes.headerTitle}>tel</th>
						<th className={classes.headerTitle}>email</th>
						<th className={classes.headerTitle}>auth</th>
						<th className={classes.headerTitle}>reg_date</th>
						<th className={classes.headerTitle}>Edit</th>
						<th className={classes.headerTitle}>remove</th>
					</tr>
				</thead>

				<tbody>
					{this.props.customers.map((customer, index) => {
						return <CustomerItem customerId={customer.id} key={customer.id * Math.random()} index={index} />
					})}
				</tbody>

			</table>
		)
	}
}

function mapStateToProps(state) {
	return {
		customers: state.inform.customers
	}
}

function mapDispatchToProps(dispatch) {
	return {
		toggleAllCustomers: status => dispatch(toggleAllCustomers(status))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomersTable)
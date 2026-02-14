import React, { Component } from 'react'
import classes from './CustomerItem.module.css'
import { connect } from 'react-redux'
import { toggleCustomer, removeCustomers } from '../../../redux/actions/inform'
import ModalEdit from '../ModalForCustomers/ModalEdit/ModalEdit'

class CustomerItem extends Component {

	render() {

		const { index } = this.props

		const customer = this.props.customers[index]

		const cls = [classes.CustomerItem]

		let id = customer.id
		let email = customer.email

		let checked = customer.checked

		if (checked) {
			cls.push('done') // in index.css
		}

		return (
			<tr className={cls.join(' ')} id={`customer_table_${id}`}>
				<th>
					<div className={classes.leftTitle}>check</div>
					<div className={classes.th_value}>
						&nbsp;&nbsp;&nbsp;<input
							type="checkbox"

							onChange={event => {

								let checked = event.target.checked

								this.props.toggleCustomer(id, checked)
							}}
							checked={checked}

						/>
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>id</div>
					<div className={classes.th_value}>&nbsp;&nbsp;&nbsp;{id}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>name</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>&nbsp;&nbsp;&nbsp;{customer.name}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>tel</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>&nbsp;&nbsp;&nbsp;{customer.tel}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>email</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>&nbsp;&nbsp;&nbsp;<p>{customer.email}</p></div>
				</th>
				<th>
					<div className={classes.leftTitle}>auth</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>&nbsp;&nbsp;&nbsp;{customer.auth ? 'зареєстрований' : 'незареєстрований'}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>reg_date</div>
					<div className={`overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${classes.th_value}`}>&nbsp;&nbsp;&nbsp;{customer.date}</div>
				</th>
				<th>
					<div className={classes.leftTitle}>edit</div>
					<div className={classes.th_value}>
						&nbsp;&nbsp;&nbsp;<ModalEdit idCustomer={id} />
					</div>
				</th>
				<th>
					<div className={classes.leftTitle}>remove</div>
					<div className={classes.th_value}>
						&nbsp;&nbsp;&nbsp;<button className={classes.btnRemove} onClick={() => this.props.removeCustomers(id, email)}><i className="fa fa-times" aria-hidden="true"></i></button>
					</div>
				</th>
			</tr>

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
		toggleCustomer: (id, checked) => dispatch(toggleCustomer(id, checked)),
		removeCustomers: (id, email) => dispatch(removeCustomers(id, email))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomerItem)
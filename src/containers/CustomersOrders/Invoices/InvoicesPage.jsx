import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { fetchInvoices, fetchInvoicesSummary } from '../../../redux/actions/invoices'

const InvoicesPage = ({
	hasAccount,
	customerName,
	customerId,
	invoices,
	invoicesSummary,
	fetchInvoices,
	fetchInvoicesSummary,
	customers,
	stock
}) => {

	const [selectedUser, setSelectedUser] = useState(customerId || '')
	const authAdmin = window.localStorage.getItem("authAdmin")
	const nameThisCustomers = window.localStorage.getItem("nameThisCustomers")

	const isAdmin = hasAccount && authAdmin === "true";
	const localStorage1 = window.localStorage.getItem("email");

	const ulStyle = {
		listStyle: 'none',
		padding: 0,
		margin: 0,
		height: '100%',
		display: 'flex',
		flexDirection: 'column'
	}

	const liStyle = {

		flex: 1,                        // однакова висота
		display: 'flex',
		alignItems: 'center',           // вертикальне вирівнювання
		paddingLeft: '6px'
	}



	// Завантажуємо замовлення та підсумки
	useEffect(() => {
		if (hasAccount && selectedUser) {
			fetchInvoices(selectedUser)
			fetchInvoicesSummary(selectedUser)
		}
	}, [selectedUser, hasAccount, fetchInvoices, fetchInvoicesSummary])

	// console.log для перевірки
	useEffect(() => {
		console.log("Invoices:", invoices)
		console.log("Invoices Summary:", invoicesSummary)
		console.log("isAdmin:", isAdmin)
		console.log("localStorage:", localStorage1)
	}, [invoices, invoicesSummary])

	return (
		<div
			style={{
				maxHeight: '80vh',   // обмежує висоту блоку
				maxWidth: '100%',    // обмежує ширину блоку
				overflowY: 'auto',   // вертикальна прокрутка
				overflowX: 'auto',   // горизонтальна прокрутка
				padding: '10px',
				border: '1px solid #ccc'
			}}
		>
			<h2>Invoices: {customerName}</h2>

			{isAdmin && (
				<div style={{ marginBottom: '20px' }}>
					<label>Select customer: </label>
					<select
						value={selectedUser}
						onChange={e => setSelectedUser(e.target.value)}
					>
						<option value="">--Choose customer--</option>
						{customers
							.filter(c =>

								(c.id === 7 || c.id > 100) &&
								c.name !== "Шановний клієнт"
							)
							.map(c => (
								<option key={c.id} value={c.id}>
									{c.name} ({c.email})
								</option>
							))
						}

					</select>
				</div>
			)}

			{invoices.length === 0 && <p>No invoices yet.</p>}

			<table border="1" cellPadding="5" style={{ marginBottom: '20px', minWidth: '80%' }}>
				<thead>
					<tr>
						<th>Order ID</th>
						<th>Items</th>
						<th>Total</th>
						<th>Date</th>
					</tr>
				</thead>
				<tbody>
					{invoices.map((invoice, index) => (
						<tr key={index}>
							<td>{invoice.idOrderHistory}</td>
							<td>
								<ul
									style={ulStyle}
								>
									{invoice.items &&
										Object.entries(invoice.items).map(([id, item], index, arr) => (
											<li
												key={id}
												style={{
													...liStyle,
													borderBottom: index !== arr.length - 1 ? "1px solid #ccc" : "none"
												}}
											>
												{item.name}
											</li>
										))}
								</ul>

							</td>
							<td>
								<ul style={ulStyle}>
									{invoice.items &&
										Object.entries(invoice.items).map(([id, item], index, arr) => (
											<li
												key={id}
												style={{
													...liStyle,
													borderBottom: index !== arr.length - 1 ? "1px solid #ccc" : "none"
												}}
											>
												{item.quantity}{item.units}
											</li >
										))}
								</ul>
							</td>
							<td>{invoice.date}</td>
						</tr>
					))}
				</tbody>
			</table>

			<h3>Summary</h3>
			{invoicesSummary.length === 0 && <p>No summary yet.</p>}
			<table border="1" cellPadding="5" style={{ marginBottom: '20px', minWidth: '60%' }}>
				<thead>
					<tr>
						<th>Product</th>
						<th>Total Quantity</th>
					</tr>
				</thead>
				<tbody>
					{invoicesSummary.map((item, index) => (
						<tr key={index}>
							<td>{item.name}</td>
							<td>{item.totalQuantity}{item.units}</td>
						</tr>
					))}
				</tbody>
			</table>


			{isAdmin && stock && (
				<>
					<h3>Stock</h3>
					<table border="1" cellPadding="5" style={{ minWidth: '60%' }}>
						<thead>
							<tr>
								<th>Product</th>
								<th>Quantity in stock</th>
								<th>Units</th>
							</tr>
						</thead>
						<tbody>
							{stock
								.filter(s => s.visibleproduct) // лиш ті, де visibleproduct === true
								.map((s, index) => (
									<tr key={index}>
										<td>{s.name}</td>
										<td>{s.quantity}</td>
										<td>{s.units}</td>
									</tr>
								))
							}
						</tbody>
					</table>
				</>
			)}
		</div>
	)

}

const mapStateToProps = state => ({
	hasAccount: state.inform.hasAccount,
	customerName: state.inform.customerName,
	customerId: state.inform.customerId,
	customers: state.inform.customers,
	invoices: state.invoices.invoices,
	invoicesSummary: state.invoices.summary,
	stock: state.products.products // залишки товарів
})

export default connect(mapStateToProps, { fetchInvoices, fetchInvoicesSummary })(InvoicesPage)

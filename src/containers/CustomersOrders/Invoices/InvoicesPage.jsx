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
	const idThisCustomers = window.localStorage.getItem("idThisCustomers");
	const nameThisCustomers = window.localStorage.getItem("nameThisCustomers")
	const isAdmin = (hasAccount && authAdmin === "true") || idThisCustomers === "139";
	const localStorage1 = window.localStorage.getItem("email");

	useEffect(() => {
		if (hasAccount && selectedUser) {
			fetchInvoices(selectedUser)
			fetchInvoicesSummary(selectedUser)
		}
	}, [selectedUser, hasAccount, fetchInvoices, fetchInvoicesSummary])

	useEffect(() => {
		console.log("Invoices:", invoices)
		console.log("Invoices Summary:", invoicesSummary)
		console.log("isAdmin:", isAdmin)
		console.log("localStorage:", localStorage1)
		console.log("idThisCustomers", idThisCustomers);
	}, [invoices, invoicesSummary])

	// --- Загальні стилі таблиць ---
	const tableStyle = {
		width: "100%",
		borderCollapse: "collapse",
		marginBottom: "20px"
	}

	const thStyle = {
		textAlign: "left",
		backgroundColor: "#f5f5f5",
		padding: "8px",
		border: "1px solid #ccc"
	}

	const tdStyle = {
		padding: "8px",
		border: "1px solid #ccc"
	}

	const tdRight = {
		...tdStyle,
		textAlign: "right",
		whiteSpace: "nowrap"
	}

	return (
		<div
			style={{
				maxHeight: '80vh',
				maxWidth: '100%',
				overflowY: 'auto',
				overflowX: 'auto',
				padding: '10px',
				border: '1px solid #ccc'
			}}
		>
			<h2>Накладні: {customerName}</h2>

			{isAdmin && (
				<div style={{ marginBottom: '20px' }}>
					<label>Вибери отримувача: </label>
					<select
						value={selectedUser}
						onChange={e => setSelectedUser(e.target.value)}
					>
						<option value="">--Choose customer--</option>
						{customers
							.filter(c =>
								(c.id === 7 || c.id > 127) &&
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

			{invoices.length === 0 && <p>Накладних ще немає.</p>}

			{/* Таблиця накладних */}
			<table style={tableStyle}>
				<thead>
					<tr>
						<th style={thStyle}>ID Замовлення</th>
						<th style={thStyle}>Товари</th>
						<th style={{ ...thStyle, textAlign: "right", width: "90px" }}>Кількість</th>
						<th style={thStyle}>Дата</th>
					</tr>
				</thead>
				<tbody>
					{invoices.map((invoice, index) => {
						const itemsArray = invoice.items ? Object.entries(invoice.items) : [];

						return itemsArray.map(([id, item], itemIndex) => {
							const isLastRow = itemIndex === itemsArray.length - 1;

							return (
								<tr
									key={`${index}-${id}`}
									style={isLastRow ? { borderBottom: "3px solid black" } : {}}
								>
									{itemIndex === 0 && (
										<td rowSpan={itemsArray.length} style={tdStyle}>
											{invoice.idOrderHistory}
										</td>
									)}
									<td style={tdStyle}>{item.name}</td>
									<td style={tdRight}>{item.quantity} {item.units}</td>
									{itemIndex === 0 && (
										<td rowSpan={itemsArray.length} style={tdStyle}>
											{invoice.date}
										</td>
									)}
								</tr>
							);
						});
					})}
				</tbody>
			</table>

			{/* Таблиця підсумків */}
			<h3>Загальна кількість товарів взятих на складі</h3>
			{invoicesSummary.length === 0 && <p>Підсумків ще немає.</p>}
			<table style={{ ...tableStyle, minWidth: '60%' }}>
				<thead>
					<tr>
						<th style={thStyle}>Товари</th>
						<th style={thStyle}>Загальна кількість</th>
					</tr>
				</thead>
				<tbody>
					{invoicesSummary.map((item, index) => (
						<tr key={index}>
							<td style={tdStyle}>{item.name}</td>
							<td style={tdRight}>{item.totalQuantity} {item.units}</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* Таблиця залишків на складі */}
			{isAdmin && stock && (
				<>
					<h3>Залишки на складі:</h3>
					<table style={{ ...tableStyle, minWidth: '60%' }}>
						<thead>
							<tr>
								<th style={thStyle}>Товари</th>
								<th style={thStyle}>Кількість на складі</th>
							</tr>
						</thead>
						<tbody>
							{stock
								.filter(s => s.visibleproduct)
								.map((s, index) => (
									<tr key={index}>
										<td style={tdStyle}>{s.name}</td>
										<td style={tdRight}>{s.quantity} {s.units}</td>
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
	stock: state.products.products
})

export default connect(mapStateToProps, { fetchInvoices, fetchInvoicesSummary })(InvoicesPage)

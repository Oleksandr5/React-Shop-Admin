import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { fetchInvoices, fetchInvoicesSummary } from '../../../redux/actions/invoices'
import classes from './InvoicesPage.module.css'

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

	const [selectedUser, setSelectedUser] = useState(customerId || '');

	const authAdmin = window.localStorage.getItem("authAdmin");
	const idThisCustomers = window.localStorage.getItem("idThisCustomers");

	const isAdmin =
		(hasAccount && authAdmin === "true") ||
		["139", "155", "156"].includes(idThisCustomers);

	useEffect(() => {
		if (hasAccount && selectedUser) {
			fetchInvoices(selectedUser);
			fetchInvoicesSummary(selectedUser);
		}
	}, [selectedUser, hasAccount, fetchInvoices, fetchInvoicesSummary]);

	return (
		<div className={classes.wrapper}>

			{/* HEADER */}
			<div className={classes.pageHeader}>
				<h2 className={classes.pageTitle}>
					🧾 Накладні: {customerName}
				</h2>

				{isAdmin && (
					<div className={classes.selectWrapper}>
						<label className={classes.label}>
							👤 Виберіть отримувача:
						</label>
						<select
							className={classes.select}
							value={selectedUser}
							onChange={e => setSelectedUser(e.target.value)}
						>
							<option value="">--Choose customer--</option>
							{customers
								.filter(c => (c.id === 7 || c.id > 127) && c.name !== "Шановний клієнт")
								.map(c => (
									<option key={c.id} value={c.id}>
										{c.name} ({c.email})
									</option>
								))}
						</select>
					</div>
				)}
			</div>

			{invoices.length === 0 && <p>Накладних ще немає.</p>}

			<h3 className={classes.sectionTitle}>
				📑 Замовлення:
			</h3>

			{/* ================= TABLE: НАКЛАДНІ ================= */}
			<table className={classes.table}>
				<thead>
					<tr>
						<th style={{ width: "12%" }}>ID</th>
						<th style={{ width: "48%" }}>Товари</th>
						<th style={{ width: "20%" }} className={classes.alignRight}>Кі-сть</th>
						<th style={{ width: "20%" }}>Дата</th>
					</tr>
				</thead>

				<tbody>
					{invoices.map((invoice, index) => {
						const itemsArray = invoice.items
							? Object.entries(invoice.items)
							: [];

						return itemsArray.map(([id, item], itemIndex) => {

							const isLastRowInInvoice =
								itemIndex === itemsArray.length - 1;

							const isNotLastInvoice =
								index !== invoices.length - 1;

							const shouldHaveBorder =
								isLastRowInInvoice && isNotLastInvoice;

							return (
								<tr
									key={`${index}-${id}`}
									className={shouldHaveBorder ? classes.invoiceDivider : ""}
								>
									{itemIndex === 0 && (
										<td rowSpan={itemsArray.length}>
											{invoice.idOrderHistory}
										</td>
									)}

									<td>{item.name}</td>

									<td className={classes.alignRight}>
										{item.quantity} {item.units}
									</td>

									{itemIndex === 0 && (
										<td rowSpan={itemsArray.length}>
											{invoice.date}
										</td>
									)}
								</tr>
							);
						});
					})}
				</tbody>
			</table>

			{/* ================= TABLE: ПІДСУМКИ ================= */}
			<h3 className={classes.sectionTitle}>
				📊 Загальна кількість товарів взятих на складі:
			</h3>

			{invoicesSummary.length === 0 && <p>Підсумків ще немає.</p>}

			<table className={classes.table}>
				<thead>
					<tr>
						<th style={{ width: "75%" }}>Товари</th>
						<th style={{ width: "25%" }} className={classes.alignRight}>Кі-сть</th>
					</tr>
				</thead>

				<tbody>
					{invoicesSummary.map((item, index) => (
						<tr key={index}>
							<td>{item.name}</td>
							<td className={classes.alignRight}>
								{item.totalQuantity} {item.units}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* ================= TABLE: ЗАЛИШКИ ================= */}
			{isAdmin && stock && (
				<>
					<h3 className={classes.sectionTitle}>
						📦 Залишки на складі:
					</h3>

					<table className={classes.table}>
						<thead>
							<tr>
								<th style={{ width: "75%" }}>Товари</th>
								<th style={{ width: "25%" }} className={classes.alignRight}>Кі-сть</th>
							</tr>
						</thead>

						<tbody>
							{stock
								.filter(s => s.visibleproduct)
								.map((s, index) => (
									<tr key={index}>
										<td>{s.name}</td>
										<td className={classes.alignRight}>
											{s.quantity} {s.units}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</>
			)}
		</div>
	);
};

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

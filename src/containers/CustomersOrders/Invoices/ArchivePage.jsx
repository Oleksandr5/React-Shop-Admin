import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import firebase from 'firebase/app';
import 'firebase/database';
import classes from './InvoicesPage.module.css';

const ArchivePage = ({ customers, products }) => {
	const [months, setMonths] = useState([]);
	const [selectedMonth, setSelectedMonth] = useState('');
	const [selectedUser, setSelectedUser] = useState('');
	const [fullArchive, setFullArchive] = useState(null);

	useEffect(() => {
		const ref = firebase.database().ref('archive');
		const handleValue = (snapshot) => {
			const data = snapshot.val();
			if (data) setMonths(Object.keys(data).sort().reverse());
		};
		ref.on('value', handleValue);
		return () => ref.off('value', handleValue);
	}, []);

	const handleMonthChange = async (month) => {
		setSelectedMonth(month);
		setSelectedUser('');
		if (!month) { setFullArchive(null); return; }
		const snapshot = await firebase.database().ref(`archive/${month}`).once('value');
		setFullArchive(snapshot.val());
	};

	const showHistoryAlert = (productId, productName) => {
		const logs = userData.historyLog[productId] ? Object.values(userData.historyLog[productId]) : [];
		if (logs.length === 0) {
			alert(`Історія для "${productName}" порожня.`);
			return;
		}
		const historyText = logs
			.sort((a, b) => b.createdAt - a.createdAt)
			.map(log => {
				const date = new Date(log.createdAt).toLocaleString();
				return `${date} — ${log.value} од. ${log.agreement ? `(Угода: ${log.agreement})` : ''}`;
			})
			.join('\n');
		alert(`📜 Історія списань для: ${productName}\n\n${historyText}`);
	};

	// --- ПІДГОТОВКА ДАНИХ ---
	const userId = selectedUser ? String(selectedUser) : null;

	const userData = (fullArchive && userId) ? {
		groupedInvoices: (() => {
			const rawInvoices = fullArchive.invoicesHistory?.[userId];
			if (!rawInvoices) return [];
			return Object.values(rawInvoices).map((inv, index) => ({
				id: inv.idOrderHistory || index + 1,
				date: inv.date || (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '-'),
				items: inv.items ? Object.values(inv.items) : (inv.name ? [inv] : [])
			}));
		})(),
		summary: fullArchive.invoicesSummaryHistory?.[userId] ? Object.values(fullArchive.invoicesSummaryHistory[userId]) : [],
		used: fullArchive.usedMaterialsHistory?.[userId] || {},
		historyLog: fullArchive.usedMaterialsHistoryHistory?.[userId] || {},
		stock: fullArchive.stockAtThatTime || products || {}
	} : null;

	return (
		<div className={classes.InvoicesPage} style={{ padding: '20px', height: '100vh', overflowY: 'auto' }}>
			<div className="container">
				<h2 className="mb-4">📦 Архів замовлень</h2>

				<div className="d-flex mb-4" style={{ gap: '10px' }}>
					<select value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)} className="form-control" style={{ width: '200px' }}>
						<option value="">-- Оберіть місяць --</option>
						{months.map(m => <option key={m} value={m}>{m}</option>)}
					</select>

					<select
						value={selectedUser}
						onChange={(e) => setSelectedUser(e.target.value)}
						className="form-control"
						style={{ width: '250px' }}
						disabled={!selectedMonth}
					>
						<option value="">-- Оберіть клієнта --</option>
						{customers && Object.values(customers)
							.filter(c => (c.id === 7 || c.id > 127) && c.name !== "Шановний клієнт")
							.map(c => (
								<option key={c.id} value={c.id}>{c.name} ({c.email})</option>
							))
						}
					</select>
				</div>

				{userData ? (
					<div className={classes.TablesWrapper}>

						<h4 className="mt-4">📑 Деталізація замовлень:</h4>
						<table className="table table-bordered bg-white">
							<thead className="thead-light">
								<tr>
									<th style={{ width: '60px' }}>ID</th>
									<th>Назва товару</th>
									<th className={classes.alignRight}>Кількість</th>
									<th className={classes.alignRight} style={{ width: '150px' }}>Дата</th>
								</tr>
							</thead>
							<tbody>
								{userData.groupedInvoices.length > 0 ? userData.groupedInvoices.map((group, gIdx) => (
									<React.Fragment key={gIdx}>
										{group.items.map((item, iIdx) => (
											<tr key={`${gIdx}-${iIdx}`} style={iIdx === group.items.length - 1 ? { borderBottom: '3px solid #444' } : {}}>
												{/* ID ЗАМОВЛЕННЯ - Тільки для першого рядка групи */}
												{iIdx === 0 && (
													<td rowSpan={group.items.length} style={{ verticalAlign: 'middle', textAlign: 'center', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
														{group.id}
													</td>
												)}

												<td>{item.name}</td>
												<td className={classes.alignRight}>{item.quantity} {item.units}</td>

												{/* ДАТА - Тільки для першого рядка групи, розтягнута на всі рядки */}
												{iIdx === 0 && (
													<td rowSpan={group.items.length} className={classes.alignRight} style={{ verticalAlign: 'middle', backgroundColor: '#f9f9f9' }}>
														{group.date}
													</td>
												)}
											</tr>
										))}
									</React.Fragment>
								)) : <tr><td colSpan="4" className="text-center">Дані відсутні</td></tr>}
							</tbody>
						</table>

						<h4 className="mt-5">🛠 Використані матеріали:</h4>
						<table className="table table-bordered bg-white">
							<thead className="thead-light">
								<tr>
									<th>Назва товару</th>
									<th className={classes.alignRight}>Всього взято</th>
									<th className="text-center">Списано</th>
									<th className="text-center">Історія</th>
								</tr>
							</thead>
							<tbody>
								{userData.summary.length > 0 ? userData.summary.map((item, idx) => (
									<tr key={idx}>
										<td>{item.name}</td>
										<td className={classes.alignRight}>{item.totalQuantity} {item.units}</td>
										<td className="text-center">
											<span className={classes.totalBadge}>
												{userData.used[item.productId] || 0} {item.units}
											</span>
										</td>
										<td className="text-center">
											<button className="btn btn-sm btn-light" onClick={() => showHistoryAlert(item.productId, item.name)}>
												📜
											</button>
										</td>
									</tr>
								)) : <tr><td colSpan="4" className="text-center">Дані відсутні</td></tr>}
							</tbody>
						</table>

						<h4 className="mt-5">📦 Стан складу (на момент архіву):</h4>
						<table className="table table-bordered bg-white">
							<thead className="thead-light">
								<tr>
									<th>Товар</th>
									<th className={classes.alignRight}>Доступно</th>
								</tr>
							</thead>
							<tbody>
								{Object.values(userData.stock)
									.filter(s => s.visibleproduct)
									.map((s, index) => (
										<tr key={index}>
											<td>{s.name}</td>
											<td className={classes.alignRight}>{s.quantity} {s.units}</td>
										</tr>
									))
								}
							</tbody>
						</table>
					</div>
				) : (
					<div className="text-center mt-5" style={{ color: '#999', padding: '100px' }}>
						{selectedMonth ? "Оберіть клієнта" : "Будь ласка, оберіть місяць"}
					</div>
				)}
			</div>
		</div>
	);
};

const mapStateToProps = state => ({
	customers: state.inform.customers,
	products: state.products.products
});

export default connect(mapStateToProps)(ArchivePage);
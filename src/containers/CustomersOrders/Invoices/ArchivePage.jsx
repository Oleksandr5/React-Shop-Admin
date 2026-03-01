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
		// 1. Отримуємо логи та сортуємо їх від НАЙСТАРІШИХ до НОВИХ для математики
		const logs = userData.historyLog[productId]
			? Object.values(userData.historyLog[productId]).sort((a, b) => a.createdAt - b.createdAt)
			: [];

		const productInfo = userData.summary.find(s => s.productId === productId);
		const units = productInfo?.units || 'шт.';

		if (logs.length === 0) {
			alert(`Історія для "${productName}" порожня.`);
			return;
		}

		let runningTotal = 0;

		// 2. Формуємо масив рядків з індивідуальним "Сумарно" для кожного запису
		const historyLines = logs.map(log => {
			runningTotal += Number(log.value || 0); // Додаємо до накопичувального підсумку
			const date = new Date(log.createdAt).toLocaleString();

			return `${date} — Списано: ${log.value} ${units} (Сумарно: ${runningTotal}) ${log.agreement ? `[Угода: ${log.agreement}]` : ''}`;
		});

		// 3. Перевертаємо, щоб нові були зверху
		const historyText = historyLines.reverse().join('\n');

		// 4. ПЕРЕВІРКА НА ДОВЖИНУ: якщо тексту забагато для alert, виводимо в консоль або нове вікно
		const fullMessage = `📜 Історія списань для: ${productName} (Всього: ${runningTotal} ${units})\n\n${historyText}`;

		if (fullMessage.length > 1000) {
			// Якщо історія гігантська — відкриваємо її в окремому вікні, щоб не обрізало
			const newWindow = window.open("", "_blank", "width=600,height=400");
			newWindow.document.write(`<pre style="font-family: monospace; padding: 20px;">${fullMessage}</pre>`);
			newWindow.document.title = "Історія списань";
		} else {
			alert(fullMessage);
		}
	};

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
		<div className={classes.archiveWrapper}>
			<div className={classes.pageHeader} style={{ background: 'linear-gradient(135deg, #6c757d, #495057)' }}>
				<h2 className={classes.pageTitle}>📦 Архів замовлень</h2>

				<div className={classes.selectWrapper}>
					<label className={classes.label}>📅 Місяць:</label>
					<select
						value={selectedMonth}
						onChange={(e) => handleMonthChange(e.target.value)}
						className={classes.select}
					>
						<option value="">-- Оберіть місяць --</option>
						{months.map(m => <option key={m} value={m}>{m}</option>)}
					</select>

					<label className={classes.label}>👤 Клієнт:</label>
					<select
						value={selectedUser}
						onChange={(e) => setSelectedUser(e.target.value)}
						className={classes.select}
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
			</div>

			{userData ? (
				<>
					<h3 className={classes.sectionTitle}>📑 Деталізація замовлень:</h3>
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
							{userData.groupedInvoices.length > 0 ? userData.groupedInvoices.map((group, gIdx) => (
								<React.Fragment key={gIdx}>
									{group.items.map((item, iIdx) => (
										<tr key={`${gIdx}-${iIdx}`} className={iIdx === group.items.length - 1 ? classes.invoiceDivider : ""}>
											{iIdx === 0 && (
												<td rowSpan={group.items.length} style={{ verticalAlign: 'middle', fontWeight: 'bold' }}>
													{group.id}
												</td>
											)}
											<td>{item.name}</td>
											<td className={classes.alignRight}>{item.quantity} {item.units}</td>
											{iIdx === 0 && (
												<td rowSpan={group.items.length} style={{ verticalAlign: 'middle' }}>
													{group.date}
												</td>
											)}
										</tr>
									))}
								</React.Fragment>
							)) : <tr><td colSpan="4" style={{ textAlign: 'center' }}>Дані відсутні</td></tr>}
						</tbody>
					</table>

					<h3 className={classes.sectionTitle}>🛠 Використані матеріали:</h3>
					<table className={classes.table}>
						<thead>
							<tr>
								<th style={{ width: "40%" }}>Назва товару</th>
								<th className={classes.alignRight}>Взято</th>
								<th style={{ textAlign: 'center' }}>Списано</th>
								<th style={{ textAlign: 'center' }}>Історія</th>
							</tr>
						</thead>
						<tbody>
							{userData.summary.length > 0 ? userData.summary.map((item, idx) => (
								<tr key={idx}>
									<td>{item.name}</td>
									<td className={classes.alignRight}>{item.totalQuantity} {item.units}</td>
									<td style={{ textAlign: 'center' }}>
										<span className={classes.totalBadge}>
											{userData.used[item.productId] || 0} {item.units}
										</span>
									</td>
									<td style={{ textAlign: 'center' }}>
										<button className={classes.btnHistory} onClick={() => showHistoryAlert(item.productId, item.name)}>
											📜
										</button>
									</td>
								</tr>
							)) : <tr><td colSpan="4" style={{ textAlign: 'center' }}>Дані відсутні</td></tr>}
						</tbody>
					</table>

					<h3 className={classes.sectionTitle}>📦 Стан складу (на момент архіву):</h3>
					<table className={classes.table}>
						<thead>
							<tr>
								<th style={{ width: "75%" }}>Товар</th>
								<th style={{ width: "25%" }} className={classes.alignRight}>Доступно</th>
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
				</>
			) : (
				<div style={{ textAlign: 'center', marginTop: '50px', color: '#999', padding: '40px' }}>
					{selectedMonth ? "Оберіть клієнта" : "Будь ласка, оберіть місяць"}
				</div>
			)}
		</div>
	);
};

const mapStateToProps = state => ({
	customers: state.inform.customers,
	products: state.products.products
});

export default connect(mapStateToProps)(ArchivePage);
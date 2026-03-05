import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import firebase from 'firebase/app';
import 'firebase/database';
import classes from './InvoicesPage.module.css';

const ArchivePage = ({ customers, products }) => {
	const [months, setMonths] = useState([]);
	const [selectedMonth, setSelectedMonth] = useState('');
	const [availableSnapshots, setAvailableSnapshots] = useState([]); // Списк записів за місяць
	const [selectedSnapshot, setSelectedSnapshot] = useState('');   // Обраний час
	const [selectedUser, setSelectedUser] = useState('');
	const [fullArchive, setFullArchive] = useState(null);
	const [searchAgreement, setSearchAgreement] = useState('');

	// Завантаження списку місяців при старті
	useEffect(() => {
		const ref = firebase.database().ref('archive');
		const handleValue = (snapshot) => {
			const data = snapshot.val();
			if (data) setMonths(Object.keys(data).sort().reverse());
		};
		ref.on('value', handleValue);
		return () => ref.off('value', handleValue);
	}, []);

	// Діагностика даних у консолі
	useEffect(() => {
		if (selectedSnapshot && fullArchive) {
			console.group("🔍 Діагностика Архіву");
			console.log("Обраний Snapshot:", selectedSnapshot);
			console.log("Обраний ID Клієнта (userId):", selectedUser);

			if (fullArchive.invoicesHistory) {
				console.log("Всі ID клієнтів в історії замовлень:", Object.keys(fullArchive.invoicesHistory));
				console.log("Дані саме для клієнта " + selectedUser + ":", fullArchive.invoicesHistory[selectedUser]);
			} else {
				console.error("❌ Поле invoicesHistory відсутнє в цьому архіві!");
			}

			if (fullArchive.invoicesSummaryHistory) {
				console.log("Дані Summary для " + selectedUser + ":", fullArchive.invoicesSummaryHistory[selectedUser]);
			}

			console.groupEnd();
		}
	}, [selectedSnapshot, fullArchive, selectedUser]);

	// Коли змінили місяць — отримуємо список доступних зрізів часу
	const handleMonthChange = (month) => {
		setSelectedMonth(month);
		setSelectedSnapshot('');
		setSelectedUser('');
		setFullArchive(null);
		setAvailableSnapshots([]);

		if (month) {
			firebase.database().ref(`archive/${month}`).once('value', (snapshot) => {
				const data = snapshot.val();
				if (data) {
					// Сортуємо записи: новіші зверху
					setAvailableSnapshots(Object.keys(data).sort().reverse());
				}
			});
		}
	};

	// Коли змінили конкретний запис (час) — завантажуємо дані цього зрізу
	const handleSnapshotChange = async (snapshotKey) => {
		setSelectedSnapshot(snapshotKey);
		setSelectedUser('');
		if (!snapshotKey) {
			setFullArchive(null);
			return;
		}
		const snapshot = await firebase.database().ref(`archive/${selectedMonth}/${snapshotKey}`).once('value');
		setFullArchive(snapshot.val());
	};

	const handleSearchByAgreement = () => {
		const term = searchAgreement.trim();
		if (!term || !userData.historyLog) return;

		// В вашому JSON historyLog — це об'єкт з ключами-id від Firebase
		const logsArray = Object.values(userData.historyLog);
		const matches = logsArray.filter(log => String(log.agreement || '') === term);

		if (matches.length > 0) {
			const total = matches.reduce((sum, log) => sum + Number(log.value || 0), 0);
			alert(`📋 По угоді №${term} всього списано: ${total} од. за цим записом.`);
		} else {
			alert("Нічого не знайдено");
		}
	};

	const showHistoryAlert = (productId, productName) => {
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
		const historyLines = logs.map(log => {
			runningTotal += Number(log.value || 0);
			const date = new Date(log.createdAt).toLocaleString();
			return `${date} — Списано: ${log.value} ${units} (Сумарно: ${runningTotal}) ${log.agreement ? `[Угода: ${log.agreement}]` : ''}`;
		});

		const historyText = historyLines.reverse().join('\n');
		const fullMessage = `📜 Історія списань для: ${productName} (Всього: ${runningTotal} ${units})\n\n${historyText}`;

		if (fullMessage.length > 1000) {
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

		// ВИПРАВЛЕНО: Звертаємось напряму до вузла з ID клієнта в корені архіву
		historyLog: fullArchive[userId] || {},

		// Якщо у вас немає окремого підсумку 'used', його можна вирахувати з historyLog
		used: (() => {
			const logs = fullArchive[userId] || {};
			const summary = {};
			// Оскільки в логах немає явного productId (тільки agreement), 
			// логіка usedMaterials може потребувати перегляду структури збереження
			return summary;
		})(),

		stock: fullArchive.stockAtThatTime || {}
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

					{/* Вибір конкретного часу запису */}
					<label className={classes.label}>🕒 Запис від:</label>
					<select
						value={selectedSnapshot}
						onChange={(e) => handleSnapshotChange(e.target.value)}
						className={classes.select}
						disabled={!availableSnapshots.length}
					>
						<option value="">-- Час створення --</option>
						{availableSnapshots.map(s => (
							<option key={s} value={s}>{s.replace('_', ' о ')}</option>
						))}
					</select>

					<label className={classes.label}>👤 Клієнт:</label>
					<select
						value={selectedUser}
						onChange={(e) => setSelectedUser(e.target.value)}
						className={classes.select}
						disabled={!selectedSnapshot}
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

					<div style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginTop: '30px',
						marginBottom: '15px',
						flexWrap: 'wrap',
						gap: '10px'
					}}>
						<h3 className={classes.sectionTitle} style={{ margin: 0 }}>🛠 Використані матеріали:</h3>

						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							flexWrap: 'wrap', // Дозволяє елементам перестрибувати на новий рядок
							background: '#f8f9fa',
							padding: '8px 12px', // Трохи збільшив відступ для мобілок
							borderRadius: '6px',
							border: '1px solid #dee2e6'
						}}>
							<span style={{
								fontSize: '13px',
								fontWeight: '600',
								color: '#495057',
								whiteSpace: 'nowrap' // Забороняє розрив тексту "Пошук по угоді"
							}}>
								🔍 Пошук по угоді:
							</span>

							<input
								type="text"
								placeholder="№ угоди..."
								value={searchAgreement}
								onChange={(e) => setSearchAgreement(e.target.value)}
								className={classes.select}
								style={{
									width: '130px',
									flexGrow: 1, // Інпут буде розтягуватися, щоб заповнити місце
									minWidth: '100px', // Мінімальна ширина для зручності
									height: '30px',
									margin: 0,
									padding: '2px 8px',
									fontSize: '13px'
								}}
							/>

							<button
								onClick={handleSearchByAgreement}
								className={classes.btnHistory}
								style={{
									height: '30px',
									padding: '0 15px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '12px',
									fontWeight: 'bold',
									background: '#17a2b8',
									color: '#fff',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer',
									flexGrow: 1, // Кнопка також може розтягуватися на весь рядок у мобільній версії
									whiteSpace: 'nowrap'
								}}
							>
								ПЕРЕВІРИТИ
							</button>
						</div>
					</div>

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
					{!selectedMonth ? "Будь ласка, оберіть місяць" : !selectedSnapshot ? "Оберіть конкретний запис часу" : "Оберіть клієнта"}
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
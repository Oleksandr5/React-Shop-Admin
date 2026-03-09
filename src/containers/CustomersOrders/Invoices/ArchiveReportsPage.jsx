import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import firebase from 'firebase/app';
import 'firebase/database';
import classes from './InvoicesPage.module.css';

const ArchiveReportsPage = ({ hasAccount, customers, customerId }) => {
	const [months, setMonths] = useState([]);
	const [selectedMonth, setSelectedMonth] = useState('');
	const [allMonthData, setAllMonthData] = useState({});
	const [availableSnapshots, setAvailableSnapshots] = useState([]);
	const [selectedSnapshot, setSelectedSnapshot] = useState('');
	const [reportData, setReportData] = useState(null);

	const [selectedUser, setSelectedUser] = useState(customerId || '');
	const [admins, setAdmins] = useState({});

	const idThisCustomers = window.localStorage.getItem("idThisCustomers");

	useEffect(() => {
		const ref = firebase.database().ref('settings/admins');
		ref.on('value', snapshot => { setAdmins(snapshot.val() || {}); });
		return () => ref.off();
	}, []);

	const isAdminFullAccess = hasAccount && !!admins[idThisCustomers]?.fullAccess;

	// 1. Завантаження списку місяців
	useEffect(() => {
		const ref = firebase.database().ref('archiveReports');
		ref.on('value', (snapshot) => {
			const data = snapshot.val();
			if (data) setMonths(Object.keys(data).sort().reverse());
		});
		return () => ref.off();
	}, []);

	// 2. Завантаження всіх знімків за місяць
	useEffect(() => {
		if (selectedMonth) {
			const ref = firebase.database().ref(`archiveReports/${selectedMonth}`);
			ref.once('value', (snapshot) => {
				const data = snapshot.val() || {};
				setAllMonthData(data);
				setAvailableSnapshots(Object.keys(data).sort().reverse());
			});
		} else {
			setAllMonthData({});
			setAvailableSnapshots([]);
			setSelectedSnapshot('');
		}
	}, [selectedMonth]);

	// 3. ВИПРАВЛЕНО: Логіка пошуку даних у структурі snapshot.reports[userId]
	useEffect(() => {
		if (selectedSnapshot && selectedUser && allMonthData[selectedSnapshot]) {
			const snapshot = allMonthData[selectedSnapshot];

			// Перевіряємо всі можливі місця, де можуть бути звіти (reports або allWorkers)
			const userData = snapshot.reports?.[selectedUser] || snapshot.allWorkers?.[selectedUser];

			if (userData) {
				setReportData({
					...userData,
					// ГАРАНТУЄМО, що reportDetails це масив, навіть якщо він порожній
					reportDetails: userData.reportDetails || userData.details || []
				});
			} else {
				setReportData(null);
			}
		} else {
			setReportData(null);
		}
	}, [selectedSnapshot, selectedUser, allMonthData]);

	const handlePrintReport = () => {
		// Додаємо перевірку на наявність reportDetails
		if (!reportData || !reportData.reportDetails) {
			alert("Дані для друку відсутні або пошкоджені");
			return;
		}

		const newWindow = window.open("", "_blank", "width=900,height=800");

		// Використовуємо optional chaining ?.map
		const rows = reportData.reportDetails.map(item => `
    <tr>
        <td>${item.name || '---'} ${item.units ? `(${item.units})` : ''}</td>
        <td style="text-align: center;">${item.prev || 0}</td>
        <td style="text-align: center; color: green;">+${item.added || 0}</td>
        <td style="text-align: center; color: red;">-${item.spent || 0}</td>
        <td style="text-align: center;">${item.calculated || 0}</td>
        <td style="text-align: center; font-weight: bold;">${item.fact || 0}</td>
        <td style="text-align: center; background: ${(item.diff || 0) < 0 ? '#ffcccc' : (item.diff || 0) > 0 ? '#ccffcc' : 'transparent'}">
            ${(item.diff || 0) > 0 ? '+' : ''}${item.diff || 0}
        </td>
    </tr>`).join('');

		newWindow.document.write(`
        <html>
            <head>
                <title>Архівний звіт - ${reportData.workerName}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 12px; }
                    th { background: #f2f2f2; }
                </style>
            </head>
            <body>
                <h2>📋 Архівний звіт: ${reportData.workerName}</h2>
                <p><strong>Дата архіву:</strong> ${selectedSnapshot.replace('_', ' о ')}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Товар</th><th>Початок</th><th>Взято</th><th>Списано</th><th>Розрахунок</th><th>Факт</th><th>Різниця</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </body>
        </html>`);
		newWindow.document.close();
	};

	return (
		<div className={classes.archiveWrapper}>
			<div className={classes.pageHeader} style={{ background: 'linear-gradient(135deg, #6f42c1, #563d7c)', padding: '20px', borderRadius: '8px' }}>
				<h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>📸 Глобальний Архів Звітів</h2>

				<div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
					<div style={{ flex: 1, minWidth: '150px' }}>
						<label style={{ color: '#fff', fontSize: '11px' }}>1. Місяць:</label>
						<select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={classes.select}>
							<option value="">-- Місяць --</option>
							{months.map(m => <option key={m} value={m}>{m}</option>)}
						</select>
					</div>

					<div style={{ flex: 1, minWidth: '150px' }}>
						<label style={{ color: '#fff', fontSize: '11px' }}>2. Дата знімка (Snapshot):</label>
						<select
							value={selectedSnapshot}
							onChange={(e) => setSelectedSnapshot(e.target.value)}
							className={classes.select}
							disabled={!availableSnapshots.length}
						>
							<option value="">-- Оберіть час --</option>
							{availableSnapshots.map(s => <option key={s} value={s}>{s.replace('_', ' о ')}</option>)}
						</select>
					</div>

					<div style={{ flex: 1, minWidth: '150px' }}>
						<label style={{ color: '#fff', fontSize: '11px' }}>3. Працівник:</label>
						<select
							value={selectedUser}
							onChange={(e) => setSelectedUser(e.target.value)}
							className={classes.select}
							disabled={!isAdminFullAccess && selectedUser !== ""}
						>
							<option value="">-- Оберіть працівника --</option>
							{customers
								.filter(c => (c.id === 7 || c.id > 127) && c.name !== "Шановний клієнт")
								.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
							}
						</select>
					</div>
				</div>
			</div>

			{reportData ? (
				<div className={classes.usedMaterialsSection} style={{ marginTop: '40px', borderTop: '5px solid #17a2b8', paddingTop: '20px' }}>
					<div className={classes.reportHeaderContainer}>
						<div className={classes.titleBlock}>
							<h3 className={classes.sectionTitle}>📊 Архівний звіт</h3>
							<div className={classes.crewInfo}>
								<strong>👷 Працівник:</strong> {reportData.workerName}
							</div>
						</div>
						{/* Якщо хочете зберегти кнопку друку, додайте її сюди */}
						<button onClick={handlePrintReport} className={classes.btnHistory} style={{ background: '#6c757d' }}>
							🖨️ Друкувати
						</button>
					</div>

					<div className={classes.tableWrapper}>
						<table className={`${classes.table} ${classes.reportTable}`}>
							<thead>
								<tr>
									<th>Товар</th>
									<th className={classes.alignRight}>Початок</th>
									<th className={classes.alignRight}>Взято</th>
									<th className={classes.alignRight}>Списано</th>
									<th className={classes.alignRight}>Розрахунок</th>
									<th className={classes.alignRight}>Факт</th>
									<th className={classes.alignRight}>Різниця</th>
								</tr>
							</thead>
							<tbody>
								{reportData.reportDetails && reportData.reportDetails.length > 0 ? (
									reportData.reportDetails.map((item, index) => (
										<tr key={index}>
											<td data-label="Товар" style={{ fontWeight: 'bold' }}>
												{item.name} {item.units && `(${item.units})`}
											</td>
											<td data-label="На початок" className={classes.alignRight}>
												{item.prev || 0}
											</td>
											<td data-label="Взято" className={classes.alignRight} style={{ color: 'green' }}>
												+{item.added || 0}
											</td>
											<td data-label="Списано" className={classes.alignRight} style={{ color: 'red' }}>
												-{item.spent || 0}
											</td>
											<td data-label="Розрахунок" className={classes.alignRight}>
												{item.calculated || 0}
											</td>
											<td data-label="Факт (архів)" className={classes.alignRight} style={{ fontWeight: 'bold' }}>
												{item.fact || 0}
											</td>
											<td data-label="Різниця" className={classes.alignRight} style={{
												fontWeight: 'bold',
												color: item.diff < 0 ? 'red' : item.diff > 0 ? 'green' : 'inherit'
											}}>
												{item.diff > 0 ? `+${item.diff}` : item.diff || 0}
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
											Дані про товари відсутні
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			) : (
				/* Блок, який показується, коли дані ще не обрані */
				<div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
					{!selectedMonth ? "Оберіть місяць" :
						!selectedSnapshot ? "Оберіть знімок за часом" :
							"Дані для цього працівника у цьому знімку відсутні"}
				</div>
			)}
		</div>
	);
};

const mapStateToProps = state => ({
	hasAccount: state.inform.hasAccount,
	customers: state.inform.customers
});

export default connect(mapStateToProps)(ArchiveReportsPage);
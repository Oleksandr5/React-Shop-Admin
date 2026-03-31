import React, { useEffect, useState, useMemo, useRef } from 'react'
import { connect, useDispatch } from 'react-redux'
import { fetchInvoices, fetchInvoicesReturn, fetchInvoicesSummary, fetchInvoicesSummaryReturn, fetchOrderNotifications, deleteNotification, clearNotifications, fetchUsedMaterials, addUsedMaterial, fetchUsedMaterialsHistory, fetchUsedMaterialsHistoryAction, archiveAllDataMonthly, updateUsedMaterialLocal, fetchRemainingMaterialsStart, setRemainingMaterialsStart } from '../../../redux/actions/invoices'; // шлях до ваших екшенів інвойсів

import classes from './InvoicesPage.module.css';
import firebase from 'firebase';

// =========================================================================
// Коментар: НОВИЙ КОМПОНЕНТ: CrewInventoryReport (Звіт залишків екіпажу)
// =========================================================================
const CrewInventoryReport = ({
	mainWorkerId,
	partnerWorkerId,
	stock,
	dynamicProductIds,
	customers,
	invoices,
	invoicesReturn = [],
	invoicesSummaryReturn,
	invoicesSummary,
	usedMaterials,
	isVisible,
	onToggle,
	isAdminFullAccess,
	isAdminInvoices,
	isAdminUsedMaterials,
	isArchiveMode,
	remainingMaterialsStart,
	fetchRemainingMaterialsStart,
	remainingMaterials,
	onUpdateRemainingStart,
	archiveStatus
}) => {
	const [combinedData, setCombinedData] = useState({
		invoices: {},
		invoicesReturn: {},
		used: {}
	});
	const [realRemaining, setRealRemaining] = useState({});
	const [hasArchiveInDB, setHasArchiveInDB] = useState(false);
	const [loading, setLoading] = useState(false);
	const [editingRow, setEditingRow] = useState(null);

	// 2. ЗАЙВІ useState ВИДАЛЕНО

	const fetchArchiveData = async (workerId) => {
		const db = firebase.database();
		const arcSnap = await db.ref('archive').orderByKey().limitToLast(1).once('value');
		if (arcSnap.exists()) {
			const months = arcSnap.val();
			const monthKey = Object.keys(months)[0];
			const times = months[monthKey];
			const lastTimeKey = Object.keys(times).sort().reverse()[0];
			const data = times[lastTimeKey]?.remainingMaterialsHistory?.[workerId];

			if (data) {
				setHasArchiveInDB(true);
				return data;
			}
		}
		setHasArchiveInDB(false);
		return {};
	};

	const reportRows = useMemo(() => {
		return (dynamicProductIds || []).map(pid => {
			const product = stock?.find(s => String(s.id) === String(pid));

			const prev = Number(remainingMaterialsStart?.[pid] || 0);

			const summaryItem = Array.isArray(invoicesSummary)
				? invoicesSummary.find(s => String(s.productId) === String(pid))
				: null;

			const taken = isArchiveMode
				? Number(summaryItem?.totalQuantity || 0)
				: Number(combinedData.invoices?.[pid] || 0);

			const summaryReturnItem = Array.isArray(invoicesSummaryReturn)
				? invoicesSummaryReturn.find(s => String(s.productId) === String(pid))
				: null;

			const back = isArchiveMode
				? Number(summaryReturnItem?.totalQuantity || 0)
				: Number(combinedData.invoicesReturn?.[pid] || 0);

			const spent = isArchiveMode
				? Number(usedMaterials?.[pid] || 0)
				: Number(combinedData.used?.[pid] || 0);

			const fact = isArchiveMode
				? Number(remainingMaterials?.[pid] || 0)
				: Number(realRemaining?.[pid] || 0);

			const calc = prev + taken - back - spent;
			const diff = calc - fact;

			return {
				pid,
				name: product?.name || `ID ${pid}`,
				prev, taken, back, spent, calc, fact, diff,
				isEmpty: prev === 0 && taken === 0 && back === 0 && spent === 0 && fact === 0
			};
		}).filter(row => !row.isEmpty);

	}, [
		dynamicProductIds, isArchiveMode, stock, remainingMaterialsStart,
		combinedData, invoicesSummary, invoicesSummaryReturn, invoicesReturn,
		usedMaterials, realRemaining, remainingMaterials
	]);

	useEffect(() => {
		// Якщо ми не в архіві і є ID майстра — вантажимо старти
		if (mainWorkerId && !isArchiveMode) {
			console.log("🚀 CrewInventoryReport: Викликаю завантаження стартів для ID:", mainWorkerId);

			if (typeof fetchRemainingMaterialsStart === 'function') {
				fetchRemainingMaterialsStart(mainWorkerId);
			} else {
				console.error("❌ fetchRemainingMaterialsStart не передано в пропси CrewInventoryReport");
			}
		}
	}, [mainWorkerId, isArchiveMode, fetchRemainingMaterialsStart]);

	useEffect(() => {
		// 1. Якщо це архів — вимикаємо завантаження і виходимо. 
		// Дані для архіву мають прийти зверху через пропси.
		if (isArchiveMode) {
			setLoading(false);
			return;
		}

		// 2. Якщо не архів, але немає ID майстра — теж виходимо
		if (!mainWorkerId) return;

		// 3. Тільки якщо ми ТУТ — починаємо реальне завантаження поточних даних
		const db = firebase.database();
		const ids = [mainWorkerId, partnerWorkerId].filter(id => !!id);
		setLoading(true);

		const workerData = {};

		const syncState = () => {
			const finalInvoices = {};
			const finalUsed = {};
			const finalReturns = {};

			Object.values(workerData).forEach(data => {
				Object.entries(data.invoices || {}).forEach(([pid, qty]) => {
					finalInvoices[pid] = (finalInvoices[pid] || 0) + qty;
				});
				Object.entries(data.used || {}).forEach(([pid, qty]) => {
					finalUsed[pid] = (finalUsed[pid] || 0) + qty;
				});
				Object.entries(data.returns || {}).forEach(([pid, qty]) => {
					finalReturns[pid] = (finalReturns[pid] || 0) + qty;
				});
			});

			setCombinedData({
				invoices: finalInvoices,
				used: finalUsed,
				invoicesReturn: finalReturns
			});
		};

		const listeners = [];

		const initialLoads = ids.flatMap(id => [
			db.ref(`invoicesSummary/${id}`).once('value'),
			db.ref(`usedMaterials/${id}`).once('value'),
			db.ref(`invoicesReturn/${id}`).once('value')
		]);

		Promise.all(initialLoads).finally(() => setLoading(false));

		ids.forEach(id => {
			workerData[id] = { invoices: {}, used: {}, returns: {} };

			const invRef = db.ref(`invoicesSummary/${id}`);
			invRef.on('value', (snap) => {
				const data = snap.val() || {};
				const temp = {};
				Object.values(data).forEach(item => {
					temp[item.productId] = (temp[item.productId] || 0) + Number(item.totalQuantity || 0);
				});
				workerData[id].invoices = temp;
				syncState();
			});
			listeners.push(invRef);

			const usedRef = db.ref(`usedMaterials/${id}`);
			usedRef.on('value', (snap) => {
				const data = snap.val() || {};
				const temp = {};
				Object.entries(data).forEach(([pid, qty]) => {
					temp[pid] = Number(qty || 0);
				});
				workerData[id].used = temp;
				syncState();
			});
			listeners.push(usedRef);

			const returnRef = db.ref(`invoicesReturn/${id}`);
			returnRef.on('value', (snap) => {
				const data = snap.val() || {};
				const temp = {};
				Object.values(data).forEach(order => {
					if (order.items) {
						order.items.forEach(item => {
							if (item.productId) {
								temp[item.productId] = (temp[item.productId] || 0) + Number(item.quantity || 0);
							}
						});
					}
				});
				workerData[id].returns = temp;
				syncState();
			});
			listeners.push(returnRef);
		});

		const remRef = db.ref(`remainingMaterials/${mainWorkerId}`);
		remRef.on('value', (snapshot) => {
			setRealRemaining(snapshot.val() || {});
		});
		listeners.push(remRef);

		// 3. СЛУХАЧ СТАРТІВ ВИДАЛЕНО (тепер за це відповідає Redux)

		return () => {
			listeners.forEach(ref => ref.off('value'));
		};
	}, [mainWorkerId, partnerWorkerId, isArchiveMode]);

	// 4. Оновлення через пропс батька
	const handleRemainingMaterialsStartInputChange = (pid, value) => {
		const newValue = value === '' ? 0 : Number(value);
		if (onUpdateRemainingStart) {
			onUpdateRemainingStart(pid, newValue);
		}
	};

	// 1. Збереження одного рядка в Firebase
	const saveRowToRemainingMaterialsStart = async (productId, name, currentValue) => {
		// Додаємо перевірку на архів, щоб випадково не змінити історію
		if (!mainWorkerId || isArchiveMode) {
			alert("Неможливо зберегти: ви в режимі архіву або не вибрано майстра");
			return;
		}

		const val = Number(currentValue);
		const db = firebase.database();

		try {
			// Записуємо в БД
			await db.ref(`remainingMaterialsStart/${mainWorkerId}/${productId}`).set(val);

			// Закриваємо режим редагування рядка (цей стейт у вас лишився)
			setEditingRow(null);

			// Порада: setLocalRemainingMaterialsStartRows видалено, 
			// бо Redux-слухач сам оновить дані в пропсах автоматично.

			alert(`Значення для "${name}" збережено.`);
		} catch (err) {
			console.error(err);
			alert("Помилка при збереженні в базу.");
		}
	};

	// 2. Синхронізація розрахункових залишків із фактичними
	const handleSync = async () => {
		if (isArchiveMode) {
			alert("Синхронізація недоступна в режимі архіву");
			return;
		}

		const updates = {};
		// Використовуємо дані з нашого useMemo (reportRows)
		reportRows.forEach(row => {
			updates[`/remainingMaterials/${mainWorkerId}/${row.pid}`] = row.calc;
		});

		if (Object.keys(updates).length === 0) {
			alert("Немає даних для синхронізації");
			return;
		}

		try {
			await firebase.database().ref().update(updates);
			alert("✅ Фактичні залишки оновлено на основі звіту!");
		} catch (e) {
			alert("Помилка синхронізації: " + e.message);
		}
	};

	const handleSyncRow = async (pid) => {
		const row = reportRows.find(r => r.pid === pid);
		if (!row) return;

		try {
			await firebase.database().ref(`remainingMaterials/${mainWorkerId}/${pid}`).set(row.calc);
			alert(`✅ Товар ${row.name} синхронізовано!`);
		} catch (e) {
			alert("Помилка: " + e.message);
		}
	};

	//Функції для "Звіт екіпажу" (combinedData)

	const handlePrintCombinedData = (reportRows, crewNames) => {
		const currentDate = new Date().toLocaleString('uk-UA');

		const tableRowsHtml = reportRows.map(row => {
			// Пропускаємо порожні рядки (де немає руху і залишків)
			if (row.prev === 0 && row.taken === 0 && row.back === 0 && row.spent === 0 && row.calc === 0) return '';

			// Логіка відображення різниці (як у таблиці)
			const diffText = row.diff === 0 ? '✓' : (row.diff > 0 ? `-${row.diff}` : `+${Math.abs(row.diff)}`);
			const diffStyle = row.diff === 0 ? 'color: green;' : 'color: red; font-weight: bold;';

			return `
        <tr>
            <td>${row.name}</td>
            <td style="text-align: center;">${row.prev}</td>
            <td style="text-align: center; color: green;">${row.taken}</td>
            <td style="text-align: center; color: #28a745;">${row.back}</td>
            <td style="text-align: center; color: red;">${row.spent}</td>
            <td style="text-align: center; font-weight: bold; background: #f9f9f9;">${row.calc}</td>
            <td style="text-align: center;">${row.fact}</td>
            <td style="text-align: center; ${diffStyle}">${diffText}</td>
        </tr>`;
		}).join('');

		if (!tableRowsHtml.trim()) {
			alert("Звіт порожній");
			return;
		}

		const newWindow = window.open("", "_blank", "width=900,height=700");
		if (newWindow) {
			newWindow.document.write(`
            <html>
                <head>
                    <title>Звіт — ${crewNames}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.4; }
                        .header { border-bottom: 2px solid #17a2b8; margin-bottom: 20px; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
                        th { background-color: #f1f4f9; }
                        .no-print { display: flex; justify-content: center; gap: 15px; margin-top: 30px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>📊 Звіт залишків екіпажу</h2>
                        <div><strong>👷 Екіпаж:</strong> ${crewNames}</div>
                        <div style="font-size: 12px;">Дата: ${currentDate}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Товар</th>
                                <th>Поч. зал.</th>
                                <th>Взято</th>
                                <th>Поверн.</th>
                                <th>Списано</th>
                                <th>Порах. зал.</th>
                                <th>Факт. зал.</th>
                                <th>Різниця</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
                    <div class="no-print">
                        <button style="background:#17a2b8;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;" onclick="window.print()">🖨️ Друкувати</button>
                    </div>
                </body>
            </html>
        `);
			newWindow.document.close();
		}
	};

	const handleExportCombinedDataToCSV = (reportRows, fileName) => {
		const header = [
			"Товар",
			"Початковий залишок",
			"Взято (+)",
			"Повернено на склад (-)",
			"Списано (-)",
			"Розрахунковий залишок",
			"Фактичний залишок",
			"Різниця"
		].join(";");

		const rows = reportRows.map(row => {
			if (row.prev === 0 && row.taken === 0 && row.back === 0 && row.spent === 0 && row.calc === 0) return null;

			const fact = row.fact;
			const diffText = row.diff === 0 ? "OK" : (row.diff > 0 ? `-${row.diff}` : `+${Math.abs(row.diff)}`);
			const safeName = row.name ? row.name.replace(/"/g, '""') : `ID ${row.pid}`;

			return [
				`"${safeName}"`,
				row.prev,
				row.taken,
				row.back,
				row.spent,
				row.calc,
				fact,
				`"${diffText}"`
			].join(";");
		}).filter(row => row !== null);

		const csvContent = "\uFEFF" + [header, ...rows].join("\n");
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement("a");
		const dateStr = new Date().toLocaleDateString('uk-UA').replace(/\//g, '.');

		link.setAttribute("href", URL.createObjectURL(blob));
		link.setAttribute("download", `Crew_Report_${fileName}_${dateStr}.csv`);
		link.click();
	};

	// Знаходимо імена для відображення в інтерфейсі
	const getWorkerName = (id) => {
		const worker = customers?.find(c => String(c.id) === String(id));
		return worker ? `${worker.name} (${id})` : (id ? `ID ${id}` : "");
	};

	const mainName = getWorkerName(mainWorkerId);
	const partnerName = getWorkerName(partnerWorkerId);
	const crewNames = partnerWorkerId ? `${mainName} / ${partnerName}` : mainName;

	if (loading) return <p>⏳ Завантаження...</p>;

	return (
		<div className={classes.usedMaterialsSection} style={{ marginTop: '40px', borderTop: '5px solid #17a2b8', paddingTop: '20px' }}>
			<div className={classes.reportHeaderContainer}>
				<div className={classes.titleBlock}>
					<h3 className={classes.sectionTitle}>📊 Звіт екіпажу {archiveStatus}</h3>

					{/* Тепер crewNames визначено і помилки не буде */}
					<div className={classes.crewInfo}>
						<strong>👷 Екіпаж:</strong> {crewNames || "Не обрано"}
					</div>

				</div>
				<div className={classes.topActions}>

					{/* Синхронізувати */}
					{
						isAdminFullAccess && (
							<button
								disabled={isArchiveMode}
								onClick={() => {
									if (window.confirm("Ви впевнені, що хочете синхронізувати всі дані?")) {
										handleSync();
									}
								}}
								className={classes.actionBtn}
								style={{ background: '#17a2b8' }}
							>
								🔄 Синхронізувати
							</button>
						)
					}
				</div>
			</div>
			<div className={classes.headerActions} style={{ marginBottom: '15px' }}>
				<button
					className={classes.btnPrint}
					onClick={(e) => {
						e.stopPropagation();
						// Передаємо лише готові рядки та назву екіпажу
						handlePrintCombinedData(reportRows, crewNames);
					}}
				>
					🖨️ Друк звіту екіпажу {crewNames}
				</button>

				<button
					className={classes.btnExport}
					onClick={(e) => {
						e.stopPropagation();

						// Формуємо чисте ім'я для файлу
						const mainOnly = mainName.split(' (')[0] || "Report";
						const partnerOnly = partnerWorkerId ? partnerName.split(' (')[0] : null;
						const crewNamesForFile = partnerOnly ? `${mainOnly}_та_${partnerOnly}` : mainOnly;

						// Викликаємо експорт
						handleExportCombinedDataToCSV(reportRows, crewNamesForFile);
					}}
				>
					📥 Експорт Excel (CSV) Звіту екіпажу {crewNames}
				</button>
			</div>
			<button className={classes.btnToggle} onClick={onToggle}>
				<span style={{ display: 'flex', alignItems: 'center' }}>
					{isVisible ? (
						<>
							{/* Змінено тут: classes.arrowRed замість "arrowRed" */}
							<span className={classes.arrowRed}>▲</span>
							<span>Згорнути таблицю звіту екіпажу {crewNames}</span>
						</>
					) : (
						<>
							{/* Змінено тут: classes.arrowGreen замість "arrowGreen" */}
							<span className={classes.arrowGreen}>▼</span>
							<span>Розгорнути таблицю звіт екіпажу {crewNames}</span>
						</>
					)}
				</span>
			</button>

			{isVisible && (
				<table className={`${classes.table} ${classes.reportTable}`}>
					<thead>
						<tr style={{ fontSize: '11px', backgroundColor: '#f1f4f9' }}>
							<th>Товар</th>
							{/* ЗАМІНА: перевіряємо довжину ключів об'єкта з Redux */}
							<th>Залишок на початок місяця {(!remainingMaterialsStart || Object.keys(remainingMaterialsStart).length === 0) && "(Введіть дані)"}</th>
							<th>Взято</th>
							<th>Повернено</th>
							<th>Списано</th>
							<th>Порахований залишок</th>
							<th>Фактичний залишок</th>
							<th>Різниця</th>
						</tr>
					</thead>
					<tbody>
						{reportRows.map(row => {
							const pid = row.pid;

							{/* ЗАМІНА: isChanged нам тепер фактично не потрібен для логіки "збережено", 
           оскільки Redux оновлюється автоматично. Але якщо ви хочете підсвітку, 
           можна порівнювати з початковим значенням з Redux.
        */}
							const isChanged = true;

							return (
								<tr key={pid}>
									<td data-label="Товар" style={{ fontSize: '12px' }}>
										{row.name}
									</td>

									<td data-label="Залишок на початок місяця" style={{ textAlign: 'center' }}>
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
											{/* ЗАМІНА: використовуємо перевірку наявності даних у Redux-об'єкті */}
											{(!remainingMaterialsStart || remainingMaterialsStart[pid] === undefined || editingRow === pid) ? (
												<>
													<input
														type="number"
														value={remainingMaterialsStart[pid] || ''}
														onChange={(e) => handleRemainingMaterialsStartInputChange(pid, e.target.value)}
														readOnly={isArchiveMode}
														autoFocus={editingRow === pid}
														inputMode="decimal"
														onFocus={(e) => {
															setEditingRow(pid);
															if (Number(e.target.value) === 0) {
																handleRemainingMaterialsStartInputChange(pid, '');
															}
														}}
														onBlur={(e) => {
															setTimeout(() => {
																setEditingRow(null);
																if (remainingMaterialsStart[pid] === '') {
																	handleRemainingMaterialsStartInputChange(pid, 0);
																}
															}, 200);
														}}
														style={{
															width: '50px',
															border: editingRow === pid ? '1px solid #f39c12' : 'none',
															outline: 'none',
															background: 'transparent',
															textAlign: 'center',
															fontSize: 'inherit',
															padding: '2px'
														}}
													/>

													{(editingRow === pid && isChanged) && (
														<button
															disabled={isArchiveMode}
															onClick={() => {
																if (isArchiveMode) return;
																const currentVal = remainingMaterialsStart[pid] || 0;
																if (window.confirm(`Зберегти ${currentVal} для "${row.name}"?`)) {
																	saveRowToRemainingMaterialsStart(pid, row.name, currentVal);
																	setEditingRow(null);
																}
															}}
															style={{
																color: '#fff',
																border: 'none',
																borderRadius: '4px',
																padding: '4px 8px',
																marginLeft: '5px',
																backgroundColor: isArchiveMode ? '#ccc' : '#f39c12',
																cursor: isArchiveMode ? 'not-allowed' : 'pointer',
																lineHeight: '1'
															}}
														>
															💾
														</button>
													)}
												</>
											) : (
												<span
													onClick={() => isAdminFullAccess && !isArchiveMode && setEditingRow(pid)}
													style={{
														cursor: (isAdminFullAccess && !isArchiveMode) ? 'pointer' : 'default',
														display: 'inline-block',
														minWidth: '40px',
														padding: '2px'
													}}
												>
													{remainingMaterialsStart?.[pid] ?? 0}
												</span>
											)}
										</div>
									</td>

									<td data-label="Взято" style={{ textAlign: 'center', color: 'green' }}>
										{row.taken}
									</td>

									<td data-label="Повернено" style={{ textAlign: 'center', color: '#28a745' }}>
										{row.back}
									</td>

									<td data-label="Списано" style={{ textAlign: 'center', color: 'red' }}>
										{row.spent}
									</td>

									<td data-label="Порахований залишок" style={{ textAlign: 'center', fontWeight: 'bold' }}>
										{row.calc}
									</td>

									<td data-label="Фактичний залишок" style={{ textAlign: 'center' }}>
										<input
											type="number"
											// Якщо значення 0, показуємо порожній рядок (щоб бачити тільки курсор)
											value={row.fact === 0 ? '' : (row.fact !== undefined ? row.fact : '')}
											readOnly={isArchiveMode}

											// 1. Коли клікаємо в інпут
											onFocus={(e) => {
												if (isArchiveMode) return;
												// Якщо там 0, "стираємо" його для зручного вводу
												if (Number(e.target.value) === 0) {
													setRealRemaining(prev => ({ ...prev, [pid]: '' }));
												}
											}}

											onChange={(e) => {
												if (isArchiveMode) return;
												const val = e.target.value;
												// Дозволяємо порожній рядок, щоб можна було стерти все
												setRealRemaining(prev => ({
													...prev,
													[pid]: val === '' ? '' : Number(val)
												}));
											}}

											// 2. Коли йдемо з інпуту
											onBlur={async (e) => {
												if (isArchiveMode) return;
												let val = e.target.value;

												// Якщо залишили порожнім — повертаємо 0 (або лишаємо порожнім, як вам зручніше)
												if (val === '') {
													val = "0";
													setRealRemaining(prev => ({ ...prev, [pid]: 0 }));
												}

												// Зберігаємо в базу
												await firebase.database()
													.ref(`remainingMaterials/${mainWorkerId}/${pid}`)
													.set(Number(val));
											}}

											style={{
												width: '50px',
												border: isArchiveMode ? '1px solid #ccc' : '1px solid #17a2b8',
												backgroundColor: isArchiveMode ? '#f9f9f9' : 'white',
												textAlign: 'center',
												borderRadius: '4px',
												cursor: isArchiveMode ? 'not-allowed' : 'text'
											}}
										/>
									</td>

									<td data-label="Різниця" style={{ textAlign: 'center', fontWeight: 'bold', color: row.diff > 0 ? 'red' : 'green' }}>
										{row.diff === 0 ? '✓' : (
											<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
												<span>{row.diff > 0 ? `-${row.diff}` : `+${Math.abs(row.diff)}`}</span>
												{
													isAdminFullAccess && !isArchiveMode && (

														<button
															onClick={() => {
																if (window.confirm("Синхронізувати лише цей рядок?")) {
																	handleSyncRow(pid);
																}
															}}
															title="Синхронізувати лише цей рядок"
															style={{
																padding: '2px 5px',
																fontSize: '10px',
																cursor: 'pointer',
																background: '#e9ecef',
																border: '1px solid #ced4da',
																borderRadius: '3px'
															}}
														>
															🔄
														</button>
													)
												}
											</div>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			)}


		</div>
	);
};

// =========================================================================
// КОМПОНЕНТ: UsedMaterialsTable (Ваш оригінальний, з невеликими правками пропсів)
// =========================================================================

const UsedMaterialsTable = ({
	selectedUser,
	inputRef,
	customers,
	invoicesSummary,
	usedMaterials,
	usedMaterialsHistory,
	stock,
	fetchUsedMaterials,
	addUsedMaterial,
	fetchUsedMaterialsHistoryAction,
	isAdminFullAccess,
	isAdminInvoices,
	isAdminUsedMaterials,
	dynamicProductIds, // ЗМІНА: тепер отримуємо це як пропс від батька
	setLiveDynamicProductIds,
	isArchiveMode,
	isVisible,
	onToggle,
	archiveStatus,
	combinedSummary
}) => {
	const [inputValues, setInputValues] = useState({});
	const [agreementValues, setAgreementValues] = useState({});
	const [commonAgreement, setCommonAgreement] = useState('');
	const [searchAgreement, setSearchAgreement] = useState('');
	const [isEditingIds, setIsEditingIds] = useState(false);
	const [newIdsString, setNewIdsString] = useState("");
	const [historyModal, setHistoryModal] = useState({ isOpen: false, data: [], productId: null });
	const [editingEntryId, setEditingEntryId] = useState(null);
	const [commentValues, setCommentValues] = useState({}); // Стейт для коментарів у таблиці
	const dispatch = useDispatch(); // Додайте цей рядок сюди!	
	// Знаходимо користувача в масиві за його ID
	const userObj = customers?.find(c => String(c.id) === String(selectedUser));
	console.log('my_combinedSummary', combinedSummary)
	// Отримуємо ім'я (якщо знайшли) або просто показуємо ID
	const displayUserName = userObj ? userObj.name : `Користувач #${selectedUser}`;

	// 3. Динамічна підготовка даних (useMemo тепер залежить від dynamicProductIds)
	const fullMaterialsList = useMemo(() => {
		if (!stock || stock.length === 0) return [];

		const stockMap = new Map(stock.map(s => [Number(s.id), s]));
		const summaryMap = new Map((invoicesSummary || []).map(s => [Number(s.productId), s]));

		const list = dynamicProductIds.map(id => {
			const productFromStock = stockMap.get(Number(id));
			const userInventory = summaryMap.get(Number(id));

			return {
				productId: id,
				name: productFromStock?.name || userInventory?.name || `Товар #${id}`,
				units: productFromStock?.units || userInventory?.units || '',
				totalQuantity: userInventory ? userInventory.totalQuantity : 0
			};
		});

		return list.sort((a, b) => {
			if (b.totalQuantity > 0 && a.totalQuantity === 0) return 1;
			if (a.totalQuantity > 0 && b.totalQuantity === 0) return -1;
			return a.name.localeCompare(b.name);
		});
	}, [stock, invoicesSummary, dynamicProductIds, selectedUser]);

	useEffect(() => {
		// Лог для перевірки спрацювання
		console.log("--- [useEffect] Спрацював. Стан модалки:", historyModal.isOpen, "ID продукту:", historyModal.productId);

		if (historyModal.isOpen && historyModal.productId && usedMaterialsHistory) {
			const productId = historyModal.productId;
			const rawDataForProduct = usedMaterialsHistory[productId] || {};

			console.log(`--- [useEffect] Дані з Redux для ${productId}:`, rawDataForProduct);

			// 1. Перетворюємо в масив
			let historyArray = Object.keys(rawDataForProduct).map(key => ({
				id: key,
				...rawDataForProduct[key]
			}));

			// 2. ОБОВ'ЯЗКОВО СОРТУЄМО за часом (від старих до нових)
			// Без цього cumulativeSum буде рахуватися неправильно, якщо записи прийшли не по порядку
			historyArray.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

			// 3. Робимо розрахунок
			const finalData = recalculateWithTime(historyArray);
			console.log("--- [useEffect] Результат після розрахунку:", finalData);

			// 4. ОНОВЛЮЄМО СТЕЙТ 
			// Прибираємо перевірку JSON.stringify, щоб дані оновилися примусово
			setHistoryModal(prev => ({
				...prev,
				data: finalData
			}));

			console.log("--- [useEffect] Стейт модалки оновлено примусово");
		}
	}, [usedMaterialsHistory, historyModal.isOpen, historyModal.productId]);

	const handleSearchByAgreement = () => {
		const term = searchAgreement.trim();
		if (!term) {
			alert("Введіть номер угоди для пошуку");
			return;
		}

		// 1. Беремо дані безпосередньо з пропсів (вони вже там завдяки Action)
		const allHistory = usedMaterialsHistory || {};
		let foundMaterials = [];

		// 2. Проходимо по ID товарів, які зараз використовуються
		dynamicProductIds.forEach(productId => {
			const productHistoryRaw = allHistory[productId];

			if (productHistoryRaw) {
				// Отримуємо масив записів (перетворюємо об'єкт Firebase у масив)
				const historyArray = Object.values(productHistoryRaw);

				// Фільтруємо за номером угоди
				const matches = historyArray.filter(log => String(log.agreement).trim() === term);

				if (matches.length > 0) {
					const productInfo = fullMaterialsList.find(s => Number(s.productId) === Number(productId));

					matches.forEach(match => {
						const date = match.createdAt
							? new Date(match.createdAt).toLocaleString("uk-UA", {
								day: '2-digit',
								month: '2-digit',
								year: '2-digit',
								hour: '2-digit',
								minute: '2-digit'
							})
							: "---";

						foundMaterials.push({
							name: productInfo?.name || `Товар #${productId}`,
							quantity: Number(match.value || 0),
							units: productInfo?.units || '',
							date: date,
							comment: match.comment || ""
						});
					});
				}
			}
		});

		// 3. Результат пошуку
		if (foundMaterials.length === 0) {
			alert(`По угоді №${term} не списано товарів`);
		} else {
			const listText = foundMaterials
				.map(m => {
					const commentPart = m.comment ? ` (Прим: ${m.comment})` : "";
					return `• [${m.date}] ${m.name}: ${m.quantity} ${m.units}${commentPart}`;
				})
				.join('\n');

			alert(`📦 Товари списані на угоду №${term}:\n\n${listText}`);
		}
	};

	const handleSaveIds = async () => {
		const idsArray = newIdsString
			.split(',')
			.map(id => id.trim())
			.filter(id => id !== "")
			.map(Number);

		if (idsArray.some(isNaN)) {
			alert("Помилка: вводити можна тільки числа, розділені комою.");
			return;
		}

		if (window.confirm("Оновити список товарів для всіх користувачів?")) {
			// 1. ПЕРЕВІРКА: Якщо ми в архіві — виходимо і нічого не зберігаємо
			if (isArchiveMode) {
				alert("Неможливо оновити список товарів у режимі перегляду архіву.");
				return;
			}

			try {
				// 2. Використовуємо наш прямий шлях до бази
				await firebase.database().ref('settings/productsForWorkOrders').set(idsArray);

				// 3. Оновлюємо ЛАЙВ-стейт (наш перейменований сеттер)
				setLiveDynamicProductIds(idsArray);

				setIsEditingIds(false);
				alert("Список оновлено!");
			} catch (err) {
				console.error(err);
				alert("Помилка збереження.");
			}
		}
	};

	const handleAddMaterial = async (productId) => {
		const valueToAdd = Number(inputValues[productId]);
		const localAgreement = (agreementValues[productId] || "").trim();
		const agreement = localAgreement !== "" ? localAgreement : commonAgreement;
		// добавити: отримуємо коментар зі стейту
		const comment = (commentValues[productId] || "").trim();

		if (!valueToAdd || valueToAdd <= 0) {
			alert("Введіть коректну кількість");
			return;
		}
		if (!agreement || agreement.trim() === "") {
			alert("Введіть номер угоди (загальний або для цього товару)");
			return;
		}

		try {
			// добавити: додаємо comment як сьомим аргумент у вашу функцію
			await addUsedMaterial(selectedUser, productId, valueToAdd, agreement, null, null, comment);

			await fetchUsedMaterials(selectedUser);
			setInputValues(prev => ({ ...prev, [productId]: "" }));
			console.log("--- [handleAddMaterial] Викликаю оновлення історії ---");
			fetchUsedMaterialsHistoryAction(selectedUser);
			// ДОДАЄМО ЦЕ: Очищуємо поле угоди для цього productId
			setAgreementValues(prev => ({ ...prev, [productId]: "" }));
			// добавити: очищуємо поле коментаря після успішного додавання
			setCommentValues(prev => ({ ...prev, [productId]: "" }));
			alert("Дані успішно додано");
		} catch (err) {
			console.error("Помилка додавання:", err);
		}
	};

	const handleHistory = (productId) => {
		// Дані вже підготовлені у Redux (або в архіві через useMemo)
		// usedMaterialsHistory — це об'єкт { productId: { pushId: { data } } }
		const historyDataRaw = usedMaterialsHistory[productId] || {};

		// Перетворюємо об'єкт у масив з ID
		const historyArray = Object.keys(historyDataRaw).map(key => ({
			id: key,
			...historyDataRaw[key]
		}));

		// Сортуємо і рахуємо суми (ваша логіка)
		const finalData = recalculateWithTime(historyArray);

		setHistoryModal({
			isOpen: true,
			productId: productId,
			data: finalData
		});
	};

	const handleUndo = async (productId) => {
		if (isArchiveMode) {
			alert("В режимі архіву не можна скасовувати дії");
			return;
		}

		try {
			// Отримуємо історію конкретного товару з Redux
			const productHistoryRaw = usedMaterialsHistory[productId] || {};

			// Перетворюємо в масив та сортуємо за часом, щоб знайти останній запис
			const hist = Object.values(productHistoryRaw).sort((a, b) => a.createdAt - b.createdAt);

			const currentTotal = usedMaterials?.[productId] || 0;
			if (hist.length === 0) {
				alert("Історія порожня");
				return;
			}

			const lastEntry = hist[hist.length - 1];
			const rollbackValue = currentTotal - lastEntry.value;

			if (window.confirm(`Відмінити останню дію (+${lastEntry.value})?`)) {
				// Викликаємо екшен додавання з параметром rollbackValue
				// addUsedMaterial сам викличе fetchUsedMaterials всередині себе
				await addUsedMaterial(selectedUser, productId, null, null, rollbackValue);
				console.log("--- [handleUndo] Викликаю оновлення історії після відкату ---");
				// Оскільки ми змінили базу, оновлюємо і всю історію в Redux
				fetchUsedMaterialsHistoryAction(selectedUser);
			}
		} catch (err) {
			console.error(err);
			alert("Помилка при відкаті");
		}
	};

	const handlePrintAllAgreementsReport = async () => {
		try {
			const crewId = selectedUser;
			console.log("--- 🚀 START REPORT GENERATION ---");

			if (!crewId) return alert("Будь ласка, виберіть екіпаж");

			// 1. ПРЯМИЙ ЗАПИТ ДО FIREBASE (замість Redux)
			// Це гарантує отримання даних без зміни існуючих екшенів
			const snapshot = await firebase
				.database()
				.ref(`usedMaterialsHistory/${crewId}`)
				.once("value");

			const userHistory = snapshot.val();
			console.log("1. Data fetched directly from Firebase:", userHistory);

			if (!userHistory || Object.keys(userHistory).length === 0) {
				alert(`Для екіпажу №${crewId} записів про списання не знайдено.`);
				return;
			}

			// 2. ПІДГОТОВКА ДАНИХ (назви, одиниці, клієнт)
			const workerObj = customers.find(c => String(c.id) === String(crewId));
			const crewDisplayName = workerObj ? `${workerObj.name} (${crewId})` : crewId;
			const stockMap = new Map((stock || []).map(s => [Number(s.id), s]));
			const summaryMap = new Map((invoicesSummary || []).map(s => [Number(s.productId), s]));

			const agreementsMap = {};

			// 3. ГРУПУВАННЯ ПО УГОДАХ
			Object.keys(userHistory).forEach(productId => {
				const histRaw = userHistory[productId];
				if (histRaw) {
					const hist = Object.values(histRaw);
					const productFromStock = stockMap.get(Number(productId));
					const userInventory = summaryMap.get(Number(productId));

					const name = productFromStock?.name || userInventory?.name || `Товар #${productId}`;
					const units = productFromStock?.units || userInventory?.units || '';

					hist.forEach(log => {
						const agreement = String(log.agreement || "Без угоди").trim();
						if (!agreementsMap[agreement]) agreementsMap[agreement] = [];

						agreementsMap[agreement].push({
							name,
							quantity: Number(log.value || 0),
							units,
							comment: log.comment || "",
							date: log.createdAt
								? new Date(log.createdAt).toLocaleString("uk-UA", { day: '2-digit', month: '2-digit', year: '2-digit' })
								: "---"
						});
					});
				}
			});

			// 4. ФОРМУВАННЯ HTML
			const currentDate = new Date().toLocaleString('uk-UA');
			const modeLabel = isArchiveMode ? "АРХІВ" : "LIVE";

			let reportHtml = `
            <html>
            <head>
                <title>Звіт по угодах - ${crewDisplayName}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #444; margin-bottom: 20px; padding-bottom: 10px; }
                    .agreement-section { margin-bottom: 30px; page-break-inside: avoid; }
                    .agreement-title { background: #17a2b8; color: white; padding: 8px 12px; font-weight: bold; border-radius: 4px 4px 0 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
                    th { background: #f8f9fa; }
                    .no-print { text-align: center; margin: 20px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>📋 Повний звіт списань по угодах</h2>
                    <p><b>Режим:</b> ${modeLabel} | <b>Екіпаж:</b> ${crewDisplayName} | <b>Дата:</b> ${currentDate}</p>
                </div>
        `;

			const sortedAgreements = Object.keys(agreementsMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

			sortedAgreements.forEach(agNum => {
				const items = agreementsMap[agNum];
				reportHtml += `
                <div class="agreement-section">
                    <div class="agreement-title">📄 Угода №: ${agNum}</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 15%">Дата</th>
                                <th>Товар</th>
                                <th style="width: 15%; text-align: right;">Кількість</th>
                                <th>Примітка</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(m => `
                                <tr>
                                    <td>${m.date}</td>
                                    <td>${m.name}</td>
                                    <td style="text-align: right;"><b>${m.quantity}</b> ${m.units}</td>
                                    <td>${m.comment}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
			});

			reportHtml += `
                <div class="no-print">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #28a745; color: white; border: none; cursor: pointer;">🖨️ Друкувати</button>
                </div>
            </body>
            </html>
        `;

			const newWindow = window.open("", "_blank", "width=1100,height=850");
			if (newWindow) {
				newWindow.document.write(reportHtml);
				newWindow.document.close();
			}

		} catch (err) {
			console.error("🛑 Error:", err);
			alert("Помилка: " + err.message);
		}
	};

	const handlePrintFullHistoryReport = () => { // Прибрали async
		try {
			const crewId = selectedUser;
			const workerObj = customers.find(c => String(c.id) === String(crewId));
			const crewDisplayName = workerObj ? `${workerObj.name} (${crewId})` : crewId;

			const allHistory = usedMaterialsHistory || {};
			const currentDate = new Date().toLocaleString('uk-UA');

			let reportHtml = `
            <html>
            <head>
                <title>Загальна історія списань</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; line-height: 1.4; }
                    .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
                    .product-section { margin-bottom: 40px; page-break-inside: avoid; }
                    .product-title { background: #17a2b8; color: white; padding: 10px; font-weight: bold; margin-bottom: 0; display: flex; justify-content: space-between; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 0; }
                    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
                    th { background: #f2f2f2; font-weight: bold; }
                    .total-row { background: #e9ecef; font-weight: bold; }
                    .no-print { text-align: center; margin: 20px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>📋 Повний звіт історії списань матеріалів</h2>
                    <p><b>Екіпаж:</b> ${crewDisplayName} | <b>Дата:</b> ${currentDate}</p>
                </div>
        `;

			let hasData = false;

			dynamicProductIds.forEach(productId => {
				const histRaw = allHistory[productId];
				if (histRaw) {
					const hist = Object.values(histRaw);
					if (hist.length > 0) {
						hasData = true;
						const productInfo = fullMaterialsList.find(s => Number(s.productId) === Number(productId));
						const productName = productInfo?.name || `Товар #${productId}`;
						const units = productInfo?.units || '';

						const sortedLogs = [...hist].sort((a, b) => a.createdAt - b.createdAt);

						let runningTotal = 0;
						const rowsWithTotal = sortedLogs.map(log => {
							const val = Number(log.value || 0);
							runningTotal += val;
							return {
								...log,
								currentRunningTotal: runningTotal
							};
						}).reverse();

						reportHtml += `
                    <div class="product-section">
                        <div class="product-title">
                            <span>📦 ${productName}</span>
                            <span>Всього списано: ${runningTotal} ${units}</span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 20%">Дата</th>
                                    <th style="width: 15%">Списано</th>
                                    <th style="width: 20%">Загальна кількість</th>
                                    <th style="width: 20%">Угода</th>
                                    <th>Примітка</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsWithTotal.map(log => `
                                    <tr>
                                        <td>${log.createdAt ? new Date(log.createdAt).toLocaleString("uk-UA") : "---"}</td>
                                        <td><b>${log.value}</b> ${units}</td>
                                        <td style="color: #2c3e50; font-weight: bold;">${log.currentRunningTotal} ${units}</td>
                                        <td>${log.agreement || "—"}</td>
                                        <td>${log.comment || ""}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="2" style="text-align: right;">ПІДСУМОК:</td>
                                    <td colspan="3">${runningTotal} ${units}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
					}
				}
			});

			if (!hasData) {
				reportHtml += "<p style='text-align:center;'>Історія списань порожня.</p>";
			}

			reportHtml += `
                <div class="no-print">
                    <button onclick="window.print()" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">🖨️ Роздрукувати повний звіт</button>
                </div>
            </body>
            </html>
        `;

			const newWindow = window.open("", "_blank", "width=1000,height=800");
			if (newWindow) {
				newWindow.document.write(reportHtml);
				newWindow.document.close();
			}
		} catch (err) {
			console.error(err);
			alert("Помилка при формуванні звіту.");
		}
	};

	// --- ФУНКЦІЯ ПЕРЕРАХУНКУ ЧЕРЕЗ createdAt --- Вона не містить запитів до БД, лише чиста логіка формування сум.
	const recalculateWithTime = (dataArray) => {
		console.log("%c [CALC] Початок перерахунку сум...", "color: #007bff; font-weight: bold;");

		// 1. Сортуємо від найстаріших до найновіших
		const sorted = [...dataArray].sort((a, b) => a.createdAt - b.createdAt);

		let runningSum = 0;
		const withSums = sorted.map(item => {
			runningSum += Number(item.value || 0);
			return {
				...item,
				cumulativeSum: runningSum // Це наше нове "currentValue"
			};
		});

		console.log("Результат розрахунку (від старих до нових):", withSums);
		// 2. Повертаємо реверсом (нові зверху) для відображення в модалці
		return withSums.reverse();
	};

	// --- РЕДАГУВАННЯ --- Ця функція тепер оновлює всю гілку історії цього товару, щоб підтягнути всі currentValue.
	const saveEdit = async (logId) => {
		const inputElement = document.getElementById(`edit-val-${logId}`);
		const agreementElement = document.getElementById(`edit-agrm-${logId}`); // Отримуємо елемент угоди
		// добавити: знаходимо інпут коментаря за ID
		const commentElement = document.getElementById(`edit-comment-${logId}`);

		if (!inputElement || !agreementElement) return;

		const newValue = Number(inputElement.value);
		const newAgreement = agreementElement.value; // Зчитуємо текст угоди
		// добавити: зчитуємо значення коментаря
		const newComment = commentElement ? commentElement.value : "";

		try {
			// 1. Оновлюємо масив даних, додаючи нову угоду до потрібного рядка
			const updatedRaw = historyModal.data.map(item =>
				// добавити: додаємо comment та agreement в об'єкт масиву
				item.id === logId ? { ...item, value: newValue, agreement: newAgreement, comment: newComment } : item
			);

			// Перераховуємо сумарні значення (cumulativeSum)
			const finalData = recalculateWithTime(updatedRaw);

			// 2. Підготовка оновлень для Firebase
			const updates = {};
			finalData.forEach(item => {
				const basePath = `usedMaterialsHistory/${selectedUser}/${historyModal.productId}/${item.id}`;
				updates[`${basePath}/value`] = item.value;
				updates[`${basePath}/currentValue`] = item.cumulativeSum;

				// Оновлюємо поле agreement в базі тільки для того запису, який редагували
				if (item.id === logId) {
					updates[`${basePath}/agreement`] = newAgreement;
					updates[`${basePath}/comment`] = newComment;
				}
			});

			// Оновлюємо загальний залишок у головній гілці
			const finalTotal = finalData.length > 0 ? finalData[0].cumulativeSum : 0;
			updates[`usedMaterials/${selectedUser}/${historyModal.productId}`] = finalTotal;

			// 3. Запис у Firebase
			await firebase.database().ref().update(updates);

			// 4. Оновлення Redux локально
			dispatch(updateUsedMaterialLocal(selectedUser, historyModal.productId, finalTotal));
			fetchUsedMaterialsHistoryAction(selectedUser);
			// 5. Закриття режиму редагування в модалці
			setHistoryModal(prev => ({ ...prev, data: finalData }));
			setEditingEntryId(null);

			console.log("%c [SUCCESS] Угода та значення оновлені", "color: #28a745;");
		} catch (e) {
			console.error("Помилка при збереженні:", e);
			alert("Не вдалося зберегти зміни");
		}
	};

	//Допоміжна функція для друку (щоб не дублювати HTML-код)

	const renderPrintWindow = (title, tableRows, date) => {
		const newWindow = window.open("", "_blank", "width=800,height=600");
		if (!newWindow) return;
		newWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    .header-info { display: flex; justify-content: space-between; border-bottom: 2px solid #333; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #999; padding: 10px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .footer-date { margin-top: 15px; font-size: 12px; text-align: right; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header-info"><h2>${title}</h2><span>${date}</span></div>
                <table>
                    <thead><tr><th>Назва товару</th><th style="text-align: right;">Кількість</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <p class="footer-date">Сформовано: ${date}</p>
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #fb8c00; color: white; border: none; cursor: pointer;">Друк</button>
                </div>
            </body>
        </html>
    `);
		newWindow.document.close();
	};

	//Функції для "Використані матеріали" (usedMaterials)

	const handleExportUsedMaterialsToCSV = (usedMaterials, stock, userName) => {
		const entries = Object.entries(usedMaterials || {}).filter(([_, qty]) => qty > 0);

		if (entries.length === 0) {
			alert("Немає даних для експорту");
			return;
		}

		const header = ["Товар", "Використано", "Одиниці"].join(";");
		const rows = entries.map(([id, qty]) => {
			const product = stock.find(p => String(p.id) === String(id));
			const name = product ? product.name.replace(/"/g, '""') : `ID ${id}`;
			const units = product?.units || "";
			return `"${name}";"${qty}";"${units}"`;
		});

		const csvContent = [header, ...rows].join("\n");
		const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement("a");
		// ФОРМУЄМО НАЗВУ ФАЙЛУ З ІМ'ЯМ
		const safeName = (userName || "Report").replace(/\s+/g, '_'); // Замінюємо пробіли на підкреслення
		const dateStr = new Date().toLocaleDateString('uk-UA').replace(/\//g, '.');
		link.setAttribute("href", URL.createObjectURL(blob));
		// Тепер назва буде: UsedMaterials_userName_xx.xx.xxxx.csv
		link.setAttribute("download", `UsedMaterials_${safeName}_${dateStr}.csv`);
		link.click();
	};

	const handlePrintUsedMaterials = (usedMaterials, stock, userName) => {
		const currentDate = new Date().toLocaleString('uk-UA');

		// Перетворюємо об'єкт {103: 817, ...} у масив рядків таблиці
		const tableRowsHtml = Object.entries(usedMaterials || {})
			.filter(([_, qty]) => qty > 0) // Ігноруємо нулі (як ID 108)
			.map(([id, qty]) => {
				// Шукаємо товар у стоці за ID
				const product = stock.find(p => String(p.id) === String(id));
				const name = product ? product.name : `Товар ID: ${id}`;
				const units = product?.units || "";

				return `
                <tr>
                    <td>${name}</td>
                    <td style="text-align: right;">${qty} ${units}</td>
                </tr>
            `;
			}).join('');

		if (!tableRowsHtml) {
			alert("Немає даних для друку");
			return;
		}

		renderPrintWindow(`Використані матеріали: ${userName}`, tableRowsHtml, currentDate);
	};

	// --- ВИДАЛЕННЯ --- Тут та сама логіка: видаляємо один вузол, але перераховуємо суми в усіх інших.
	const deleteHistoryItem = async (log) => {
		// 1. Форматуємо дату для запитання

		const formattedDate = new Date(log.createdAt).toLocaleString('uk-UA');
		const currentValue = log.currentValue;

		// 2. Виводимо підтвердження з датою
		if (!window.confirm(`Видалити цей запис ${formattedDate} де сумарно ${currentValue}?`)) return;

		const logId = log.id; // Дістаємо ID для подальшої роботи

		try {
			// 1. Видаляємо в Firebase
			await firebase.database().ref(`usedMaterialsHistory/${selectedUser}/${historyModal.productId}/${logId}`).remove();

			// 2. Перераховуємо локально
			const updatedRaw = historyModal.data.filter(item => item.id !== logId);
			const finalData = recalculateWithTime(updatedRaw);

			const updates = {};
			let finalTotal = finalData.length > 0 ? finalData[0].cumulativeSum : 0;

			// Оновлюємо currentValue для залишків історії в БД
			finalData.forEach(item => {
				updates[`usedMaterialsHistory/${selectedUser}/${historyModal.productId}/${item.id}/currentValue`] = item.cumulativeSum;
			});
			updates[`usedMaterials/${selectedUser}/${historyModal.productId}`] = finalTotal;

			await firebase.database().ref().update(updates);

			// 3. ОНОВЛЕННЯ REDUX (для головної таблиці)
			dispatch(updateUsedMaterialLocal(selectedUser, historyModal.productId, finalTotal));

			setHistoryModal(prev => ({ ...prev, data: finalData }));
		} catch (e) {
			console.error("Помилка видалення:", e);
		}
	};

	// Всередині UsedMaterialsTable
	useEffect(() => {
		// Як тільки таблиця з'явилася (mount) після зміни ключа - фокусуємося
		inputRef.current?.focus();
	}, []); // Порожній масив означає "виконати один раз при створенні"

	// 1. Знаходимо ім'я клієнта (працівника) за його ID
	const selectedCustomerObj = customers?.find(c => String(c.id) === String(selectedUser));
	const finalName = selectedCustomerObj ? selectedCustomerObj.name : "Report";

	return (
		<div className={classes.usedMaterialsSection} style={{ marginTop: '40px', borderTop: '5px solid #17a2b8', paddingTop: '20px' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<h3 className={classes.sectionTitle}>
					🛠 Використані матеріали {finalName}
					{archiveStatus}
				</h3>

				{/* Кнопка видима тільки якщо адмін має повний доступ */}
				{isAdminFullAccess && (
					<button
						disabled={isArchiveMode} // Блокуємо кнопку в архіві
						onClick={() => {
							setIsEditingIds(!isEditingIds);
							setNewIdsString(dynamicProductIds.join(', '));
						}}
						style={{
							fontSize: '12px',
							padding: '5px 10px',
							cursor: isArchiveMode ? 'not-allowed' : 'pointer',
							background: isArchiveMode ? '#6c757d' : '#28a745', // Сірий колір в архіві
							opacity: isArchiveMode ? 0.6 : 1,
							border: 'none',
							color: 'white',
							borderRadius: '4px'
						}}
					>
						{isArchiveMode
							? "🔒 Налаштування недоступні (Архів)"
							: (isEditingIds ? "✖ Закрити налаштування" : "⚙ Налаштувати список ID")}
					</button>
				)}
			</div>

			{/* Блок редагування */}
			{isEditingIds && !isArchiveMode && ( // Додаткова перевірка !isArchiveMode для безпеки
				<div style={{ marginBottom: '15px', padding: '15px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '8px' }}>
					<p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>🔧 Редагування списку ID товарів (через кому):</p>
					<textarea
						value={newIdsString}
						onChange={(e) => setNewIdsString(e.target.value)}
						style={{ width: '100%', minHeight: '60px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
					/>
					<button
						onClick={handleSaveIds}
						className={classes.btnAdd}
						style={{ marginTop: '10px', width: 'auto', background: '#28a745', borderColor: '#28a745' }}
					>
						💾 Зберегти зміни в Firebase
					</button>
				</div>
			)}

			<div className={classes.ga_wrapper}>
				<div className={classes.ga_userHeaderBlock}>
					<div className={classes.ga_nameDisplay}>
						👤 Працюємо з: <strong>{displayUserName}</strong>
					</div>
					<div className={classes.ga_inputGroup}>
						<label style={{ fontWeight: 'bold', color: '#2d3748' }}>📄 Загальна угода:</label>
						<input
							ref={inputRef}
							type="text"
							placeholder="Номер для всіх товарів..."
							value={commonAgreement}
							onChange={(e) => setCommonAgreement(e.target.value)}
							className={classes.ga_inputField}
						/>
					</div>
				</div>

				<div className={classes.ga_searchBlock}>
					<label style={{ fontWeight: 'bold', color: '#2d3748' }}>🔍 Перевірка угоди:</label>
					<div className={classes.ga_searchRow}>
						<input
							type="text"
							placeholder="Введіть № угоди..."
							value={searchAgreement}
							onChange={(e) => setSearchAgreement(e.target.value)}
							className={classes.ga_inputField}
							style={{ flex: '2' }}
						/>
						<button onClick={handleSearchByAgreement} className={`${classes.ga_btnBase} ${classes.ga_btnSearch}`}>
							Знайти товари
						</button>
					</div>
				</div>

				<div className={classes.ga_rowLayout}>
					<button
						onClick={() => {
							console.log("DEBUG: Звіт по всіх угодах для:", finalName);
							handlePrintAllAgreementsReport();
						}}
						className={`${classes.ga_btnBase} ${classes.ga_btnGrey}`}
					>
						📋 Звіт по всіх угодах {finalName}
					</button>

					<button
						onClick={() => {
							console.log("DEBUG: Звіт по історії для:", finalName);
							handlePrintFullHistoryReport();
						}}
						className={`${classes.ga_btnBase} ${classes.ga_btnInfo}`}
					>
						📜 Звіт по всій історії списань {finalName}
					</button>
				</div>

				<div className={classes.ga_rowLayout}>
					<button className={`${classes.ga_btnBase} ${classes.ga_btnBlue}`} onClick={(e) => { e.stopPropagation(); handlePrintUsedMaterials(usedMaterials, stock, finalName); }}>
						🖨️ Друк Використані матеріали ${finalName}
					</button>
					<button className={`${classes.ga_btnBase} ${classes.ga_btnGreen}`} onClick={(e) => { e.stopPropagation(); handleExportUsedMaterialsToCSV(usedMaterials, stock, finalName); }}>
						📥 Експорт Excel (CSV) Використані матеріали ${finalName}
					</button>
				</div>

				<button className={classes.ga_btnToggle} onClick={onToggle}>
					<span>
						{isVisible
							? `▲ Згорнути таблицю Використані матеріали ${finalName}`
							: `▼ Розгорнути таблицю Використані матеріали ${finalName}`
						}
					</span>
					<span>{isVisible ? '▲' : '▼'}</span>
				</button>
			</div>

			{isVisible && (
				<table className={`${classes.table} ${classes.usedMaterials}`}>
					<thead>
						<tr className={classes.desktopHeader}>
							<th style={{ width: "35%", textAlign: "left" }}>Товар</th>
							<th style={{ width: "65%", textAlign: "center" }}>Управління</th>
						</tr>
					</thead>
					<tbody>
						{fullMaterialsList
							.slice()
							.sort((a, b) => a.name.localeCompare(b.name))
							.filter((item) => {
								const isAdmin = isAdminUsedMaterials || isAdminFullAccess;
								if (isAdmin) return true; // Адмін бачить все

								const valueInRedux = usedMaterials?.[item.productId] ?? 0;
								const summaryItem = combinedSummary?.find(s => s.productId === item.productId);
								const returned = summaryItem?.returned || 0;
								const remains = summaryItem?.remains || 0;

								// Перевіряємо, чи є хоча б одне ненульове значення
								return (
									item.totalQuantity !== 0 ||
									valueInRedux !== 0 ||
									returned !== 0 ||
									remains !== 0
								);
							})
							.map((item) => {
								const { productId, name, totalQuantity, units } = item;
								const valueInRedux = usedMaterials?.[productId] ?? 0;
								const summaryItem = combinedSummary?.find(s => s.productId === productId);
								const returned = summaryItem?.returned || 0;
								// Безпечніший варіант
								const remains = (summaryItem?.remains ?? 0) - valueInRedux;
								const isAdmin = isAdminUsedMaterials || isAdminFullAccess;
								console.log(`DEBUG [${name}]:`, {
									productId,
									isAdmin,
									"Взято (totalQuantity)": totalQuantity,
									"Списано (valueInRedux)": valueInRedux,
									"Знайдено в summary": !!summaryItem, // true або false
									"Повернено": returned,
									"Залишок": remains,
									"Весь summaryItem": summaryItem
								});
								const badgeBoxStyle = {
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: '2px',
									flex: '1',
									minWidth: '65px'
								};

								const badgeBaseStyle = {
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: '100%',
									height: '28px',
									borderRadius: '6px',
									fontSize: '13px',
									fontWeight: 'bold',
									backgroundColor: '#f8f9fa',
									color: '#2c3e50',
									border: '1px solid #dee2e6'
								};

								return (
									<tr key={productId} className={`${classes.productRow} ${isAdmin ? classes.isAdminRow : classes.isUserRow}`} >
										{/* КОЛОНКА 1: НАЗВА */}
										<td className={classes.nameColumn}>
											<div style={{ fontWeight: '600', fontSize: '14px' }}>{name}</div>
											<div style={{ fontSize: '10px', color: '#999' }}>ID: {productId}</div>
										</td>

										{/* КОЛОНКА 2: УПРАВЛІННЯ ТА ПОКАЗНИКИ */}
										<td className={classes.controlColumn}>
											<div className={classes.usedWrapperOuter}>

												{/* СІТКА ПОКАЗНИКІВ */}
												<div className={classes.statsGrid}>
													<div className={classes.statsRow}>
														<div style={badgeBoxStyle}>
															<span style={{ fontSize: '9px', fontWeight: '700', color: '#95a5a6' }}>ВЗЯТО</span>
															<span style={{ ...badgeBaseStyle, backgroundColor: '#eef6fc', color: '#2980b9', borderColor: '#bcdff1' }}>
																{totalQuantity}
															</span>
														</div>
														<div style={badgeBoxStyle}>
															<span style={{ fontSize: '9px', fontWeight: '700', color: '#95a5a6' }}>ПОВЕРНЕНО</span>
															<span style={{ ...badgeBaseStyle, color: '#e74c3c', fontWeight: 'bold' }}>
																{/* Додаємо мінус тільки якщо число більше 0 */}
																{returned > 0 ? `-${returned}` : returned}
															</span>
														</div>
													</div>
													<div className={classes.statsRow}>
														<div style={badgeBoxStyle}>
															<span style={{ fontSize: '9px', fontWeight: '700', color: '#95a5a6' }}>ЗАЛИШОК</span>
															<span style={{
																...badgeBaseStyle,
																backgroundColor: remains < 0 ? '#fdedec' : (remains === 0 ? '#eafaf1' : '#fef5e7'),
																color: remains < 0 ? '#e74c3c' : (remains === 0 ? '#27ae60' : '#d35400'),
																border: `1px solid ${remains < 0 ? '#f5b7b1' : (remains === 0 ? '#2ecc71' : '#f8c471')
																	}`
															}}>
																{remains}
															</span>
														</div>
														<div style={badgeBoxStyle}>
															<span style={{ fontSize: '9px', fontWeight: '700', color: '#95a5a6' }}>СПИСАНО</span>
															<span className={classes.totalBadge} style={{ margin: 0, width: '100%', height: '28px' }}>
																{valueInRedux}
															</span>
														</div>
													</div>
												</div>

												{/* БЛОК КНОПОК ТА ІНПУТІВ */}
												{isAdmin && (
													<div className={classes.adminActions}>
														<input
															type="number"
															placeholder={`К-сть (${units})`}
															className={classes.inputSmall}
															style={{ height: '40px' }} // Висота для мобілки
															value={inputValues[productId] ?? ""}
															onChange={e => setInputValues(prev => ({ ...prev, [productId]: e.target.value }))}
														/>
														<input
															type="text"
															placeholder={commonAgreement || "Угода №"}
															className={classes.inputAgreement}
															style={{ height: '40px' }}
															value={agreementValues[productId] ?? ""}
															onChange={e => setAgreementValues(prev => ({ ...prev, [productId]: e.target.value }))}
														/>

														{/* НОВИЙ ІНПУТ КОМЕНТАР */}
														<input
															type="text"
															placeholder="Коментар..."
															className={classes.inputComment}
															style={{ height: '40px' }}
															value={commentValues?.[productId] ?? ""}
															onChange={e => setCommentValues(prev => ({ ...prev, [productId]: e.target.value }))}
														/>

														<button
															disabled={isArchiveMode}
															className={classes.btnAdd}
															style={{ height: '45px', fontSize: '24px' }}
															onClick={() => handleAddMaterial(productId)}
														>
															+
														</button>

														<div className={classes.buttonGroupRow}>
															<button className={classes.btnUndo} style={{ height: '40px' }} onClick={() => handleUndo(productId)}>↩</button>
															<button className={classes.btnHistory} style={{ height: '40px' }} onClick={() => handleHistory(productId)}>📜</button>
														</div>
													</div>
												)}
											</div>
										</td>
									</tr>
								);
							})}
					</tbody>
				</table>
			)}



			{/* МОДАЛКА ІСТОРІЇ */}
			{historyModal.isOpen && (
				<div style={{
					position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
					background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center',
					backdropFilter: 'blur(5px)'
				}}>
					<div className={classes.modalContentCustom}> {/* Використовуємо клас для падінгів */}
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #17a2b8', paddingBottom: '10px' }}>
							<h3 className={classes.modalTitle} style={{ margin: 0, color: '#17a2b8' }}>
								📜 Редагування історії: {stock.find(m => m.id === historyModal.productId)?.name}
							</h3>
							<button
								onClick={() => { setHistoryModal({ ...historyModal, isOpen: false }); setEditingEntryId(null); }}
								style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#888' }}
							>✕</button>
						</div>

						{/* ОБГОРТКА ДЛЯ СКРОЛУ */}
						<div className={classes.historyTableContainer}>
							<table className={classes.invoiceTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
								<thead>
									<tr style={{ background: '#f8f9fa' }}>
										<th style={{ padding: '12px', textAlign: 'left' }}>Дата</th>
										<th style={{ padding: '12px', textAlign: 'center' }}>Кількість</th>
										<th style={{ padding: '12px', textAlign: 'center', color: '#007bff' }}>Сумарно</th>
										<th style={{ padding: '12px', textAlign: 'left' }}>Угода</th>
										<th style={{ padding: '12px', textAlign: 'left' }}>Коментар</th>
										<th style={{ padding: '12px', textAlign: 'center' }}>Дії</th>
									</tr>
								</thead>
								<tbody>
									{historyModal.data.map((log) => (
										<tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
											{/* Атрибут data-label відповідає за текст зліва на мобілці */}
											<td data-label="Дата" style={{ padding: '10px', fontSize: '14px', whiteSpace: 'nowrap' }}>
												{new Date(log.createdAt).toLocaleString('uk-UA')}
											</td>

											<td data-label="Кількість" style={{ padding: '10px', textAlign: 'center' }}>
												{editingEntryId === log.id ? (
													<input
														type="number"
														id={`edit-val-${log.id}`}
														defaultValue={log.value}
														style={{ width: '70px', padding: '4px', border: '1px solid #17a2b8', borderRadius: '4px' }}
														autoFocus
													/>
												) : (
													<strong style={{ color: '#28a745' }}>{log.value}</strong>
												)}
											</td>

											<td data-label="Сумарно" style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f7ff' }}>
												{log.cumulativeSum}
											</td>

											<td data-label="Угода" style={{ padding: '10px', color: '#666', fontSize: '13px' }}>
												{editingEntryId === log.id ? (
													<input
														type="text"
														id={`edit-agrm-${log.id}`}
														defaultValue={log.agreement || ''}
														placeholder="Номер угоди..."
														style={{
															width: '100px',
															padding: '4px',
															border: '1px solid #17a2b8',
															borderRadius: '4px',
															fontSize: '12px'
														}}
													/>
												) : (
													log.agreement || '—'
												)}
											</td>

											<td data-label="Коментар" style={{ padding: '10px', color: '#666', fontSize: '13px' }}>
												{editingEntryId === log.id ? (
													<input
														id={`edit-comment-${log.id}`}
														type="text"
														defaultValue={log.comment || ''}
														placeholder="Коментар..."
														style={{
															width: '100px',
															padding: '4px',
															border: '1px solid #17a2b8', // Виправити: додаємо фірмовий синій колір
															borderRadius: '4px',         // Виправити: робимо заокруглення
															fontSize: '12px',            // Виправити: вирівнюємо розмір шрифту
															outline: 'none'              // Щоб при натисканні не з'являлася чорна рамка
														}}
													/>
												) : (
													log.comment || '—'
												)}
											</td>

											<td data-label="Дії" className={classes.actionsCell}>
												{editingEntryId === log.id ? (
													<div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
														<button
															className={classes.actionBtn}
															onClick={() => saveEdit(log.id)}
															style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
															title="Зберегти"
														>✅</button>
														<button
															className={classes.actionBtn}
															onClick={() => setEditingEntryId(null)}
															style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
															title="Скасувати"
														>❌</button>
													</div>
												) : (
													<div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
														<button
															disabled={isArchiveMode}
															className={classes.actionBtn}
															onClick={() => setEditingEntryId(log.id)}
															style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
															title="Редагувати"
														>✏️</button>
														<button
															disabled={isArchiveMode}
															className={classes.actionBtn}
															onClick={() => deleteHistoryItem(log)}
															style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, color: '#dc3545' }}
															title="Видалити"
														>🗑️</button>
													</div>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
							<button
								onClick={() => { setHistoryModal({ ...historyModal, isOpen: false }); setEditingEntryId(null); }}
								className={classes.btnAdd}
								style={{ width: 'auto', padding: '10px 30px', backgroundColor: '#6c757d' }}
							>
								Закрити
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const InvoicesPage = ({
	hasAccount, customerName, customerId,
	invoices: rawInvoices, // Перейменували
	invoicesReturn: rawInvoicesReturn = [],
	invoicesSummary: rawInvoicesSummary,
	invoicesSummaryReturn: rawInvoicesSummaryReturn,
	fetchInvoices, fetchInvoicesReturn, fetchInvoicesSummary, fetchInvoicesSummaryReturn,
	customers, notifications: rawNotifications, fetchOrderNotifications, deleteNotification, clearNotifications,
	usedMaterials: rawUsedMaterials, // Перейменували
	usedMaterialsHistory: rawUsedMaterialsHistory, // Перейменували
	remainingMaterials: rawRemainingMaterials,
	remainingMaterialsStart: rawRemainingMaterialsStart,
	fetchRemainingMaterialsStart, // Функція завантаження (для useEffect)
	setRemainingMaterialsStart, // Функція оновлення (для інпутів)
	fetchUsedMaterialsHistoryAction,
	fetchUsedMaterials, addUsedMaterial, archiveAllDataMonthly, stock
}) => {

	const [visibleTables, setVisibleTables] = useState({
		notifications: true,
		orders: true,              // Таблиця "Активні сповіщення"
		totalTakenProduct: true,   // Таблиця "Загальна кількість взятого товару"
		remainingInStock: true,    // Таблиця "Залишок на складі"
		usedMaterials: true,       // Таблиця в UsedMaterialsTable
		crewReport: true           // Таблиця в CrewInventoryReport
	});

	const toggleTable = (tableName) => {
		setVisibleTables(prev => ({
			...prev,
			[tableName]: !prev[tableName]
		}));
	};

	const agreementInputRef = useRef(null);

	const [selectedUser, setSelectedUser] = useState(customerId || '');
	console.log('first_selectedUser', selectedUser)
	// Коментар: НОВЕ: Стейт для збереження вибраного напарника
	const [partnerUser, setPartnerUser] = useState('');
	const [admins, setAdmins] = useState({});


	const [months, setMonths] = useState([]);
	const [selectedMonth, setSelectedMonth] = useState('');
	const [availableSnapshots, setAvailableSnapshots] = useState([]);
	const [selectedSnapshot, setSelectedSnapshot] = useState('');
	const [fullArchive, setFullArchive] = useState(null);
	const [liveDynamicProductIds, setLiveDynamicProductIds] = useState([]); // Сюди підуть ID з Firebase Settings

	const isArchiveMode = !!fullArchive;

	// 1. Інвойси та повернення
	const invoices = useMemo(() => {
		if (isArchiveMode) {
			const archiveAll = fullArchive?.invoicesHistory || {};
			const customerInvoices = archiveAll[selectedUser] || {};
			// Захист: перетворюємо на масив, бо Firebase може повернути об'єкт з ключами "0", "1"...
			return Array.isArray(customerInvoices) ? customerInvoices : Object.values(customerInvoices);
		}
		return rawInvoices || [];
	}, [isArchiveMode, fullArchive, rawInvoices, selectedUser]);

	const invoicesReturn = useMemo(() => {
		if (isArchiveMode) {
			const archiveAll = fullArchive?.invoicesReturnHistory || {};
			const customerData = archiveAll[selectedUser] || {};
			return Array.isArray(customerData) ? customerData : Object.values(customerData);
		}
		return rawInvoicesReturn || [];
	}, [isArchiveMode, fullArchive, rawInvoicesReturn, selectedUser]);

	const invoicesSummary = useMemo(() => {
		if (isArchiveMode) {
			const archiveAll = fullArchive?.invoicesSummaryHistory || {};
			const mainData = archiveAll[selectedUser] || {};
			const partnerData = archiveAll[partnerUser] || {}; // Дані напарника

			// Збираємо всі унікальні ID товарів від обох
			const allPids = new Set([...Object.keys(mainData), ...Object.keys(partnerData)]);

			// Перетворюємо в масив, як ви і робили раніше
			return Array.from(allPids).map(pid => {
				const m = mainData[pid] || {};
				const p = partnerData[pid] || {};

				return {
					// Беремо дані з того об'єкта, де вони є (або з майстра, або з напарника)
					...(m.productId ? m : p),
					productId: m.productId || p.productId || Number(pid),
					// ГОЛОВНЕ: Сумуємо кількість обох працівників
					totalQuantity: Number(m.totalQuantity || 0) + Number(p.totalQuantity || 0)
				};
			});
		}
		return rawInvoicesSummary || [];
	}, [isArchiveMode, fullArchive, rawInvoicesSummary, selectedUser, partnerUser]);

	const invoicesSummaryReturn = useMemo(() => {
		if (isArchiveMode) {
			const archiveAll = fullArchive?.invoicesSummaryReturnHistory || {};
			const mainData = archiveAll[selectedUser] || {};
			const partnerData = archiveAll[partnerUser] || {};

			const allPids = new Set([...Object.keys(mainData), ...Object.keys(partnerData)]);

			return Array.from(allPids).map(pid => {
				const m = mainData[pid] || {};
				const p = partnerData[pid] || {};

				return {
					...(m.productId ? m : p),
					productId: m.productId || p.productId || Number(pid),
					totalQuantity: Number(m.totalQuantity || 0) + Number(p.totalQuantity || 0)
				};
			});
		}
		return rawInvoicesSummaryReturn || [];
	}, [isArchiveMode, fullArchive, rawInvoicesSummaryReturn, selectedUser, partnerUser]);

	// 2. Матеріали та звіти

	const usedMaterials = useMemo(() => {
		if (isArchiveMode) {
			const archiveAll = fullArchive?.usedMaterialsHistory || {};
			const mainUsed = archiveAll[selectedUser] || {};
			const partnerUsed = archiveAll[partnerUser] || {};

			const combined = { ...mainUsed };
			Object.entries(partnerUsed).forEach(([pid, qty]) => {
				combined[pid] = (Number(combined[pid]) || 0) + Number(qty);
			});
			return combined;
		}
		return rawUsedMaterials || {};
	}, [isArchiveMode, fullArchive, rawUsedMaterials, selectedUser, partnerUser]);

	const usedMaterialsHistory = useMemo(() => {
		if (isArchiveMode) {
			// УВАГА: Перевірте назву поля. 
			// Судячи з логів, зараз ви берете fullArchive.usedMaterials (цифри), 
			// а треба брати fullArchive.usedMaterialsHistory (об'єкт з логами).
			const archiveHistoryAll = fullArchive?.usedMaterialsHistoryHistory || {};
			const historyData = archiveHistoryAll[selectedUser] || {};

			if (isArchiveMode) {
				console.log("Archive History Data for user:", historyData);
			}

			return historyData;
		}

		return rawUsedMaterialsHistory || {};
	}, [isArchiveMode, fullArchive, rawUsedMaterialsHistory, selectedUser]);



	const remainingMaterials = useMemo(() => {
		if (isArchiveMode) {
			return fullArchive?.remainingMaterialsHistory?.[selectedUser] || {};
		}
		return rawRemainingMaterials || {};
	}, [isArchiveMode, fullArchive, rawRemainingMaterials, selectedUser]);

	// 3. Склад (stock)
	const currentStock = useMemo(() => {
		// 1. LIVE-режим: без змін
		if (!isArchiveMode) {
			return stock || [];
		}

		// 2. АРХІВНИЙ режим:
		const archiveData = fullArchive?.stockAtThatTime || {};

		// Перетворюємо архів у Map для швидкого пошуку
		const archiveMap = Array.isArray(archiveData)
			? archiveData.reduce((acc, item) => ({ ...acc, [item.id]: item.quantity }), {})
			: archiveData;

		// 3. Обробка списку
		return (stock || [])
			.map(product => {
				const archivedQty = archiveMap[product.id];

				// Перевіряємо, чи існував товар в архіві (чи є ключ в об'єкті)
				const existsInArchive = archivedQty !== undefined;

				return {
					...product,
					// Якщо є в архіві — беремо кількість, якщо ні — ставимо "x"
					quantity: existsInArchive ? archivedQty : "не було"
				};
			});
		// Якщо ви хочете ПОВНІСТЮ приховати ті, що не в архіві, 
		// розкоментуйте рядок нижче:
		// .filter(p => p.quantity !== "не було"); 

	}, [isArchiveMode, fullArchive, stock]); // Переконайся, що fullArchive тут є

	// 4. Початкові залишки (для розрахунків у звіті)
	const remainingMaterialsStart = useMemo(() => {
		if (isArchiveMode) {
			// Беремо початкові залишки з архіву
			return fullArchive?.remainingMaterialsStartHistory?.[selectedUser] || {};
		}
		// Беремо "живі" початкові залишки з Redux
		return rawRemainingMaterialsStart || {};
	}, [isArchiveMode, fullArchive, rawRemainingMaterialsStart, selectedUser]);

	// Створюємо функцію для оновлення залишків у Redux
	const handleUpdateRemainingStart = (pid, value) => {
		const updatedData = {
			...remainingMaterialsStart,
			[pid]: value
		};
		// Викликаємо екшен Redux
		setRemainingMaterialsStart(updatedData);
	};

	// 5. Налаштування (ID товарів для звітів)
	const dynamicProductIds = useMemo(() => {
		if (isArchiveMode) {
			// 1. Беремо ID з налаштувань архіву (якщо вони є)
			const archiveSettings = fullArchive?.settings?.productsForWorkOrders || [];

			// 2. ДОДАТКОВО: Беремо всі ID, які реально є в історії списань цього архіву
			const historyData = fullArchive?.usedMaterialsHistory?.[selectedUser] || {};
			const idsFromHistory = Object.keys(historyData).map(id => Number(id));

			// Об'єднуємо обидва списки і прибираємо дублікати
			const combinedIds = Array.from(new Set([...archiveSettings, ...idsFromHistory]));

			return combinedIds.length > 0 ? combinedIds : [];
		}

		// Live-режим залишається як був
		return liveDynamicProductIds;
	}, [isArchiveMode, fullArchive, liveDynamicProductIds, selectedUser]);



	const idThisCustomers = window.localStorage.getItem("idThisCustomers");

	// Додайте це на початку рендеру (всередині компонента InvoicesPage)
	console.log('--- RENDER CHECK ---');
	console.log('Current selectedUser ID (from state):', selectedUser); // ми використовуємо стан selectedUser
	console.log('Current usedMaterials (from Redux):', usedMaterials); // використовуємо деструктурований пропс

	// Перевіряємо: користувач залогінений ТА має відповідне поле "true" у базі адмінів
	const isAdminInvoices = hasAccount && !!admins[idThisCustomers]?.invoices;
	const isAdminUsedMaterials = hasAccount && !!admins[idThisCustomers]?.usedMaterials;
	const isAdminFullAccess = hasAccount && !!admins[idThisCustomers]?.fullAccess;

	// 6. Сповіщення (Notifications)
	const notifications = useMemo(() => {
		if (isArchiveMode) {
			const rawData = fullArchive?.orderNotificationsHistory || {};

			// Перетворюємо вкладену структуру в плоский масив сповіщень
			const allNotifications = [];

			Object.entries(rawData).forEach(([cId, orders]) => {
				// orders — це об'єкт з замовленнями конкретного клієнта
				Object.values(orders).forEach(order => {
					allNotifications.push({
						...order,
						// На всяк випадок переконуємось, що ID на місці
						customerId: order.customerId || cId,
						orderId: order.orderId || order.id
					});
				});
			});

			// Сортуємо за номером замовлення (від більшого до меншого)
			allNotifications.sort((a, b) => {
				const idA = parseInt(a.orderId || 0);
				const idB = parseInt(b.orderId || 0);
				return idB - idA;
			});

			if (isAdminInvoices) {
				return allNotifications;
			} else {
				return allNotifications.filter(n => String(n.customerId) === String(selectedUser));
			}
		}
		return rawNotifications || [];
	}, [isArchiveMode, fullArchive, rawNotifications, selectedUser, isAdminInvoices]);


	const handleCustomerChange = (e) => {
		const userId = e.target.value;
		setSelectedUser(userId);
		window.localStorage.setItem('idSelectedCustomer', userId);

		// Очищуємо напарника, щоб звіт не показував старий екіпаж
		setPartnerUser('');

	};

	const handleMonthChange = (month) => {
		setSelectedMonth(month);
		setSelectedSnapshot('');
		setFullArchive(null);
		if (!month) {
			setAvailableSnapshots([]);
			return;
		}
		firebase.database().ref(`archive/${month}`).once('value', snapshot => {
			const data = snapshot.val();
			if (data) setAvailableSnapshots(Object.keys(data).sort().reverse());
		});
	};

	const handleSnapshotChange = (snapshotId) => {
		setSelectedSnapshot(snapshotId);
		if (!snapshotId) {
			setFullArchive(null);
			return;
		}
		firebase.database().ref(`archive/${selectedMonth}/${snapshotId}`).once('value', snapshot => {
			setFullArchive(snapshot.val());
		});
	};

	// 1. Завантаження списку доступних місяців з архіву (раз при завантаженні)
	useEffect(() => {
		firebase.database().ref('archive').once('value', snapshot => {
			const data = snapshot.val();
			if (data) setMonths(Object.keys(data).sort().reverse());
		});
	}, []);

	// 2. Налаштування адмінів (працює завжди)
	useEffect(() => {
		const ref = firebase.database().ref('settings/admins');
		ref.on('value', snapshot => { setAdmins(snapshot.val() || {}); });
		return () => ref.off();
	}, []);

	// 3. Синхронізація ID товарів (Live-версія)
	useEffect(() => {
		const ref = firebase.database().ref('settings/productsForWorkOrders');
		const initialList = [104, 123, 121, 122, 120, 119, 103, 124, 118, 117, 125, 132, 126, 108, 116, 112, 109, 114, 113, 115, 110, 111, 130, 129, 131, 128, 150, 153, 152, 151, 149, 148, 147];

		ref.on('value', (snapshot) => {
			if (!snapshot.exists()) {
				ref.set(initialList);
				setLiveDynamicProductIds(initialList); // ЗМІНЕНО НА live...
			} else {
				setLiveDynamicProductIds(snapshot.val() || []); // ЗМІНЕНО НА live...
			}
		});

		return () => ref.off();
	}, []);

	// 4. Ініціалізація вибраного користувача
	useEffect(() => {
		// Коментар: Визначаємо, чи є користувач адміном
		const isAdmin = isAdminFullAccess || isAdminUsedMaterials;

		if (isAdmin) {
			// Коментар: Адміну відновлюємо останнього обраного клієнта з пам'яті
			const savedId = window.localStorage.getItem('idSelectedCustomer');
			if (savedId) {
				setSelectedUser(savedId);
			}
		} else {
			// Коментар: Звичайному користувачу ЗАВЖДИ ставимо його власний ID
			setSelectedUser(idThisCustomers);
			// Коментар: Також оновлюємо localStorage, щоб там був актуальний ID
			window.localStorage.setItem('idSelectedCustomer', idThisCustomers);
		}
	}, [idThisCustomers, isAdminFullAccess, isAdminUsedMaterials]);

	// 5. ОСНОВНЕ ЗАВАНТАЖЕННЯ ДАНИХ (З перевіркою архіву)
	useEffect(() => {
		// ЯКЩО МИ В АРХІВІ — ЗУПИНЯЄМО ЗАВАНТАЖЕННЯ ЖИВИХ ДАНИХ
		if (isArchiveMode) return;

		if (hasAccount && selectedUser) {
			fetchInvoices(selectedUser);
			fetchInvoicesReturn(selectedUser);
			fetchInvoicesSummary(selectedUser);
			fetchInvoicesSummaryReturn(selectedUser);
			fetchOrderNotifications(selectedUser);
			fetchUsedMaterials(selectedUser);
			fetchUsedMaterialsHistoryAction(selectedUser);
		}
	}, [
		selectedUser,
		hasAccount,
		isArchiveMode, // Важливо додати в залежності
		fetchInvoices,
		fetchInvoicesReturn,
		fetchInvoicesSummary,
		fetchInvoicesSummaryReturn,
		fetchOrderNotifications,
		fetchUsedMaterials,
		fetchUsedMaterialsHistoryAction
	]);

	const currentDate = new Date().toLocaleString('uk-UA', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	const handleOrderDetails = async (notification) => {
		const customerId = notification.customerId;
		const orderId = notification.orderId;
		// Перевіряємо, чи це повернення (використовуємо тип зі сповіщення)
		const isReturn = notification.type === 'return';

		console.log("--- ПОЧАТОК ПОШУКУ ЗАМОВЛЕННЯ ---");
		console.log(`Тип: ${isReturn ? 'ПОВЕРНЕННЯ' : 'ПРОДАЖ'}`);
		console.log("Шукаємо для клієнта:", customerId, "Замовлення №:", orderId);

		try {
			// Визначаємо правильний шлях: повернення лежать в invoicesReturn
			const folder = isReturn ? 'invoicesReturn' : 'invoices';
			const path = `${folder}/${customerId}/${orderId}`;

			const snapshot = await firebase.database().ref(path).once('value');
			const orderData = snapshot.val();

			// ЛОГ 1: Весь об'єкт з бази
			console.log(`ДАНІ З FIREBASE (${folder}):`, orderData);

			if (!orderData) {
				console.error("Замовлення не знайдено за шляхом:", path);
				alert(`Замовлення #${orderId} (${isReturn ? 'повернення' : 'продаж'}) не знайдено.`);
				return;
			}

			// 1. Формуємо список товарів (у поверненнях зазвичай 'items', у замовленнях 'cart')
			const items = orderData.items || orderData.cart || [];
			console.log("СПИСОК ТОВАРІВ (items):", items);

			const itemsText = items.map((item, index) => {
				const name = item.name || `Товар ID:${item.productId || item.id}`;
				const itemNote = item.comment ? ` 📝 [Примітка: ${item.comment}]` : '';

				// ЛОГ 2: Перевірка кожного товару на наявність коментаря
				console.log(`Товар #${index} (${name}):`, {
					comment: item.comment,
					hasNote: !!itemNote
				});

				return `• ${name}: ${item.quantity} ${item.units || 'шт.'}${itemNote}`;
			}).join('\n');

			// 2. Формуємо загальний коментар
			const rawComment = orderData.orderComment || orderData.comment || orderData.msg || "";
			console.log("ЗАГАЛЬНИЙ КОМЕНТАР (raw):", rawComment);

			const generalComment = rawComment ? `\n\n💬 КОМЕНТАР: ${rawComment}\n` : '';

			// 3. Пошук імені клієнта
			let clientName = "ID " + customerId;
			try {
				if (typeof customers !== 'undefined') {
					const customer = customers.find(c => String(c.id) === String(customerId));
					if (customer) clientName = customer.name;
				}
			} catch (e) { console.log("Помилка пошуку клієнта в масиві:", e); }

			// 4. Фінальний текст
			const titlePrefix = isReturn ? "ПОВЕРНЕННЯ" : "замовлення";
			const fullMessage = `📦 Деталі ${titlePrefix} #${orderId}\n` +
				`👤 Клієнт: ${clientName}\n` +
				`📅 Дата: ${orderData.date || notification.date}\n` +
				`✅ Статус: ${orderData.status || 'Виконано'}\n` +
				generalComment +
				`--------------------------\n` +
				`${itemsText}`;

			console.log("ФІНАЛЬНИЙ ТЕКСТ ПОВІДОМЛЕННЯ:\n", fullMessage);

			const isPrint = window.confirm(
				"Деталі отримано. Оберіть дію:\n\n" +
				"✅ OK — Швидкий перегляд (Alert)\n" +
				"❌ Скасувати — Відкрити вікно для ДРУКУ"
			);

			if (isPrint) {
				alert(fullMessage);
				return;
			}

			const newWindow = window.open("", "_blank", "width=800,height=750");
			if (newWindow) {
				newWindow.document.write(`
            <html>
                <head>
                    <title>${isReturn ? 'Повернення' : 'Замовлення'} #${orderId}</title>
                    <style>
                        body { padding: 40px; font-family: 'Segoe UI', sans-serif; background: #f0f2f5; color: #333; }
                        .invoice-card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
                        pre { white-space: pre-wrap; font-family: inherit; font-size: 15px; line-height: 1.6; background: #fafafa; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
                        .btn-group { margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end; }
                        button { padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
                        .print-btn { background: #007bff; color: white; }
                        .close-btn { background: #6c757d; color: white; }
                        .header-title { margin-top:0; color:${isReturn ? '#dc3545' : '#007bff'}; }
                    </style>
                </head>
                <body>
                    <div class="invoice-card">
                        <h2 class="header-title">📄 Детальна накладна ${isReturn ? '(Повернення)' : ''}</h2>
                        <pre>${fullMessage}</pre>
                        <div class="btn-group">
                            <button class="print-btn" onclick="window.print()">🖨️ Друк</button>
                            <button class="close-btn" onclick="window.close()">Закрити</button>
                        </div>
                    </div>
                </body>
            </html>
            `);
				newWindow.document.close();
			}

		} catch (error) {
			console.error("КРИТИЧНА ПОМИЛКА В handleOrderDetails:", error);
			alert("Сталася помилка при завантаженні даних.");
		}
	};

	const handlePrintOrderTable = (filteredInvoices, name) => {
		const now = new Date();
		const currentFullDate = now.toLocaleString('uk-UA');

		// Формуємо рядки таблиці
		const tableRowsHtml = filteredInvoices.map((invoice) => {
			const isReturn = invoice.type === 'return';
			// Оскільки в JSON items — це масив, використовуємо його напряму
			const itemsArray = Array.isArray(invoice.items) ? invoice.items : [];
			const orderComment = invoice.orderComment || invoice.comment || "";

			// Розраховуємо rowspan: кількість товарів + 1 (якщо є загальний коментар)
			const totalRows = itemsArray.length + (orderComment ? 1 : 0);

			const itemsHtml = itemsArray.map((item, itemIndex) => {
				const itemNote = item.comment
					? `<div style="color: #d35400; font-size: 11px; margin-top: 2px; font-weight: bold;">📝 ${item.comment}</div>`
					: '';

				// Якщо тип 'return', додаємо мінус до кількості
				const displayQuantity = isReturn ? `-${item.quantity}` : item.quantity;
				const quantityStyle = isReturn ? 'color: red; font-weight: bold;' : '';

				return `
                <tr style="${isReturn ? 'background-color: #fff5f5;' : ''}">
                    ${itemIndex === 0 ? `
                        <td rowspan="${totalRows}" style="vertical-align: top; font-weight: bold; border: 1px solid #999;">
                            ${isReturn ? '<span style="color: red;">↩ </span>' : ''}${invoice.idOrderHistory}
                        </td>` : ''}
                    <td style="border: 1px solid #999;">
                        <div style="font-weight: 500;">${item.name}</div>
                        ${itemNote}
                    </td>
                    <td style="text-align: right; border: 1px solid #999; ${quantityStyle}">
                        ${displayQuantity} ${item.units}
                    </td>
                    ${itemIndex === 0 ? `
                        <td rowspan="${totalRows}" style="vertical-align: top; font-size: 12px; border: 1px solid #999;">
                            ${invoice.date}
                        </td>` : ''}
                </tr>
            `;
			}).join('');

			const commentRowHtml = orderComment
				? `<tr style="${isReturn ? 'background-color: #fff5f5;' : ''}">
                <td colspan="2" style="background-color: #fff9db; color: #856404; font-size: 12px; padding: 5px 8px; border: 1px solid #999;">
                    <b>💬 Коментар:</b> ${orderComment}
                </td>
               </tr>`
				: '';

			return itemsHtml + commentRowHtml;
		}).join('');

		const newWindow = window.open("", "_blank", "width=900,height=800");
		if (newWindow) {
			newWindow.document.write(`
            <html>
                <head>
                    <title>Друк: ${name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #999; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        @media print { tr td { -webkit-print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    <h2>📑 Звіт по замовленням та поверненням</h2>
                    <p>Клієнт: <b>${name}</b></p>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Товар</th>
                                <th style="text-align: right;">Кількість</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
                </body>
            </html>
        `);
			newWindow.document.close();
		}
	};

	const handleExportOrderToCSV = (filteredInvoices, clientName) => {
		if (!filteredInvoices || filteredInvoices.length === 0) return alert("Немає даних");

		const header = ["ID", "Тип", "Товар", "Кількість", "Одиниці", "Дата", "Коментар"].join(";");

		const rows = filteredInvoices.flatMap(invoice => {
			const isReturn = invoice.type === 'return';
			const itemsArray = Array.isArray(invoice.items) ? invoice.items : [];
			const orderComment = (invoice.orderComment || invoice.comment || "").replace(/;/g, ',');

			return itemsArray.map(item => {
				const quantity = isReturn ? `-${item.quantity}` : item.quantity;
				const typeLabel = isReturn ? "Повернення" : "Замовлення";

				return [
					invoice.idOrderHistory,
					typeLabel,
					`"${item.name}"`,
					quantity,
					`"${item.units}"`,
					`"${invoice.date}"`,
					`"${item.comment || orderComment}"`
				].join(";");
			});
		});

		const csvContent = "\uFEFF" + [header, ...rows].join("\n");
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `Orders_${clientName}_${new Date().toLocaleDateString()}.csv`;
		link.click();
	};

	const handlePrintStock = (stockData) => {
		const currentDate = new Date().toLocaleString('uk-UA');
		const filteredStock = (stockData || []).filter(s => !!s.visibleproduct);

		const tableRowsHtml = filteredStock.map((s) => `
				<tr tr >
            <td>${s.name}</td>
            <td style="text-align: right;">${s.quantity} ${s.units}</td>
        </tr >
	`).join('');

		const newWindow = window.open("", "_blank", "width=800,height=600");
		if (newWindow) {
			newWindow.document.write(`
	<html html >
                <head>
                    <title>Залишки на складі:</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .header-info { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #333; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #999; padding: 10px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .footer-date { margin-top: 15px; font-size: 12px; color: #555; text-align: right; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header-info">
                        <h3>📦 Залишки на складі:</h3>
                        <span>Дата: ${currentDate}</span>
                    </div>
                    <table>
                        <thead><tr><th>Назва товару</th><th style="text-align: right;">Кількість</th></tr></thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
                    <p class="footer-date">Звіт сформовано автоматично: ${currentDate}</p>
                    <div class="no-print" style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #fb8c00; color: white; border: none; border-radius: 4px; cursor: pointer;">🖨️ Друкувати</button>
                    </div>
                </body>
            </html >
	`);
			newWindow.document.close();
		}
	};

	const handleExportStockToCSV = (stockData) => {
		if (!stockData || stockData.length === 0) {
			alert("Немає даних для експорту");
			return;
		}

		const header = ["Товар", "Кількість", "Одиниці"].join(";");
		const rows = stockData
			.filter(s => !!s.visibleproduct)
			.map(s => {
				const name = s.name ? s.name.toString().replace(/"/g, '""') : "Без назви";
				return `"${name}";"${s.quantity || 0}";"${s.units || ""}"`;
			});

		const csvContent = [header, ...rows].join("\n");
		const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement("a");
		const dateStr = new Date().toLocaleDateString('uk-UA').replace(/\//g, '.');
		link.setAttribute("href", URL.createObjectURL(blob));
		// Тепер назва буде: Stock_xx.xx.xxxx.csv
		link.setAttribute("download", `Stock_${dateStr}.csv`);
		link.click();
	};

	//Допоміжна функція для друку (щоб не дублювати HTML-код)

	const renderPrintWindow = (title, tableRows, date) => {
		const newWindow = window.open("", "_blank", "width=800,height=600");
		if (!newWindow) return;
		newWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    .header-info { display: flex; justify-content: space-between; border-bottom: 2px solid #333; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #999; padding: 10px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .footer-date { margin-top: 15px; font-size: 12px; text-align: right; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header-info"><h2>${title}</h2><span>${date}</span></div>
                <table>
                    <thead><tr><th>Назва товару</th><th style="text-align: right;">Кількість</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <p class="footer-date">Сформовано: ${date}</p>
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #fb8c00; color: white; border: none; cursor: pointer;">Друк</button>
                </div>
            </body>
        </html>
    `);
		newWindow.document.close();
	};

	//Функції для "Загальна кількість взятих товарів" (invoicesSummary)

	const handleExportInvoicesSummaryToCSV = (combinedSummary, userName) => {
		if (!combinedSummary || combinedSummary.length === 0) {
			return alert("Немає даних для експорту");
		}

		// Оновлений заголовок CSV
		const header = ["Товар", "Взято", "Повернуто", "Залишок", "Одиниці"].join(";");

		const rows = combinedSummary.map(item => {
			const name = item.name ? item.name.toString().replace(/"/g, '""') : "Без назви";
			const taken = item.totalQuantity || 0;
			const returned = item.returned || 0;
			const remains = item.remains || 0;
			const units = item.units || "";

			return `"${name}";"${taken}";"${returned}";"${remains}";"${units}"`;
		});

		const csvContent = "\uFEFF" + [header, ...rows].join("\n");
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement("a");

		const safeName = (userName || "Report").replace(/\s+/g, '_');
		const dateStr = new Date().toLocaleDateString('uk-UA').replace(/\//g, '.');

		link.setAttribute("href", URL.createObjectURL(blob));
		link.setAttribute("download", `Summary_Report_${safeName}_${dateStr}.csv`);
		link.click();
	};

	const handlePrintInvoicesSummary = (combinedSummary, userName) => {
		if (!combinedSummary || combinedSummary.length === 0) {
			alert("Немає даних для друку");
			return;
		}

		const currentDate = new Date().toLocaleString('uk-UA');

		// Формуємо шапку таблиці
		const tableHeaderHtml = `
        <thead>
            <tr>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Товари</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: right;">Взято</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: right;">Поверн.</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: right;">Залишок</th>
            </tr>
        </thead>
    `;

		// Формуємо рядки
		const tableRowsHtml = combinedSummary.map((item) => `
        <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">${item.name || `ID ${item.productId}`}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">
                ${item.totalQuantity} ${item.units}
            </td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: right; color: #e74c3c;">
                ${item.returned > 0 ? `-${item.returned}` : '0'} ${item.units}
            </td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: right; font-weight: bold; color: #27ae60;">
                ${item.remains} ${item.units}
            </td>
        </tr>
    `).join('');

		const fullTableHtml = `<table style="width: 100%; border-collapse: collapse;">${tableHeaderHtml}<tbody>${tableRowsHtml}</tbody></table>`;

		renderPrintWindow(`Звіт по товарах: ${userName}`, fullTableHtml, currentDate);
	};

	const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedUser));
	const finalName = selectedCustomerObj ? selectedCustomerObj.name : "Клієнт";

	const allInvoices = useMemo(() => {
		// Виносимо парсер, щоб не створювати його в циклі сортування
		const getTimestamp = (dateStr) => {
			if (!dateStr || typeof dateStr !== 'string') return 0;
			// Регулярний вираз, який розуміє і "/" і "." як роздільники дати
			const parts = dateStr.match(/(\d{2}):(\d{2}), (\d{2})[./](\d{2})[./](\d{4})/);
			if (!parts) return 0;

			const [, hh, mm, dd, month, yyyy] = parts;
			// Місяці в JS Date починаються з 0 (січень = 0)
			return new Date(yyyy, month - 1, dd, hh, mm).getTime();
		};

		const normal = (Array.isArray(invoices) ? invoices : []).map(inv => ({
			...inv,
			type: 'normal',
			computedId: String(inv.customerId || selectedUser)
		}));

		const returns = (Array.isArray(invoicesReturn) ? invoicesReturn : []).map(inv => ({
			...inv,
			type: 'return',
			computedId: String(inv.customerId || selectedUser)
		}));

		return [...normal, ...returns].sort((a, b) => {
			const timeA = getTimestamp(a.date);
			const timeB = getTimestamp(b.date);
			return timeB - timeA; // Нові замовлення будуть першими
		});
	}, [invoices, invoicesReturn, selectedUser]);

	const combinedSummary = useMemo(() => {
		// 1. Збираємо всі унікальні productId з обох масивів
		const allProductIds = Array.from(new Set([
			...(invoicesSummary || []).map(i => i.productId),
			...(invoicesSummaryReturn || []).map(i => i.productId)
		]));

		// 2. Створюємо карти для швидкого доступу
		const takenMap = (invoicesSummary || []).reduce((acc, item) => {
			acc[item.productId] = item;
			return acc;
		}, {});

		const returnsMap = (invoicesSummaryReturn || []).reduce((acc, item) => {
			acc[item.productId] = item;
			return acc;
		}, {});

		// 3. Будуємо підсумковий масив на основі всіх знайдених ID
		return allProductIds.map(pid => {
			const takenItem = takenMap[pid];
			const returnedItem = returnsMap[pid];

			// Беремо назву та одиниці виміру з того масиву, де вони є
			const name = takenItem?.name || returnedItem?.name || 'Невідомий товар';
			const units = takenItem?.units || returnedItem?.units || '';
			const totalQuantity = takenItem?.totalQuantity || 0;
			const returned = returnedItem?.totalQuantity || 0;

			return {
				productId: pid,
				name: name,
				units: units,
				totalQuantity: totalQuantity,
				returned: returned,
				remains: totalQuantity - returned
			};
		});
	}, [invoicesSummary, invoicesSummaryReturn]);
	console.log("Archive report data:", { invoicesSummary, dynamicProductIds, remainingMaterialsStart })

	console.log('DEBUG: remainingMaterialsStart content:', remainingMaterialsStart);
	// 1. Використовуємо currentStock замість stock. 
	// Він уже містить правильні цифри (112 замість 110), якщо ми в архіві.
	const displayStock = currentStock || [];
	const visibleStock = displayStock.filter(s => !!s.visibleproduct);
	// Визначаємо, що саме показувати як дату
	const displayDate = isArchiveMode && selectedSnapshot
		? selectedSnapshot.replace('_', ' о ') // Якщо архів і вибрано час — форматуємо його
		: new Date().toLocaleDateString('uk-UA'); // Якщо Live — показуємо сьогоднішню дату

	const archiveStatus = (
		<div className={classes.dateText} style={{ display: 'block', width: '100%', marginTop: '8px' }}>
			{isArchiveMode ? (
				<>
					<span style={{
						color: '#ff4d4d',
						fontWeight: '900',
						textShadow: '0.5px 0.5px 2px rgba(255,0,0,0.2)',
						letterSpacing: '0.5px',
						textTransform: 'uppercase'
					}}>Архів</span> від:
				</>
			) : (
				'📅 Дата: '
			)}
			<strong> {displayDate}</strong>
		</div>
	);

	return (
		<div className={classes.wrapper}>
			{isAdminUsedMaterials && (<div style={{
				display: 'flex',
				gap: '15px',
				padding: '20px',
				marginTop: '15px',
				borderRadius: '16px',
				flexWrap: 'wrap',
				alignItems: 'flex-end',
				transition: 'all 0.4s ease',
				// Динамічний фон: Синій для Live, Зелений для Архіву
				background: isArchiveMode
					? 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)' // Тепер сіро-синій в Архіві
					: 'linear-gradient(135deg, #1e5d3b 0%, #27ae60 100%)', // Тепер зелений в Live

				boxShadow: isArchiveMode
					? '0 8px 20px rgba(44, 62, 80, 0.2)' // Тінь для Архіву
					: '0 8px 20px rgba(39, 174, 96, 0.3)', // Тінь для Live
				border: '1px solid rgba(255,255,255,0.1)',
			}}>

				{/* 1. БЛОК ВИБОРУ ОТРИМУВАЧА (Тільки для адміна) */}
				{isAdminInvoices && (
					<div style={{ flex: '1.5', minWidth: '250px' }}>
						<label className={classes.label} style={{
							color: 'rgba(255, 255, 255, 0.9)',
							fontSize: '11px',
							fontWeight: 'bold',
							textTransform: 'uppercase',
							letterSpacing: '0.8px',
							marginBottom: '7px',
							display: 'block'
						}}>
							👤 Виберіть отримувача:
						</label>
						<select
							className={classes.select}
							value={selectedUser}
							onChange={handleCustomerChange}
							style={{
								width: '100%',
								height: '38px',
								borderRadius: '8px',
								border: 'none',
								backgroundColor: 'rgba(255, 255, 255, 0.95)',
								padding: '0 10px',
								fontWeight: '600',
								color: '#2c3e50',
								fontSize: '13px',
								boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
							}}
						>
							<option value="">--Choose customer--</option>
							{customers
								.filter(c => (c.id === 7 || c.id > 127) && c.name !== "Шановний клієнт")
								.map(c => (
									<option key={c.id} value={c.id}>
										{c.name} (id: {c.id})
									</option>
								))
							}
						</select>
					</div>
				)}

				{/* 2. БЛОК МІСЯЦЯ АРХІВУ */}
				<div style={{ flex: 1, minWidth: '160px' }}>
					<label className={classes.label} style={{
						color: 'rgba(255, 255, 255, 0.9)',
						fontSize: '11px',
						fontWeight: 'bold',
						textTransform: 'uppercase',
						letterSpacing: '0.8px',
						marginBottom: '7px',
						display: 'block'
					}}>
						📅 Місяць архіву:
					</label>
					<select
						value={selectedMonth}
						onChange={(e) => handleMonthChange(e.target.value)}
						className={classes.select}
						style={{
							width: '100%',
							height: '38px',
							borderRadius: '8px',
							border: 'none',
							backgroundColor: 'rgba(255, 255, 255, 0.95)',
							padding: '0 10px',
							fontWeight: '600',
							color: '#2c3e50',
							fontSize: '13px',
							boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
						}}
					>
						<option value="">-- Поточні дані (Live) --</option>
						{months.map(m => <option key={m} value={m}>{m}</option>)}
					</select>
				</div>

				{/* 3. БЛОК ТОЧКИ ЗБЕРЕЖЕННЯ */}
				<div style={{ flex: 1, minWidth: '160px' }}>
					<label className={classes.label} style={{
						color: 'rgba(255, 255, 255, 0.9)',
						fontSize: '11px',
						fontWeight: 'bold',
						textTransform: 'uppercase',
						letterSpacing: '0.8px',
						marginBottom: '7px',
						display: 'block'
					}}>
						🕒 Точка збереження:
					</label>
					<select
						value={selectedSnapshot}
						onChange={(e) => handleSnapshotChange(e.target.value)}
						className={classes.select}
						disabled={!availableSnapshots.length}
						style={{
							width: '100%',
							height: '38px',
							borderRadius: '8px',
							border: 'none',
							backgroundColor: availableSnapshots.length ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.5)',
							padding: '0 10px',
							fontWeight: '600',
							color: '#2c3e50',
							fontSize: '13px',
							boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
							cursor: availableSnapshots.length ? 'pointer' : 'not-allowed'
						}}
					>
						<option value="">-- Оберіть час --</option>
						{availableSnapshots.map(s => (
							<option key={s} value={s}>{s.replace('_', ' о ')}</option>
						))}
					</select>
				</div>

				{/* 4. КНОПКА ПОВЕРНЕННЯ */}
				{isArchiveMode && (
					<button
						onClick={() => { setFullArchive(null); setSelectedSnapshot(''); setSelectedMonth(''); }}
						style={{
							height: '38px',
							padding: '0 20px',
							cursor: 'pointer',
							borderRadius: '8px',
							border: 'none',
							backgroundColor: '#ff4757',
							color: '#fff',
							fontWeight: 'bold',
							fontSize: '12px',
							boxShadow: '0 4px 10px rgba(255, 71, 87, 0.3)',
							transition: 'all 0.2s',
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							whiteSpace: 'nowrap'
						}}
						onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
						onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
					>
						Повернутись до Live
					</button>
				)}
			</div>)}
			{isAdminUsedMaterials && notifications.length > 0 && (
				<div className={classes.notificationsBlock} style={{ marginBottom: '20px' }}>
					<button
						className={classes.btnToggle}
						onClick={() => setVisibleTables(prev => ({ ...prev, notifications: !prev.notifications }))}
						style={{
							marginBottom: visibleTables.notifications ? '15px' : '0'
						}}
					>
						<span style={{ display: 'flex', alignItems: 'center' }}>
							{visibleTables.notifications ? (
								<>
									<span className={classes.arrowRed}>▲</span>
									<span>Приховати активні сповіщення</span>
								</>
							) : (
								<>
									<span className={classes.arrowGreen}>▼</span>
									<span>Показати активні сповіщення</span>
								</>
							)}
						</span>
						<span style={{ fontSize: '0.9em', opacity: 0.9, marginLeft: 'auto' }}>
							({notifications.length})
						</span>
					</button>
					{visibleTables.notifications && (
						<div className={classes.notificationsContent}>
							<div className={classes.notificationsHeader}>
								<h3>
									🔔 Підтверджені замовлення / повернення
									{archiveStatus}
								</h3>

								{/* Кнопка "Очистити" з'являється тільки в Live-режимі */}
								{!isArchiveMode && (
									<button
										className={classes.clearBtn}
										onClick={() => { if (window.confirm("Очистити всі?")) clearNotifications(isAdminInvoices ? null : selectedUser); }}
									>
										❌ Очистити всі
									</button>
								)}
							</div>

							<div className={classes.notificationsList}>
								{notifications
									// Додаємо сортування перед рендером
									.sort((a, b) => {
										const idA = parseInt(a.orderId || a.id || 0, 10);
										const idB = parseInt(b.orderId || b.id || 0, 10);
										return idB - idA; // Від більшого до меншого
									})
									.map((n, i) => {
										const isReturn = n.type === 'return';

										// Визначаємо поля (враховуючи різницю між Live та Архівною структурою)
										const orderId = n.orderId || n.id || '---';
										const customerId = n.customerId || n.userId || '---';
										const date = n.date || n.createdAt || '---';

										return (
											<div
												key={`${orderId}_${i}`}
												className={`${classes.notificationItem} ${isReturn ? classes.returnType : ''}`}
											>
												<div
													onClick={() => handleOrderDetails({ ...n, orderId, customerId })}
													style={{ cursor: 'pointer', flex: 1 }}
													title="Натисніть, щоб побачити деталі"
												>
													<strong>
														{isReturn ? '↩️ Повернення' : '📦 Замовлення'} #{orderId}
													</strong>
													<div className={classes.meta}>
														👤 {customerId} ({customers.find(c => String(c.id) === String(customerId))?.name || 'Клієнт'}) | 📅 {date}
													</div>
												</div>

												{/* Кошик з'являється тільки в Live-режимі (як і було) */}
												{!isArchiveMode && (
													<button
														className={classes.deleteBtn}
														onClick={() => { if (window.confirm("Видалити сповіщення?")) deleteNotification(n); }}
													>
														🗑
													</button>
												)}
											</div>
										);
									})}
							</div>
						</div>
					)}
				</div>
			)}

			{selectedUser && (
				<>
					<UsedMaterialsTable
						key={selectedUser} // Коли змінюється ID користувача, компонент перемонтується і всі useState всередині нього скинуться в "" автоматично
						inputRef={agreementInputRef} // Передаємо реф вниз
						selectedUser={selectedUser}
						customers={customers}
						invoicesSummary={invoicesSummary}
						usedMaterials={usedMaterials}
						usedMaterialsHistory={usedMaterialsHistory}
						fetchUsedMaterials={fetchUsedMaterials}
						addUsedMaterial={addUsedMaterial}
						stock={currentStock}
						fetchUsedMaterialsHistoryAction={fetchUsedMaterialsHistoryAction}
						isAdminFullAccess={isAdminFullAccess}
						isAdminInvoices={isAdminInvoices}
						isAdminUsedMaterials={isAdminUsedMaterials}
						dynamicProductIds={dynamicProductIds} // Передаємо "розумну" змінну (з useMemo)
						setLiveDynamicProductIds={setLiveDynamicProductIds} // Передаємо функцію-сеттер
						isArchiveMode={isArchiveMode}
						isVisible={visibleTables.usedMaterials}
						onToggle={() => toggleTable('usedMaterials')}
						archiveStatus={archiveStatus}
						combinedSummary={combinedSummary}
					/>

					{/* Перевірка повного доступу для відображення звіту екіпажу */}
					{isAdminUsedMaterials && selectedUser && (
						<div style={{ marginTop: '30px', padding: '20px', border: '2px solid #17a2b8', borderRadius: '12px', background: '#f8f9fa' }}>
							<label className={classes.label} style={{ color: '#17a2b8', fontWeight: 'bold' }}>
								🤝 Напарник для звіту екіпажу:
							</label>
							<select
								className={classes.select}
								value={partnerUser}
								onChange={e => setPartnerUser(e.target.value)}
								style={{ marginLeft: '10px', width: 'auto' }}
							>
								<option value="">-- Без напарника --</option>
								{customers
									.filter(c => String(c.id) !== String(selectedUser) && (c.id === 7 || c.id > 127))
									.map(c => (
										<option key={c.id} value={c.id}>{c.name} (id = {c.id}) ({c.email})</option>
									))
								}
							</select>

							<CrewInventoryReport
								key={`${selectedUser}-${partnerUser}-${selectedSnapshot}`} // Додали snapshot у key для повного скидання стейту при зміні архіву
								mainWorkerId={selectedUser}
								partnerWorkerId={partnerUser}
								// Передаємо підмінені змінні з useMemo:
								stock={currentStock}
								dynamicProductIds={dynamicProductIds}
								invoices={invoices}
								invoicesReturn={invoicesReturn}
								invoicesSummaryReturn={invoicesSummaryReturn}
								invoicesSummary={invoicesSummary}
								usedMaterials={usedMaterials}
								remainingMaterials={remainingMaterials}
								onUpdateRemainingStart={handleUpdateRemainingStart}
								// Нові пропси для логіки архіву:
								isArchiveMode={isArchiveMode}
								remainingMaterialsStart={remainingMaterialsStart}
								fetchRemainingMaterialsStart={fetchRemainingMaterialsStart}
								customers={customers}
								isVisible={visibleTables.crewReport}
								onToggle={() => toggleTable('crewReport')}
								isAdminFullAccess={isAdminFullAccess}
								isAdminInvoices={isAdminInvoices}
								isAdminUsedMaterials={isAdminUsedMaterials}
								archiveStatus={archiveStatus}
							/>
						</div>
					)}
				</>
			)}



			<h3 className={classes.sectionTitle}>📑 Замовлення / Повернення: ${finalName} {archiveStatus}</h3>
			<div className={classes.headerActions} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
				<button
					className={classes.btnPrint}
					style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: '#f8f9fa' }}
					onClick={(e) => {
						e.stopPropagation();
						// Фільтруємо allInvoices, щоб залишити тільки замовлення обраного користувача
						const filteredData = allInvoices.filter(inv =>
							String(inv.customerId || inv.computedId) === String(selectedUser)
						);
						handlePrintOrderTable(filteredData, finalName);
					}}
				>
					🖨️ Друк таблиці замовлень / повернень ${finalName}
				</button>

				<button
					className={classes.btnExport}
					style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: '#f8f9fa' }}
					onClick={(e) => {
						e.stopPropagation();
						// Аналогічно фільтруємо перед експортом
						const filteredData = allInvoices.filter(inv =>
							String(inv.customerId || inv.computedId) === String(selectedUser)
						);
						handleExportOrderToCSV(filteredData, finalName);
					}}
				>
					📥 Експорт Excel таблиці замовлень / повернень (CSV) ${finalName}
				</button>
			</div>
			<button
				className={classes.btnToggle}
				onClick={() => setVisibleTables(prev => ({ ...prev, orders: !prev.orders }))}
			>
				<span style={{ display: 'flex', alignItems: 'center' }}>
					{visibleTables.orders ? (
						<>
							<span className={classes.arrowRed}>▲</span>
							<span>Згорнути список замовлень / повернень {finalName}</span>
						</>
					) : (
						<>
							<span className={classes.arrowGreen}>▼</span>
							<span>Розгорнути список замовлень / повернень {finalName}</span>
						</>
					)}
				</span>
			</button>

			{/* TABLE: НАКЛАДНІ */}
			{visibleTables.orders && (
				<table
					className={classes.table}
					style={{ cursor: 'pointer' }}
				>
					<thead>
						<tr>
							<th style={{ width: "12%" }}>ID</th>
							<th style={{ width: "48%" }}>Товари</th>
							<th style={{ width: "20%" }} className={classes.alignRight}>Кі-сть</th>
							<th style={{ width: "20%" }}>Дата</th>
						</tr>
					</thead>
					<tbody>
						{(() => {
							const filtered = allInvoices.filter(inv =>
								String(inv.customerId || inv.computedId) === String(selectedUser)
							);

							if (filtered.length === 0) {
								return (
									<tr>
										<td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
											Замовлень не знайдено
										</td>
									</tr>
								);
							}

							return filtered.map((invoice, index) => {
								const isReturn = invoice.type === 'return';
								const itemsArray = Array.isArray(invoice.items)
									? invoice.items
									: (invoice.items ? Object.values(invoice.items) : []);

								const orderComment = invoice.orderComment || invoice.comment || "";
								const rowCount = itemsArray.length; // Кількість рядків з товарами

								return (
									<React.Fragment key={`${invoice.idOrderHistory}-${index}`}>
										{itemsArray.map((item, itemIndex) => {
											const isFirstItem = itemIndex === 0;
											const isLastItem = itemIndex === itemsArray.length - 1;
											const hasNoComment = !orderComment;
											// Лінія розділення внизу останнього товару, якщо немає коментаря
											const isDividerRow = isLastItem && hasNoComment && index !== filtered.length - 1;

											return (
												<tr
													key={`${index}-${itemIndex}`}
													className={`${isDividerRow ? classes.invoiceDivider : ""} ${isReturn ? classes.returnRow : ""}`}
												>
													{/* ID виводимо тільки для першого рядка замовлення */}
													{isFirstItem && (
														<td
															rowSpan={rowCount}
															style={{ fontWeight: 'bold', verticalAlign: 'top' }}
														>
															{isReturn && <span style={{ color: 'red' }}>↩ </span>}
															{invoice.idOrderHistory}
														</td>
													)}

													{/* Товар (завжди) */}
													<td>
														<div style={{ fontWeight: '500' }}>{item.name}</div>
														{item.comment && (
															<div style={{ fontSize: '11px', color: '#d35400', fontWeight: 'bold', marginTop: '2px' }}>
																📝 {item.comment}
															</div>
														)}
													</td>

													{/* Кількість (завжди) */}
													<td className={classes.alignRight}>
														<span style={{ color: isReturn ? 'red' : 'inherit' }}>
															{isReturn ? `-${item.quantity}` : item.quantity}
														</span> {item.units}
													</td>

													{/* Дата виводимо тільки для першого рядка замовлення */}
													{isFirstItem && (
														<td
															rowSpan={rowCount}
															style={{ fontSize: '12px', verticalAlign: 'top' }}
														>
															{invoice.date}
														</td>
													)}
												</tr>
											);
										})}

										{/* Рядок загального коментаря на всю ширину */}
										{orderComment && (
											<tr className={`${index !== filtered.length - 1 ? classes.invoiceDivider : ""} ${isReturn ? classes.returnRow : ""}`}>
												<td colSpan="4" style={{ backgroundColor: '#fff9db', color: '#856404', fontSize: '12px', padding: '6px 10px' }}>
													<b>💬 Коментар:</b> {orderComment}
												</td>
											</tr>
										)}
									</React.Fragment>
								);
							});
						})()}
					</tbody>
				</table>
			)}

			<h3 className={classes.sectionTitle}>📊 Загальна кількість взятих матеріалів: ${finalName} {archiveStatus}</h3>
			<div className={classes.headerActions} style={{ marginBottom: '15px' }}>
				<button
					className={classes.btnPrint}
					onClick={(e) => {
						e.stopPropagation();
						handlePrintInvoicesSummary(combinedSummary, finalName); // Або ваша функція для друку саме цього звіту
					}}
				>
					🖨️ Друк Загальну к-ть матеріалів ${finalName}
				</button>
				<button
					className={classes.btnExport}
					onClick={(e) => {
						e.stopPropagation();
						handleExportInvoicesSummaryToCSV(combinedSummary, finalName);
					}}
				>
					📥 Експорт Excel (CSV) Загальну к-ть матеріалів ${finalName}
				</button>
			</div>
			<button
				className={classes.btnToggle}
				onClick={() => setVisibleTables(prev => ({ ...prev, totalTakenProduct: !prev.totalTakenProduct }))}
			>
				<span style={{ display: 'flex', alignItems: 'center' }}>
					{visibleTables.totalTakenProduct ? (
						<>
							<span className={classes.arrowRed}>▲</span>
							<span>Згорнути загальну кількість використаних матеріалів {finalName}</span>
						</>
					) : (
						<>
							<span className={classes.arrowGreen}>▼</span>
							<span>Розгорнути загальну кількість використаних матеріалів {finalName}</span>
						</>
					)}
				</span>
			</button>
			{visibleTables.totalTakenProduct && (
				<table
					className={classes.table}
					style={{ cursor: 'pointer' }}
				>
					<thead>
						<tr>
							<th>Товари</th>
							<th className={classes.alignRight}>Взято</th>
							<th className={classes.alignRight}>Поверн.</th>
							<th className={classes.alignRight}>Залишок</th>
						</tr>
					</thead>
					<tbody>
						{combinedSummary.map((item, index) => (
							<tr key={item.productId || index}>
								<td>{item.name}</td>
								<td className={classes.alignRight}>
									{item.totalQuantity} {item.units}
								</td>
								<td className={classes.alignRight} style={{ color: '#e74c3c' }}>
									{item.returned > 0 ? `-${item.returned} ${item.units}` : `0 ${item.units}`}
								</td>
								<td className={classes.alignRight} style={{ fontWeight: 'bold', color: '#27ae60' }}>
									{item.remains} {item.units}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{
				isAdminInvoices && stock && (
					<>
						{/* Контейнер заголовка */}
						<div style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '10px',
							marginTop: '20px'
						}}>
							<div className={classes.headerInfo}>
								<h3 style={{ margin: 0 }}>
									📦 {isArchiveMode ? 'Архів залишків' : 'Залишки на складі'}:
									{archiveStatus}
								</h3>

							</div>
						</div>

						<div className={classes.headerActions}>
							<button
								onClick={(e) => {
									e.stopPropagation();
									handlePrintStock(visibleStock);
								}}
								className={classes.btnPrint}
							>
								🖨️ Друк Склад
							</button>

							<button
								onClick={(e) => {
									e.stopPropagation();
									handleExportStockToCSV(visibleStock);
								}}
								className={`${classes.btnExport}`}
							>
								📥 Експорт Excel (CSV) Склад
							</button>
						</div>

						{/* Заголовок-кнопка для згортання */}
						<h3
							onClick={() => toggleTable('remainingInStock')}
							className={classes.tableHeaderToggle}
						>
						</h3>
						<button
							className={classes.btnToggle}
							onClick={() => setVisibleTables(prev => ({ ...prev, remainingInStock: !prev.remainingInStock }))}
						>
							<span style={{ display: 'flex', alignItems: 'center' }}>
								{visibleTables.remainingInStock ? (
									<>
										<span className={classes.arrowRed}>▲</span>
										<span>Приховати залишок на складі</span>
									</>
								) : (
									<>
										<span className={classes.arrowGreen}>▼</span>
										<span>Показати залишок на складі</span>
									</>
								)}
							</span>
						</button>
						{visibleTables.remainingInStock && (
							<table className={classes.table}>
								<thead>
									<tr>
										<th>Товари</th>
										<th className={classes.alignRight}>К-сть</th>
									</tr>
								</thead>
								<tbody>
									{(() => {

										if (visibleStock.length === 0) {
											return (
												<tr>
													<td colSpan="2" style={{ textAlign: 'center' }}>
														Склад порожній
													</td>
												</tr>
											);
										}

										return visibleStock.map((s, index) => (
											<tr key={s.id || index}>
												<td>{s.name}</td>
												<td className={classes.alignRight}>
													{/* Додаємо обгортку для кольору та перевірку */}
													<span style={{
														color: s.quantity === "не було" ? "red" : "inherit",
														fontWeight: s.quantity === "не було" ? "bold" : "normal"
													}}>
														{s.quantity}
													</span>

													{/* Одиниці виміру показуємо ЛИШЕ якщо це число (товар БУВ) */}
													{s.quantity !== "не було" && ` ${s.units}`}
												</td>
											</tr>
										));
									})()}
								</tbody>
							</table>
						)}

					</>
				)
			}

			{
				!isArchiveMode && isAdminFullAccess && (
					<button className={classes.btnArchive} style={{ backgroundColor: '#e74c3c', width: 'auto', marginBottom: '20px', borderColor: '#c0392b' }}
						onClick={() => { if (window.confirm("Створити архів?")) archiveAllDataMonthly(); }}>
						📦 Створити архів за поточний місяць
					</button>
				)
			}
		</div >
	);
};

const mapStateToProps = state => {
	// 1. Спочатку логуємо дані
	console.log('--- FULL INVOICES STATE:', state.invoices);
	console.log('--- FULL PRODUCTS STATE:', state.products);

	// 2. Потім повертаємо об'єкт пропсів
	return {
		hasAccount: state.inform.hasAccount,
		customerName: state.inform.customerName,
		customerId: state.inform.customerId,
		customers: state.inform.customers,
		invoices: state.invoices.invoices,
		invoicesReturn: state.invoices.invoicesReturn,
		invoicesSummary: state.invoices.summary,
		invoicesSummaryReturn: state.invoices.summaryReturn,
		stock: state.products.products,
		notifications: state.invoices.notifications,
		usedMaterials: state.invoices.usedMaterials,
		usedMaterialsHistory: state.invoices.usedMaterialsHistory || {},
		remainingMaterials: state.invoices.remainingMaterials || {},
		remainingMaterialsStart: state.invoices.remainingMaterialsStart || {}

	};
};

export default connect(mapStateToProps, {
	fetchInvoices, fetchInvoicesReturn, fetchInvoicesSummary, fetchInvoicesSummaryReturn, fetchOrderNotifications, deleteNotification, clearNotifications,
	fetchUsedMaterials, addUsedMaterial, fetchUsedMaterialsHistory, fetchUsedMaterialsHistoryAction, archiveAllDataMonthly, fetchRemainingMaterialsStart, setRemainingMaterialsStart
})(InvoicesPage);
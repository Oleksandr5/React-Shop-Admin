import React, { useEffect, useState, useMemo, useRef } from 'react'
import { connect, useDispatch } from 'react-redux'
import { fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications, deleteNotification, clearNotifications, fetchUsedMaterials, addUsedMaterial, fetchUsedMaterialsHistory, archiveAllDataMonthly, updateUsedMaterialLocal } from '../../../redux/actions/invoices'; // шлях до ваших екшенів інвойсів

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
	invoicesSummary
}) => {
	const [combinedData, setCombinedData] = useState({ invoices: {}, used: {} });
	const [realRemaining, setRealRemaining] = useState({});
	const [archiveHistory, setArchiveHistory] = useState({});
	const [hasArchiveInDB, setHasArchiveInDB] = useState(false); // Коментар: Чи існують дані в архіві БД
	const [loading, setLoading] = useState(false);
	const [localArchivedRows, setLocalArchivedRows] = useState({});
	const [editingRow, setEditingRow] = useState(null); // ID рядка, який зараз натиснув користувач

	// Коментар: Функція для пошуку останнього запису в архіві
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

	useEffect(() => {
		const fetchData = async () => {
			if (!mainWorkerId) return;
			setLoading(true);
			const db = firebase.database();
			const ids = [mainWorkerId, partnerWorkerId].filter(id => !!id);

			try {
				const invoicesAcc = {};
				const usedAcc = {};

				await Promise.all(ids.map(async (id) => {
					const invSnap = await db.ref(`invoicesSummary/${id}`).once('value');
					const usedSnap = await db.ref(`usedMaterials/${id}`).once('value');

					const invData = invSnap.val() || {};
					Object.values(invData).forEach(item => {
						invoicesAcc[item.productId] = (invoicesAcc[item.productId] || 0) + Number(item.totalQuantity || 0);
					});

					const usedData = usedSnap.val() || {};
					Object.entries(usedData).forEach(([pid, qty]) => {
						usedAcc[pid] = (usedAcc[pid] || 0) + Number(qty || 0);
					});
				}));

				const histData = await fetchArchiveData(mainWorkerId);
				setCombinedData({ invoices: invoicesAcc, used: usedAcc });
				setArchiveHistory(histData);
			} catch (err) {
				console.error("Error:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
		const remRef = firebase.database().ref(`remainingMaterials/${mainWorkerId}`);
		remRef.on('value', snap => setRealRemaining(snap.val() || {}));
		return () => remRef.off();
	}, [mainWorkerId, partnerWorkerId]);

	// --- НОВА ФУНКЦІЯ АРХІВУВАННЯ ЗАЛИШКІВ/ЗВІТУ ---
	const archiveFullReport = async () => {
		if (!window.confirm("Створити новий незалежний знімок звіту в архіві?")) return;

		try {
			const date = new Date();
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			const timeStamp = `${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;

			const db = firebase.database();

			const reportData = dynamicProductIds.map(pid => {
				const product = stock?.find(s => String(s.id) === String(pid));

				// Важливо: переконайтеся, що ці змінні (archiveHistory, realRemaining) 
				// не undefined на момент виклику
				const prev = Number(archiveHistory?.[pid] || 0);
				const taken = Number(combinedData.invoices?.[pid] || 0);
				const spent = Number(combinedData.used?.[pid] || 0);
				const calc = prev + taken - spent;
				const fact = Number(realRemaining?.[pid] || 0);

				return {
					productId: pid,
					name: product?.name || `ID ${pid}`,
					remainingMaterialsHistory: prev, // Було initial
					added: taken,
					spent: spent,
					calculated: calc,
					remainingMaterials: fact,        // Було actual
					difference: fact - calc
				};
			});

			const getWorkerNameWithId = (id) => {
				const worker = customers?.find(c => String(c.id) === String(id));
				return worker ? `${worker.name} (${id})` : `ID ${id}`;
			};

			const crewNames = partnerWorkerId
				? `${getWorkerNameWithId(mainWorkerId)} / ${getWorkerNameWithId(partnerWorkerId)}`
				: getWorkerNameWithId(mainWorkerId);

			await db.ref(`archiveReports/${monthKey}/${timeStamp}`).set({
				archivedAt: date.toISOString(),
				crew: crewNames,
				mainWorkerId: mainWorkerId,
				reportDetails: reportData
			});

			alert(`✅ Звіт успішно заархівовано!`);
		} catch (error) {
			console.error(error);
			alert("Помилка при створенні архіву: " + error.message);
		}
	};

	// ВСТАВИТИ В InvoicesPage.jsx всередині CrewInventoryReport
	const archiveGlobalReport = async () => {
		// 1. Логуємо вхідні дані, щоб побачити, що зараз є в пам'яті компонента
		console.log("=== ПЕРЕВІРКА ДАНИХ ПЕРЕД АРХІВАЦІЄЮ ===");
		console.log("combinedData:", combinedData);
		console.log("realRemaining:", realRemaining);
		console.log("archiveHistory:", archiveHistory);

		if (!combinedData || (Object.keys(combinedData.invoices).length === 0 && Object.keys(combinedData.used).length === 0)) {
			alert("Помилка: Дані для розрахунку ще не завантажені або таблиця порожня.");
			return;
		}

		if (!window.confirm("Створити архівний знімок для поточного екіпажу?")) return;

		try {
			const date = new Date();
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			const timeStamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;

			const db = firebase.database();
			const allReports = {};

			const activeWorkerIds = [String(mainWorkerId)];
			if (partnerWorkerId) activeWorkerIds.push(String(partnerWorkerId));

			activeWorkerIds.forEach(wId => {
				const worker = customers[wId];
				if (!worker) {
					console.warn(`Працівника з ID ${wId} не знайдено в списку customers`);
					return;
				}

				const reportData = (dynamicProductIds || []).map(pid => {
					const product = stock?.find(s => String(s.id) === String(pid));

					const prev = Number(archiveHistory?.[pid] || 0);
					const taken = Number(combinedData?.invoices?.[pid] || 0);
					const spent = Number(combinedData?.used?.[pid] || 0);
					const fact = Number(realRemaining?.[pid] || 0);
					const calc = prev + taken - spent;

					return {
						productId: pid,
						name: product?.name || `Товар ID ${pid}`,
						units: product?.units || '',
						prev,
						added: taken,
						spent,
						calculated: calc,
						fact,
						diff: fact - calc
					};
				});

				allReports[wId] = {
					workerName: worker.name,
					workerEmail: worker.email || '',
					reportDetails: reportData
				};
			});

			// 2. ФІНАЛЬНИЙ ЛОГ перед відправкою в базу
			console.log("ОБ'ЄКТ ЯКИЙ ЙДЕ В FIREBASE:", {
				path: `archiveReports/${monthKey}/${timeStamp}`,
				data: allReports
			});

			if (Object.keys(allReports).length === 0) {
				console.error("ОБ'ЄКТ allReports ПУСТИЙ. Запис скасовано.");
				return;
			}

			await db.ref(`archiveReports/${monthKey}/${timeStamp}`).set({
				archivedAt: date.toISOString(),
				reports: allReports
			});

			alert(`✅ Архів для ${activeWorkerIds.length} працівників створено! Перевірте консоль.`);
		} catch (error) {
			console.error("ПОМИЛКА ПРИ ЗАПИСУ В БАЗУ:", error);
			alert("Помилка: " + error.message);
		}
	};

	// const archiveGlobalReport = async () => {
	// 	if (!invoicesSummary || !stock) {
	// 		alert("Помилка: Глобальні дані про накладні не завантажені.");
	// 		return;
	// 	}

	// 	if (!window.confirm("Створити архівний знімок для ВСІХ клієнтів з реальними залишками?")) return;

	// 	try {
	// 		const date = new Date();
	// 		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	// 		const timeStamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;

	// 		const db = firebase.database();

	// 		// 1. Завантажуємо дані з ПРАВИЛЬНИХ шляхів
	// 		const [usedSnap, remainsSnap, historySnap] = await Promise.all([
	// 			db.ref('usedMaterialsSummary').once('value'),
	// 			db.ref('remainingMaterials').once('value'), // ВИПРАВЛЕНО ШЛЯХ
	// 			db.ref('inventoryArchive').once('value')     // Шлях для 'prev'
	// 		]);

	// 		const usedDataAll = usedSnap.val() || {};
	// 		const remainsDataAll = remainsSnap.val() || {};
	// 		const historyDataAll = historySnap.val() || {};

	// 		const allReports = {};
	// 		const customersList = Array.isArray(customers) ? customers : Object.values(customers || {});

	// 		const relevantCustomers = customersList.filter(
	// 			c => (Number(c.id) === 7 || Number(c.id) > 127) && c.name !== "Шановний клієнт"
	// 		);

	// 		relevantCustomers.forEach(worker => {
	// 			const wId = String(worker.id);

	// 			const reportData = (dynamicProductIds || []).map(pid => {
	// 				const product = stock?.find(s => String(s.id) === String(pid));
	// 				const pKey = String(pid);

	// 				// Дані з накладних (вже в props)
	// 				const taken = Number(invoicesSummary?.[wId]?.[pKey] || 0);

	// 				// Списано (з usedMaterialsSummary)
	// 				const spent = Number(usedDataAll?.[wId]?.[pKey] || 0);

	// 				// ФАКТ (з remainingMaterials) - ТУТ БУЛИ НУЛІ
	// 				const fact = Number(remainsDataAll?.[wId]?.[pKey] || 0);

	// 				// Попередній залишок (з inventoryArchive)
	// 				const prev = Number(historyDataAll?.[wId]?.[pKey] || 0);

	// 				const calc = prev + taken - spent;

	// 				return {
	// 					productId: pid,
	// 					name: product?.name || `Товар ID ${pid}`,
	// 					units: product?.units || '',
	// 					prev: prev,
	// 					added: taken,
	// 					spent: spent,
	// 					calculated: calc,
	// 					fact: fact,
	// 					diff: fact - calc
	// 				};
	// 			});

	// 			allReports[wId] = {
	// 				workerName: worker.name,
	// 				workerEmail: worker.email || '',
	// 				reportDetails: reportData
	// 			};
	// 		});

	// 		console.log("ПЕРЕВІРКА: ОВ-12 для ID 7 має бути 256. Об'єкт:", allReports["7"]);

	// 		await db.ref(`archiveReports/${monthKey}/${timeStamp}`).set({
	// 			archivedAt: date.toISOString(),
	// 			reports: allReports
	// 		});

	// 		alert(`✅ Глобальний архів створено! Тепер дані для ID 7 та інших мають підтягнутися.`);
	// 	} catch (error) {
	// 		console.error("Помилка:", error);
	// 		alert("Помилка: " + error.message);
	// 	}
	// };

	// Коментар: НОВА ФУНКЦІЯ: Запис введених даних прямо в архів Firebase
	const saveToArchiveDB = async () => {
		if (!window.confirm("Записати ці дані в останній існуючий архів?")) return;

		const db = firebase.database();
		try {
			// 1. Знаходимо останній місяць і останній час
			const arcSnap = await db.ref('archive').orderByKey().limitToLast(1).once('value');
			if (arcSnap.exists()) {
				const months = arcSnap.val();
				const monthKey = Object.keys(months)[0];
				const times = months[monthKey];
				const lastTimeKey = Object.keys(times).sort().reverse()[0];

				// 2. Дописуємо дані прямо в цей існуючий архів
				await db.ref(`archive/${monthKey}/${lastTimeKey}/remainingMaterialsHistory/${mainWorkerId}`).set(archiveHistory);

				setHasArchiveInDB(true);
				alert("✅ Дані додано до існуючого архіву: " + lastTimeKey);
			} else {
				alert("Архівів ще не існує. Спершу створіть загальний архів місяця.");
			}
		} catch (e) {
			alert("Помилка: " + e.message);
		}
	};

	const saveRowToArchiveDB = async (productId, name, currentValue) => {
		try {
			const db = firebase.database();

			// 1. Спочатку знайдемо останній архів (як у першій функції)
			const arcSnap = await db.ref('archive').orderByKey().limitToLast(1).once('value');

			if (arcSnap.exists()) {
				const months = arcSnap.val();
				const monthKey = Object.keys(months)[0];
				const times = months[monthKey];
				const lastTimeKey = Object.keys(times).sort().reverse()[0];

				// 2. Записуємо в ТОЧНО ТАКИЙ ЖЕ шлях:
				// archive / monthKey / lastTimeKey / remainingMaterialsHistory / workerId / productId
				await db.ref(`archive/${monthKey}/${lastTimeKey}/remainingMaterialsHistory/${mainWorkerId}/${productId}`)
					.set(Number(currentValue));

				// Оновлюємо локальний стан, щоб кнопка зникла
				setLocalArchivedRows(prev => ({ ...prev, [productId]: true }));
				setEditingRow(null); // Закриваємо режим редагування (кнопка зникне)
				alert(`Дані по "${name}" додано в існуючий архів.`);
			} else {
				alert("Помилка: Не знайдено жодного створеного архіву.");
			}
		} catch (err) {
			console.error(err);
			alert("Помилка збереження рядка.");
		}
	};

	const handleArchiveInputChange = (pid, value) => {
		setArchiveHistory(prev => ({ ...prev, [pid]: Number(value) }));
	};

	const handleSync = async () => {
		const updates = {};
		dynamicProductIds.forEach(pid => {
			const calc = (Number(archiveHistory[pid]) || 0) + (Number(combinedData.invoices[pid]) || 0) - (Number(combinedData.used[pid]) || 0);
			updates[`/remainingMaterials/${mainWorkerId}/${pid}`] = calc;
		});
		await firebase.database().ref().update(updates);
		alert("✅ Синхронізовано з Факт");
	};

	const handleSyncRow = async (pid) => {
		// 1. Рахуємо значення "Система" для цього конкретного ID
		const prev = Number(archiveHistory[pid] || 0);
		const taken = Number(combinedData.invoices[pid] || 0);
		const spent = Number(combinedData.used[pid] || 0);
		const calc = prev + taken - spent;

		try {
			// 2. Оновлюємо тільки цей один запис у Firebase
			await firebase.database().ref(`remainingMaterials/${mainWorkerId}/${pid}`).set(calc);
			alert(`✅ Товар ID ${pid} синхронізовано!`);
		} catch (e) {
			alert("Помилка: " + e.message);
		}
	};

	const handlePrintReport = () => {
		const currentDate = new Date().toLocaleString('uk-UA');

		// 1. Функція для пошуку імені: повертає "Ім'я (ID)" або просто "ID", якщо не знайдено
		const getWorkerNameWithId = (id) => {
			if (!id) return null;
			// Шукаємо об'єкт користувача в масиві customers
			const worker = customers?.find(c => String(c.id) === String(id));
			return worker ? `${worker.name} (${id})` : `ID ${id}`;
		};

		// 2. Отримуємо відформатовані імена для основного працівника та напарника
		const mainWorkerDisplay = getWorkerNameWithId(mainWorkerId);
		const partnerWorkerDisplay = getWorkerNameWithId(partnerWorkerId);

		// 3. Формуємо підсумковий рядок екіпажу
		const crewNames = partnerWorkerId
			? `${mainWorkerDisplay} / ${partnerWorkerDisplay}`
			: mainWorkerDisplay;

		const tableRowsHtml = dynamicProductIds.map(pid => {
			const product = stock?.find(s => s.id == pid);
			const prev = Number(archiveHistory[pid] || 0);
			const taken = Number(combinedData.invoices[pid] || 0);
			const spent = Number(combinedData.used[pid] || 0);
			const calc = prev + taken - spent;
			const fact = Number(realRemaining[pid] || 0);
			const diff = fact - calc;
			const diffText = diff === 0 ? '✓' : (diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`);

			return `
            <tr>
                <td>${product?.name || `ID ${pid}`}</td>
                <td style="text-align: center;">${prev}</td>
                <td style="text-align: center; color: green;">+${taken}</td>
                <td style="text-align: center; color: red;">-${spent}</td>
                <td style="text-align: center; font-weight: bold;">${calc}</td>
                <td style="text-align: center;">${fact}</td>
                <td style="text-align: center; font-weight: bold;">${diffText}</td>
            </tr>
        `;
		}).join('');

		const newWindow = window.open("", "_blank", "width=900,height=700");
		if (newWindow) {
			newWindow.document.write(`
            <html>
                <head>
                    <title>Звіт — ${crewNames}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        .header { border-bottom: 2px solid #17a2b8; margin-bottom: 20px; padding-bottom: 10px; }
                        .header-top { display: flex; justify-content: space-between; align-items: baseline; }
                        .crew-info { font-size: 16px; margin-top: 10px; color: #2c3e50; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
                        th { background-color: #f1f4f9; text-align: center; }
                        .no-print { display: flex; justify-content: center; gap: 15px; margin-top: 30px; }
                        button { padding: 10px 25px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; }
                        .btn-print { background: #17a2b8; color: white; }
                        .btn-close { background: #6c757d; color: white; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="header-top">
                            <h2 style="margin: 0;">📊 Звіт залишків екіпажу</h2>
                            <span style="font-size: 12px;">Дата: ${currentDate}</span>
                        </div>
                        <div class="crew-info"><strong>👷 Екіпаж:</strong> ${crewNames}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Товар</th>
                                <th>Залишок на початок місяця</th>
                                <th>Взято</th>
                                <th>Списано</th>
                                <th>Порахований залишок</th>
                                <th>Фактичний залишок</th>
                                <th>Різниця</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
                    <div class="no-print">
                        <button class="btn-print" onclick="window.print()">🖨️ Друкувати звіт</button>
                        <button class="btn-close" onclick="window.close()">✖ Закрити</button>
                    </div>
                </body>
            </html>
        `);
			newWindow.document.close();
		}
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
					<h3 className={classes.sectionTitle}>📊 Звіт екіпажу</h3>
					{/* Тепер crewNames визначено і помилки не буде */}
					<div className={classes.crewInfo}>
						<strong>👷 Екіпаж:</strong> {crewNames || "Не обрано"}
					</div>
				</div>

				<div className={classes.topActions}>
					{/* ДОДАНА КНОПКА АРХІВУВАННЯ ЗВІТУ */}
					<button onClick={archiveGlobalReport} className={classes.btnAdd} style={{ background: '#27ae60' }}>
						📸 Створити Глобальний Архів
					</button>
					{!hasArchiveInDB && (
						<button
							onClick={saveToArchiveDB}
							className={classes.btnHistory}
							style={{ background: '#f39c12', color: '#fff' }}
						>
							💾 Записати в архів
						</button>
					)}

					<button
						onClick={() => {
							if (window.confirm("Ви впевнені, що хочете синхронізувати всі дані? Це оновить поточні залишки на основі бази даних.")) {
								handleSync();
							}
						}}
						className={classes.btnHistory}
						style={{ background: '#17a2b8', color: '#fff' }}
					>
						🔄 Синхронізувати
					</button>

					<button
						onClick={handlePrintReport}
						className={classes.btnHistory}
						style={{ background: '#27ae60', color: '#fff' }}
					>
						📥 Друк / Ексель
					</button>
				</div>
			</div>

			<table className={`${classes.table} ${classes.reportTable}`}>
				<thead>
					<tr style={{ fontSize: '11px', backgroundColor: '#f1f4f9' }}>
						<th>Товар</th>
						<th>Залишок на початок місяця {!hasArchiveInDB && "(Введіть дані)"}</th>
						<th>Взято</th>
						<th>Списано</th>
						<th>Порахований залишок</th>
						<th>Фактичний залишок</th>
						<th>Різниця</th>
					</tr>
				</thead>
				<tbody>
					{dynamicProductIds.map(pid => {
						const product = stock?.find(s => s.id == pid);

						const productId = pid;
						const name = product?.name || `ID ${pid}`;
						const isRowArchived = localArchivedRows[pid]; // перевірка зі стану
						const valueInRedux = archiveHistory[pid] || 0; // поточне значення залишку

						const prev = Number(archiveHistory[pid] || 0);
						const taken = Number(combinedData.invoices[pid] || 0);
						const spent = Number(combinedData.used[pid] || 0);
						const calc = prev + taken - spent;
						const fact = Number(realRemaining[pid] || 0);
						const diff = fact - calc;

						return (
							<tr key={pid}>
								<td data-label="Товар" style={{ fontSize: '12px' }}>
									{product?.name || `ID ${pid}`}
								</td>

								<td data-label="Залишок на початок місяця" style={{ textAlign: 'center' }}>
									{!hasArchiveInDB ? (
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
											<input
												type="number"
												value={archiveHistory[pid] || ''}
												// 1. При фокусі встановлюємо, що цей рядок зараз редагується
												onFocus={() => setEditingRow(pid)}
												onChange={(e) => handleArchiveInputChange(pid, e.target.value)}
												className={classes.inputSmall}
												style={{
													width: '50px',
													border: editingRow === pid ? '1px solid #f39c12' : '1px solid #ccc',
													outline: 'none'
												}}
											/>

											{/* 2. Кнопка з'являється ТІЛЬКИ якщо:
               - ми клікнули в цей інпут (editingRow === pid)
               - і цей рядок ще не був успішно збережений (!localArchivedRows[pid])
            */}
											{(editingRow === pid && !localArchivedRows[pid]) && (
												<button
													onClick={() => {
														if (window.confirm(`Заархівувати поточне значення (${archiveHistory[pid] || 0}) для "${name}"?`)) {
															saveRowToArchiveDB(pid, name, archiveHistory[pid] || 0);
														}
													}}
													title="Зберегти лише цей рядок в архів"
													style={{
														background: '#f39c12',
														color: '#fff',
														border: 'none',
														borderRadius: '4px',
														padding: '4px 8px',
														cursor: 'pointer',
														fontSize: '12px',
														marginLeft: '5px',
														verticalAlign: 'middle'
													}}
												>
													💾
												</button>
											)}
										</div>
									) : (
										<span onClick={() => setHasArchiveInDB(false)} style={{ cursor: 'pointer' }}>
											{prev}
										</span>
									)}
								</td>
								<td data-label="Взято" style={{ textAlign: 'center', color: 'green' }}>
									+{taken}
								</td>

								<td data-label="Списано" style={{ textAlign: 'center', color: 'red' }}>
									-{spent}
								</td>

								<td data-label="Порахований залишок" style={{ textAlign: 'center', fontWeight: 'bold' }}>
									{calc}
								</td>

								<td data-label="Фактичний залишок" style={{ textAlign: 'center' }}>
									<input
										type="number"
										value={realRemaining[pid] || ''}
										onChange={async (e) => {
											const val = e.target.value;
											await firebase.database().ref(`remainingMaterials/${mainWorkerId}/${pid}`).set(Number(val));
										}}
										className={classes.inputSmall}
										style={{ width: '50px', border: '1px solid #17a2b8' }}
									/>
								</td>

								<td data-label="Різниця" style={{ textAlign: 'center', fontWeight: 'bold', color: diff > 0 ? 'red' : 'green' }}>
									{diff === 0 ? '✓' : (
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
											<span>{diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`}</span>
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
										</div>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
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
	stock,
	fetchUsedMaterials,
	addUsedMaterial,
	fetchUsedMaterialsHistory,
	isAdminFullAccess,
	dynamicProductIds, // ЗМІНА: тепер отримуємо це як пропс від батька
	setDynamicProductIds
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

	// Отримуємо ім'я (якщо знайшли) або просто показуємо ID
	const displayUserName = userObj ? userObj.name : `Користувач #${selectedUser}`;

	// !!! ВИДАЛЕНО: Тут був useEffect з syncAndFetch та initialList.
	// Тепер за це відповідає InvoicesPage, щоб не було дублювання логіки.

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
	}, [stock, invoicesSummary, dynamicProductIds]);

	const handleSearchByAgreement = async () => {
		const term = searchAgreement.trim();
		if (!term) {
			alert("Введіть номер угоди для пошуку");
			return;
		}

		try {
			const promises = dynamicProductIds.map(productId =>
				fetchUsedMaterialsHistory(selectedUser, productId).then(hist => ({
					productId,
					hist
				}))
			);

			const results = await Promise.all(promises);
			let foundMaterials = [];

			for (const { productId, hist } of results) {
				if (hist && hist.length > 0) {
					const matches = hist.filter(log => String(log.agreement).trim() === term);
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

							// ВИПРАВЛЕНО: Додаємо comment в об'єкт
							foundMaterials.push({
								name: productInfo?.name || `Товар #${productId}`,
								quantity: Number(match.value || 0),
								units: productInfo?.units || '',
								date: date,
								comment: match.comment || "" // Отримуємо коментар
							});
						});
					}
				}
			}

			if (foundMaterials.length === 0) {
				alert(`По угоді №${term} не списано товарів`);
			} else {
				// ВИПРАВЛЕНО: Формуємо текст з урахуванням коментаря (якщо він є)
				const listText = foundMaterials
					.map(m => {
						const commentPart = m.comment ? ` (Прим: ${m.comment})` : "";
						return `• [${m.date}] ${m.name}: ${m.quantity} ${m.units}${commentPart}`;
					})
					.join('\n');

				alert(`📦 Товари списані на угоду №${term}:\n\n${listText}`);
			}
		} catch (err) {
			console.error("Помилка пошуку:", err);
			alert("Помилка при пошуку даних");
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
			try {
				await firebase.database().ref('settings/productsForWorkOrders').set(idsArray);
				setDynamicProductIds(idsArray);
				setIsEditingIds(false);
				alert("Список оновлено!");
			} catch (err) {
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
			// ДОДАЄМО ЦЕ: Очищуємо поле угоди для цього productId
			setAgreementValues(prev => ({ ...prev, [productId]: "" }));
			// добавити: очищуємо поле коментаря після успішного додавання
			setCommentValues(prev => ({ ...prev, [productId]: "" }));
			alert("Дані успішно додано");
		} catch (err) {
			console.error("Помилка додавання:", err);
		}
	};

	// const handleHistory = async (productId) => {
	// 	try {
	// 		const hist = await fetchUsedMaterialsHistory(selectedUser, productId);
	// 		const productInfo = fullMaterialsList.find(s => Number(s.productId) === Number(productId));
	// 		const productName = productInfo?.name || `Товар #${productId}`;
	// 		const units = productInfo?.units || '';

	// 		if (!hist || hist.length === 0) {
	// 			alert(`Історія для "${productName}" порожня.`);
	// 			return;
	// 		}

	// 		const sortedLogs = [...hist].sort((a, b) => a.createdAt - b.createdAt);
	// 		let runningTotal = 0;

	// 		const historyLines = sortedLogs.map(log => {
	// 			const val = Number(log.value || 0);
	// 			runningTotal += val;
	// 			const date = log.createdAt ? new Date(log.createdAt).toLocaleString("uk-UA") : "---";
	// 			return `${date} — Списано: ${val} ${units} (Сумарно: ${runningTotal}) ${log.agreement ? `[Угода: ${log.agreement}]` : ''}`;
	// 		});

	// 		const historyText = historyLines.reverse().join('\n');
	// 		const fullMessage = `📜 Історія списань для: ${productName}\n📊 Всього списано: ${runningTotal} ${units}\n\n${historyText}`;

	// 		if (fullMessage.length > 1000) {
	// 			const newWindow = window.open("", "_blank", "width=700,height=500");
	// 			if (newWindow) {
	// 				newWindow.document.write(`<html><head><title>Історія</title></head><body style="padding:20px; font-family:monospace; background:#f4f4f4;"><pre>${fullMessage}</pre></body></html>`);
	// 				newWindow.document.close();
	// 			} else { alert(fullMessage); }
	// 		} else { alert(fullMessage); }
	// 	} catch (err) { alert("Не вдалося завантажити історію."); }
	// };

	const handleHistory = async (productId) => {
		try {
			const snapshot = await firebase.database().ref(`usedMaterialsHistory/${selectedUser}/${productId}`).once('value');
			const res = snapshot.val() || {};

			// ПЕРЕТВОРЮЄМО ОБ'ЄКТ У МАСИВ З ID
			const historyArray = Object.keys(res).map(key => ({
				id: key, // ОСЬ ТУТ МИ ПРИВ'ЯЗУЄМО КЛЮЧ FIREBASE
				...res[key]
			}));

			// Сортуємо за часом і рахуємо суми
			const finalData = recalculateWithTime(historyArray);

			setHistoryModal({
				isOpen: true,
				productId: productId,
				data: finalData
			});
		} catch (err) {
			console.error("Помилка завантаження:", err);
		}
	};

	const handleUndo = async (productId) => {
		try {
			const hist = await fetchUsedMaterialsHistory(selectedUser, productId);
			const currentTotal = usedMaterials?.[productId] || 0;
			if (!hist || hist.length === 0) return;

			const lastEntry = hist[hist.length - 1];
			const rollbackValue = currentTotal - lastEntry.value;

			if (window.confirm(`Відмінити останню дію (+${lastEntry.value})?`)) {
				await addUsedMaterial(selectedUser, productId, null, null, rollbackValue);
				await fetchUsedMaterials(selectedUser);
			}
		} catch (err) { alert("Помилка при відкаті"); }
	};

	const handlePrintAllAgreementsReport = async () => {
		try {
			// --- БЛОК ВИЗНАЧЕННЯ ІМЕНІ ЕКІПАЖУ ---
			const crewId = selectedUser;
			const workerObj = customers.find(c => String(c.id) === String(crewId));
			const crewDisplayName = workerObj ? `${workerObj.name} (${crewId})` : crewId;

			// --- ПІДГОТОВКА СПИСКУ МАТЕРІАЛІВ ---
			const stockMap = new Map((stock || []).map(s => [Number(s.id), s]));
			const summaryMap = new Map((invoicesSummary || []).map(s => [Number(s.productId), s]));
			const currentFullMaterialsList = dynamicProductIds.map(id => {
				const productFromStock = stockMap.get(Number(id));
				const userInventory = summaryMap.get(Number(id));
				return {
					productId: id,
					name: productFromStock?.name || userInventory?.name || `Товар #${id}`,
					units: productFromStock?.units || userInventory?.units || ''
				};
			});

			// 1. Отримуємо історію для всіх наявних товарів
			const promises = dynamicProductIds.map(productId =>
				fetchUsedMaterialsHistory(crewId, productId).then(hist => ({
					productId,
					hist
				}))
			);

			const results = await Promise.all(promises);

			// 2. Групуємо дані: ключ - номер угоди
			const agreementsMap = {};
			results.forEach(({ productId, hist }) => {
				if (hist && hist.length > 0) {
					const productInfo = currentFullMaterialsList.find(s => Number(s.productId) === Number(productId));
					const name = productInfo?.name || `Товар #${productId}`;
					const units = productInfo?.units || '';

					hist.forEach(log => {
						const agreement = String(log.agreement || "Без угоди").trim();
						if (!agreementsMap[agreement]) {
							agreementsMap[agreement] = [];
						}
						// ВИПРАВЛЕНО: Додаємо поле comment в об'єкт
						agreementsMap[agreement].push({
							name,
							quantity: Number(log.value || 0),
							units,
							comment: log.comment || "", // Беремо коментар з логу
							date: log.createdAt ? new Date(log.createdAt).toLocaleString("uk-UA", { day: '2-digit', month: '2-digit', year: '2-digit' }) : "---"
						});
					});
				}
			});

			// 3. Формуємо HTML
			const currentDate = new Date().toLocaleString('uk-UA');
			let reportHtml = `
        <html>
        <head>
            <title>Звіт по угодах</title>
            <style>
                body { font-family: sans-serif; padding: 20px; line-height: 1.4; }
                .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
                .agreement-section { margin-bottom: 40px; page-break-inside: avoid; }
                .agreement-title { background: #17a2b8; color: white; padding: 10px; font-weight: bold; margin-bottom: 0; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 0; }
                th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
                th { background: #f2f2f2; font-weight: bold; }
                .no-print { text-align: center; margin: 20px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>📋 Повний звіт списань по всіх угодах</h2>
                <p><b>Екіпаж:</b> ${crewDisplayName} | <b>Дата формування:</b> ${currentDate}</p>
            </div>
        `;

			const sortedAgreements = Object.keys(agreementsMap).sort();

			if (sortedAgreements.length > 0) {
				sortedAgreements.forEach(agNum => {
					const items = agreementsMap[agNum];
					reportHtml += `
                <div class="agreement-section">
                    <div class="agreement-title">📄 Угода №: ${agNum}</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 15%">Дата</th>
                                <th style="width: 35%">Товар</th>
                                <th style="width: 15%; text-align: right;">Кількість</th>
                                <th>Примітка</th> </tr>
                        </thead>
                        <tbody>
                            ${items.map(m => `
                                <tr>
                                    <td>${m.date}</td>
                                    <td>${m.name}</td>
                                    <td style="text-align: right;"><b>${m.quantity}</b> ${m.units}</td>
                                    <td>${m.comment}</td> </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `;
				});
			} else {
				reportHtml += "<p style='text-align:center;'>Списань по угодах не знайдено.</p>";
			}

			reportHtml += `
            <div class="no-print">
                <button onclick="window.print()" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">🖨️ Роздрукувати звіт</button>
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
			alert("Не вдалося зібрати загальний звіт.");
		}
	};

	const handlePrintFullHistoryReport = async () => {
		try {

			// --- ДОДАЙТЕ ЦЕЙ БЛОК ДЛЯ ВИЗНАЧЕННЯ ІМЕНІ ---
			const crewId = selectedUser;
			// Шукаємо об'єкт працівника в масиві customers за його ID
			const workerObj = customers.find(c => String(c.id) === String(crewId));
			const crewDisplayName = workerObj ? `${workerObj.name} (${crewId})` : crewId;
			// --------------------------------------------

			const promises = dynamicProductIds.map(productId =>
				fetchUsedMaterialsHistory(selectedUser, productId).then(hist => ({
					productId,
					hist
				}))
			);

			const results = await Promise.all(promises);
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

			results.forEach(({ productId, hist }) => {
				if (hist && hist.length > 0) {
					hasData = true;
					const productInfo = fullMaterialsList.find(s => Number(s.productId) === Number(productId));
					const productName = productInfo?.name || `Товар #${productId}`;
					const units = productInfo?.units || '';

					// Сортуємо від старих до нових для коректного підрахунку суми, 
					// але для виводу потім перевернемо
					const sortedLogs = [...hist].sort((a, b) => a.createdAt - b.createdAt);

					let runningTotal = 0;
					const rowsWithTotal = sortedLogs.map(log => {
						const val = Number(log.value || 0);
						runningTotal += val;
						return {
							...log,
							currentRunningTotal: runningTotal
						};
					}).reverse(); // Відображаємо нові записи зверху

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

			// 5. Закриття режиму редагування в модалці
			setHistoryModal(prev => ({ ...prev, data: finalData }));
			setEditingEntryId(null);

			console.log("%c [SUCCESS] Угода та значення оновлені", "color: #28a745;");
		} catch (e) {
			console.error("Помилка при збереженні:", e);
			alert("Не вдалося зберегти зміни");
		}
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

	return (
		<div className={classes.usedMaterialsSection}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<h3 className={classes.sectionTitle}>🛠 Використані матеріали</h3>
				{/* Кнопка видима тільки якщо адмін має повний доступ */}
				{isAdminFullAccess && (
					<button
						onClick={() => {
							setIsEditingIds(!isEditingIds);
							setNewIdsString(dynamicProductIds.join(', '));
						}}
						style={{ fontSize: '12px', padding: '5px 10px', cursor: 'pointer', background: '#28a745' }}
					>
						{isEditingIds ? "✖ Закрити налаштування" : "⚙ Налаштувати список ID (productsForWorkOrders)"}
					</button>
				)}
			</div>

			{isEditingIds && (
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

			<div className={classes.globalAgreementWrapper} style={{
				marginBottom: '15px',
				padding: '15px',
				background: '#f1f4f9',
				border: '1px solid #cbd5e0',
				borderRadius: '8px',
				display: 'flex',
				flexDirection: 'column', // За замовчуванням стовпчиком (для мобілок)
				gap: '15px'
			}}>
				{/* Блок: Загальна угода */}
				<div style={{
					display: 'flex',
					flexDirection: 'column', // Лейбл над інпутом на мобілці
					gap: '8px'
				}}>
					{/* ВИВІД ІМЕНІ */}
					<div style={{ fontSize: '30px', color: '#FF0000', marginTop: '-5px', marginBottom: '15px' }}>
						👤 Працюємо з: <strong>{displayUserName}</strong>
					</div>
					<label style={{ fontWeight: 'bold', color: '#2d3748' }}>📄 Загальна угода:</label>
					<input
						ref={inputRef}
						type="text"
						placeholder="Номер для всіх товарів..."
						value={commonAgreement}
						onChange={(e) => setCommonAgreement(e.target.value)}
						className={classes.inputAgreement}
						style={{
							width: '100%', // На мобілці на всю ширину
							maxWidth: '300px', // На десктопі не розтягуватиметься надто сильно
							padding: '8px 12px',
							borderRadius: '4px',
							border: '1px solid #ccc',
							boxSizing: 'border-box' // Важливо, щоб padding не додавався до ширини
						}}
					/>
				</div>

				{/* Блок: Перевірка угоди */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '10px',
					background: '#ffffff',
					padding: '12px',
					borderRadius: '6px',
					boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
					border: '1px solid #e2e8f0'
				}}>
					<label style={{ fontWeight: 'bold', color: '#2d3748' }}>🔍 Перевірка угоди:</label>
					<div style={{
						display: 'flex',
						gap: '8px',
						flexWrap: 'wrap' // Якщо кнопка не влізе — вона перенесеться вниз
					}}>
						<input
							type="text"
							placeholder="Введіть № угоди..."
							value={searchAgreement}
							onChange={(e) => setSearchAgreement(e.target.value)}
							className={classes.inputAgreement}
							style={{
								flex: '1', // Інпут забирає весь вільний простір
								minWidth: '140px', // Але не стає меншим за це значення
								padding: '8px',
								borderRadius: '4px',
								border: '1px solid #ccc'
							}}
						/>
						<button
							onClick={handleSearchByAgreement}
							className={classes.btnAdd}
							style={{
								width: 'auto',
								flexGrow: '1', // На дуже малих екранах кнопка теж розтягнеться
								padding: '8px 15px',
								backgroundColor: '#3498db',
								borderColor: '#2980b9',
								fontSize: '14px',
								whiteSpace: 'nowrap'
							}}
						>
							Знайти товари
						</button>
					</div>
				</div>
				<button
					onClick={handlePrintAllAgreementsReport}
					className={classes.btnAdd}
					style={{
						marginTop: '10px',
						backgroundColor: '#6c757d', // Сірий колір, щоб відрізнялася від основної кнопки
						borderColor: '#5a6268',
						width: '100%'
					}}
				>
					📋 Звіт по всіх угодах (Excel/Друк)
				</button>
				<div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
					<button
						onClick={handlePrintFullHistoryReport}
						className={classes.btnHistory}
						style={{
							backgroundColor: '#17a2b8',
							color: 'white',
							padding: '8px 15px',
							display: 'flex',
							alignItems: 'center',
							gap: '8px'
						}}
					>
						📜 Звіт по всій історії списань
					</button>
				</div>
			</div>

			<table className={classes.table}>
				<thead>
					<tr>
						<th style={{ width: "35%", textAlign: "left" }}>Товар</th>
						<th style={{ width: "15%", textAlign: "center" }}>Взято</th>
						<th style={{ width: "50%", textAlign: "center" }}>Управління</th>
					</tr>
				</thead>
				<tbody>
					{fullMaterialsList.map((item) => {
						const { productId, name, totalQuantity, units } = item;
						const valueInRedux = usedMaterials?.[productId] ?? 0;

						return (
							<tr key={productId}>
								<td style={{ verticalAlign: "middle" }}>{name}</td>
								<td style={{ textAlign: "center", fontWeight: "bold", color: "#555" }}>
									{totalQuantity} {units}
								</td>
								<td style={{ verticalAlign: "middle" }}>
									<div className={classes.usedWrapper} style={{ justifyContent: "center" }}>
										<span className={classes.totalBadge}>{valueInRedux}</span>
										<input
											type="number"
											value={inputValues[productId] ?? ""}
											onChange={e => setInputValues(prev => ({ ...prev, [productId]: e.target.value }))}
											className={classes.inputSmall}
											placeholder="К-сть"
										/>
										<input
											type="text"
											placeholder={commonAgreement || "Угода №"}
											value={agreementValues[productId] ?? ""}
											onChange={e => setAgreementValues(prev => ({ ...prev, [productId]: e.target.value }))}
											className={classes.inputAgreement}
										/>
										<input
											type="text"
											placeholder="Коментар..."
											value={commentValues[productId] ?? ""}
											onChange={e => setCommentValues(prev => ({ ...prev, [productId]: e.target.value }))}
											className={classes.inputComment} // Додайте цей клас у CSS (наприклад, width: 120px)											
										/>
										<button className={classes.btnAdd} onClick={() => handleAddMaterial(productId)}>Додати</button>
										<button className={classes.btnUndo} onClick={() => handleUndo(productId)}><span className="undoIcon">↩</span></button>
										<button className={classes.btnHistory} onClick={() => handleHistory(productId)}>📜</button>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
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

											<td data-label="Дії" style={{ padding: '10px', textAlign: 'center' }}>
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
															className={classes.actionBtn}
															onClick={() => setEditingEntryId(log.id)}
															style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
															title="Редагувати"
														>✏️</button>
														<button
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
	hasAccount, customerName, customerId, invoices, invoicesSummary, fetchInvoices, fetchInvoicesSummary,
	customers, notifications, fetchOrderNotifications, deleteNotification, clearNotifications,
	usedMaterials, fetchUsedMaterials, addUsedMaterial, archiveAllDataMonthly, stock
}) => {

	const agreementInputRef = useRef(null);

	const [selectedUser, setSelectedUser] = useState(customerId || '');
	// Коментар: НОВЕ: Стейт для збереження вибраного напарника
	const [partnerUser, setPartnerUser] = useState('');
	const [admins, setAdmins] = useState({});
	// Коментар: НОВЕ: Стейт для списку ID, який тепер спільний для двох таблиць
	const [dynamicProductIds, setDynamicProductIds] = useState([]);

	const idThisCustomers = window.localStorage.getItem("idThisCustomers");

	// Додайте це на початку рендеру (всередині компонента InvoicesPage)
	console.log('--- RENDER CHECK ---');
	console.log('Current selectedUser ID (from state):', selectedUser); // ми використовуємо стан selectedUser
	console.log('Current usedMaterials (from Redux):', usedMaterials); // використовуємо деструктурований пропс

	// Перевіряємо: користувач залогінений ТА має відповідне поле "true" у базі адмінів
	const isAdminInvoices = hasAccount && !!admins[idThisCustomers]?.invoices;
	const isAdminUsedMaterials = hasAccount && !!admins[idThisCustomers]?.usedMaterials;
	const isAdminFullAccess = hasAccount && !!admins[idThisCustomers]?.fullAccess;


	const handleCustomerChange = (e) => {
		const userId = e.target.value;
		setSelectedUser(userId);
		window.localStorage.setItem('idSelectedCustomer', userId);

		// Очищуємо напарника, щоб звіт не показував старий екіпаж
		setPartnerUser('');

	};

	useEffect(() => {
		const ref = firebase.database().ref('settings/admins');
		ref.on('value', snapshot => { setAdmins(snapshot.val() || {}); });
		return () => ref.off();
	}, []);

	// =========================================================================
	// Коментар: ПЕРЕНЕСЕНО СЮДИ: Автоматична синхронізація та завантаження ID товарів
	// Коментар: Цей блок гарантує, що база даних не буде порожньою при першому запуску
	// =========================================================================
	useEffect(() => {
		const ref = firebase.database().ref('settings/productsForWorkOrders');

		// Коментар: Ваш список ID за замовчуванням
		const initialList = [104, 123, 121, 122, 120, 119, 103, 124, 118, 117, 125, 132, 126, 108, 116, 112, 109, 114, 113, 115, 110, 111, 130, 129, 131, 128, 150, 153, 152, 151, 149, 148, 147];

		const syncAndFetch = async () => {
			try {
				// Коментар: Використовуємо .on для відстеження змін адміністратором у реальному часі
				ref.on('value', async (snapshot) => {
					if (!snapshot.exists()) {
						// Коментар: Якщо запису в Firebase немає — створюємо його з initialList
						await ref.set(initialList);
						setDynamicProductIds(initialList);
						console.log("✅ База даних налаштувань створена з початковим списком");
					} else {
						// Коментар: Якщо дані є — оновлюємо стейт
						setDynamicProductIds(snapshot.val() || []);
					}
				});
			} catch (err) { console.error("❌ Firebase Error:", err); }
		};

		syncAndFetch();
		return () => ref.off();
	}, []);

	useEffect(() => {
		const savedId = window.localStorage.getItem('idSelectedCustomer') || idThisCustomers;
		if (savedId) {
			setSelectedUser(savedId);
			window.localStorage.setItem('idSelectedCustomer', savedId);
		}
	}, []);

	useEffect(() => {
		if (hasAccount && selectedUser) {
			fetchInvoices(selectedUser);
			fetchInvoicesSummary(selectedUser);
			fetchOrderNotifications(selectedUser);
		}
	}, [selectedUser, hasAccount]);

	useEffect(() => {
		if (selectedUser) { fetchUsedMaterials(selectedUser); }
	}, [selectedUser]);

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

		console.log("--- ПОЧАТОК ПОШУКУ ЗАМОВЛЕННЯ ---");
		console.log("Шукаємо для клієнта:", customerId, "Замовлення №:", orderId);

		try {
			const path = `invoices/${customerId}/${orderId}`;
			const snapshot = await firebase.database().ref(path).once('value');
			const orderData = snapshot.val();

			// ЛОГ 1: Весь об'єкт з бази
			console.log("ДАНІ З FIREBASE (orderData):", orderData);

			if (!orderData) {
				console.error("Замовлення не знайдено за шляхом:", path);
				alert(`Замовлення #${orderId} не знайдено.`);
				return;
			}

			// 1. Формуємо список товарів
			const items = orderData.cart || orderData.items || [];
			console.log("СПИСОК ТОВАРІВ (items):", items);

			const itemsText = items.map((item, index) => {
				const name = item.name || `Товар ID:${item.id}`;
				const itemNote = item.comment ? ` 📝 [Примітка: ${item.comment}]` : '';

				// ЛОГ 2: Перевірка кожного товару на наявність коментаря
				console.log(`Товар #${index} (${name}):`, {
					comment: item.comment,
					hasNote: !!itemNote
				});

				return `• ${name}: ${item.quantity} ${item.units || 'шт.'}${itemNote}`;
			}).join('\n');

			// 2. Формуємо загальний коментар
			// Перевіряємо всі можливі варіанти назви поля
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
			const fullMessage = `📦 Деталі замовлення #${orderId}\n` +
				`👤 Клієнт: ${clientName}\n` +
				`📅 Дата: ${orderData.date || notification.date}\n` +
				`✅ Статус: ${orderData.status || 'Виконано'}\n` +
				generalComment +
				`--------------------------\n` +
				`${itemsText}`;

			console.log("ФІНАЛЬНИЙ ТЕКСТ ПОВІДОМЛЕННЯ:\n", fullMessage);

			const isPrint = window.confirm(
				"Деталі замовлення отримано. Оберіть дію:\n\n" +
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
                    <title>Замовлення #${orderId}</title>
                    <style>
                        body { padding: 40px; font-family: 'Segoe UI', sans-serif; background: #f0f2f5; color: #333; }
                        .invoice-card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
                        pre { white-space: pre-wrap; font-family: inherit; font-size: 15px; line-height: 1.6; background: #fafafa; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
                        .btn-group { margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end; }
                        button { padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
                        .print-btn { background: #007bff; color: white; }
                        .close-btn { background: #6c757d; color: white; }
                    </style>
                </head>
                <body>
                    <div class="invoice-card">
                        <h2 style="margin-top:0; color:#007bff;">📄 Детальна накладна</h2>
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

	const handlePrintOrderTable = (invoices, name) => {
		const now = new Date();
		const currentFullDate = now.toLocaleString('uk-UA', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit', second: '2-digit'
		});

		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfMonthFormatted = startOfMonth.toLocaleString('uk-UA', {
			day: '2-digit', month: '2-digit', year: 'numeric'
		});

		const periodString = `${startOfMonthFormatted} — ${currentFullDate}`;

		// 2. Формуємо рядки таблиці
		const tableRowsHtml = invoices.map((invoice) => {
			const itemsArray = invoice.items ? Object.entries(invoice.items) : [];
			const orderComment = invoice.orderComment || invoice.comment || "";

			// Розраховуємо rowspan: кількість товарів + 1 (якщо є загальний коментар)
			const totalRows = itemsArray.length + (orderComment ? 1 : 0);

			const itemsHtml = itemsArray.map(([id, item], itemIndex) => {
				// Примітка до товару (📝)
				const itemNote = item.comment
					? `<div style="color: #d35400; font-size: 11px; margin-top: 2px; font-weight: bold;">📝 ${item.comment}</div>`
					: '';

				return `
                <tr>
                    ${itemIndex === 0 ? `<td rowspan="${totalRows}">${invoice.idOrderHistory}</td>` : ''}
                    <td>
                        <div>${item.name}</div>
                        ${itemNote}
                    </td>
                    <td style="text-align: right;">${item.quantity} ${item.units}</td>
                    ${itemIndex === 0 ? `<td rowspan="${totalRows}">${invoice.date}</td>` : ''}
                </tr>
            `;
			}).join('');

			// Рядок загального коментаря (💬)
			const commentRowHtml = orderComment
				? `<tr>
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
                    <title>Друк замовлень: ${name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h2 { text-align: center; margin-bottom: 5px; }
                        .period { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                        
                        /* ВАШІ ОРИГІНАЛЬНІ СТИЛІ ТАБЛИЦІ */
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 13px; }
                        th { background-color: #f2f2f2; }
                        
                        .customer-info { margin-bottom: 10px; font-size: 15px; }
                        .no-print { text-align: center; margin-top: 30px; }
                        button { padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; font-weight: bold; }
                        
                        @media print { 
                            .no-print { display: none; } 
                            /* Щоб колір коментаря друкувався */
                            tr td { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <h2>📑 Звіт по замовленням</h2>
                    <div class="period"><strong>Період:</strong> ${periodString}</div>
                    
                    <div class="customer-info"><strong>Клієнт:</strong> ${name || 'Не вказано'}</div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>ID Замовлення</th>
                                <th>Назва товару</th>
                                <th style="text-align: right;">Кількість</th>
                                <th>Дата замовлення</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>

                    <div style="margin-top: 20px; font-size: 11px; color: #888; text-align: right;">
                        Дата друку: ${currentFullDate}
                    </div>

                    <div class="no-print">
                        <button onclick="window.print()">🖨️ Друкувати звіт</button>
                        <button onclick="window.close()" style="background: #6c757d; margin-left: 10px;">Закрити</button>
                    </div>
                </body>
            </html>
        `);
			newWindow.document.close();
		}
	};

	const handlePrintSummary = (summaryData, name) => {
		// 1. Отримуємо поточну дату та час
		const now = new Date();
		const currentFullDate = now.toLocaleString('uk-UA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		// 2. Формуємо початок місяця (01 число, 00:00:00)
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfMonthFormatted = startOfMonth.toLocaleString('uk-UA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}).replace(/\./g, '.'); // Забезпечуємо правильний формат точок

		const periodString = `${startOfMonthFormatted} — ${currentFullDate}`;

		const tableRowsHtml = summaryData.map((item) => `
        <tr>
            <td>${item.name}</td>
            <td style="text-align: right; font-weight: bold;">${item.totalQuantity} ${item.units}</td>
        </tr>
    `).join('');

		const newWindow = window.open("", "_blank", "width=800,height=600");

		if (newWindow) {
			newWindow.document.write(`
            <html>
                <head>
                    <title>Звіт по товарах: ${name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                        h2 { text-align: center; margin-bottom: 5px; }
                        .period { text-align: center; font-size: 14px; color: #555; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #999; padding: 10px; text-align: left; }
                        th { background-color: #f2f2f2; text-transform: uppercase; font-size: 12px; }
                        .info-row { margin-bottom: 10px; font-size: 15px; }
                        .no-print { text-align: center; margin-top: 30px; }
                        button { padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <h2>📊 Загальна кількість товарів</h2>
                    <div class="period"><strong>Період:</strong> ${periodString}</div>
                    
                    <div class="info-row"><strong>Клієнт:</strong> ${name || 'Не вказано'}</div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Назва товару</th>
                                <th style="text-align: right;">Загальна кількість</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>

                    <div style="margin-top: 20px; font-size: 11px; color: #888; text-align: right;">
                        Документ сформовано: ${currentFullDate}
                    </div>

                    <div class="no-print">
                        <button onclick="window.print()">🖨️ Друкувати звіт</button>
                        <button onclick="window.close()" style="background: #6c757d; margin-left: 10px;">Закрити</button>
                    </div>
                </body>
            </html>
        `);
			newWindow.document.close();
		}
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
                    <title>Залишки на складі</title>
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
                        <h2>📦 Залишки на складі</h2>
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
		link.setAttribute("href", url);
		link.setAttribute("download", `Залишки_складу_${new Date().toLocaleDateString()}.csv`);
		link.click();
	};


	return (
		<div className={classes.wrapper}>
			{isAdminUsedMaterials && notifications.length > 0 && (
				<div className={classes.notificationsBlock}>
					<div className={classes.notificationsHeader}>
						<h3>🔔 Підтверджені замовлення</h3>
						<button className={classes.clearBtn} onClick={() => { if (window.confirm("Очистити всі?")) clearNotifications(isAdminInvoices ? null : selectedUser); }}>❌ Очистити всі</button>
					</div>
					<div className={classes.notificationsList}>
						{notifications.map((n) => (
							<div key={n.orderId} className={classes.notificationItem}>
								<div
									onClick={() => handleOrderDetails(n)}
									style={{ cursor: 'pointer', flex: 1 }}
									title="Натисніть, щоб побачити деталі"
								>
									<strong>Замовлення #{n.orderId}</strong>
									<div className={classes.meta}>👤 {n.customerId} ({customers.find(c => c.id === n.customerId)?.name}) | 📅 {n.date}</div>
								</div>
								<button className={classes.deleteBtn} onClick={() => { if (window.confirm("Видалити?")) deleteNotification(n); }}>🗑</button>
							</div>
						))}
					</div>
				</div>
			)}

			<div className={classes.pageHeader}>
				<h2 className={classes.pageTitle}>🧾 Накладні: {customerName}</h2>
				{isAdminInvoices && (
					<div className={classes.selectWrapper}>
						<label className={classes.label}>👤 Виберіть отримувача:</label>
						<select
							className={classes.select}
							value={selectedUser}
							onChange={handleCustomerChange}
						>
							<option value="">--Choose customer--</option>
							{customers.filter(c => (c.id === 7 || c.id > 127) && c.name !== "Шановний клієнт").map(c => (
								<option key={c.id} value={c.id}>{c.name} ({c.email})</option>
							))}
						</select>
					</div>
				)}
			</div>

			{isAdminUsedMaterials && selectedUser && (
				<>
					<UsedMaterialsTable
						key={selectedUser} // Коли змінюється ID користувача, компонент перемонтується і всі useState всередині нього скинуться в "" автоматично
						inputRef={agreementInputRef} // Передаємо реф вниз
						selectedUser={selectedUser}
						customers={customers}
						invoicesSummary={invoicesSummary}
						usedMaterials={usedMaterials}
						fetchUsedMaterials={fetchUsedMaterials}
						addUsedMaterial={addUsedMaterial}
						stock={stock}
						fetchUsedMaterialsHistory={fetchUsedMaterialsHistory}
						isAdminFullAccess={isAdminFullAccess}
						dynamicProductIds={dynamicProductIds}
						setDynamicProductIds={setDynamicProductIds}
					/>

					{/* Перевірка повного доступу для відображення звіту екіпажу */}
					{isAdminFullAccess && selectedUser && (
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
										<option key={c.id} value={c.id}>{c.name}</option>
									))
								}
							</select>

							<CrewInventoryReport
								key={`${selectedUser}-${partnerUser}`} // Оновлюється при зміні будь-якого учасника
								mainWorkerId={selectedUser}
								partnerWorkerId={partnerUser}
								stock={stock}
								dynamicProductIds={dynamicProductIds}
								customers={customers}
								invoices={invoices}
								invoicesSummary={invoicesSummary}
							/>
						</div>
					)}
				</>
			)}



			<h3 className={classes.sectionTitle}>📑 Замовлення:</h3>

			{/* TABLE: НАКЛАДНІ */}
			<table
				className={classes.table}
				style={{ cursor: 'pointer' }}
				onClick={(e) => {
					e.stopPropagation();
					const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedUser));
					const finalName = selectedCustomerObj ? selectedCustomerObj.name : "Клієнт";
					handlePrintOrderTable(invoices, finalName);
				}}
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
					{invoices.map((invoice, index) => {
						const itemsArray = invoice.items ? Object.entries(invoice.items) : [];
						const orderComment = invoice.orderComment || invoice.comment || "";

						// Розраховуємо rowspan: кількість товарів + 1 (якщо є загальний коментар)
						const totalRows = itemsArray.length + (orderComment ? 1 : 0);

						return (
							<React.Fragment key={`invoice-${index}`}>
								{/* Рядки товарів */}
								{itemsArray.map(([id, item], itemIndex) => {
									const isLastItem = itemIndex === itemsArray.length - 1;
									const hasNoComment = !orderComment;
									// Малюємо лінію розділення, якщо це остання позиція в накладній і немає коментаря під нею
									const isDividerRow = isLastItem && hasNoComment && index !== invoices.length - 1;

									return (
										<tr key={`${index}-${id}`} className={isDividerRow ? classes.invoiceDivider : ""}>
											{itemIndex === 0 && (
												<td rowSpan={totalRows} style={{ verticalAlign: 'top', paddingTop: '10px' }}>
													{invoice.idOrderHistory}
												</td>
											)}
											<td>
												<div style={{ fontWeight: '500' }}>{item.name}</div>
												{item.comment && (
													<div style={{ fontSize: '11px', color: '#d35400', fontWeight: 'bold', marginTop: '2px' }}>
														📝 {item.comment}
													</div>
												)}
											</td>
											<td className={classes.alignRight}>
												{item.quantity} {item.units}
											</td>
											{itemIndex === 0 && (
												<td rowSpan={totalRows} style={{ verticalAlign: 'top', paddingTop: '10px' }}>
													{invoice.date}
												</td>
											)}
										</tr>
									);
								})}

								{/* Рядок загального коментаря (якщо він є) */}
								{orderComment && (
									<tr className={index !== invoices.length - 1 ? classes.invoiceDivider : ""}>
										<td colSpan="2" style={{ backgroundColor: '#fff9db', color: '#856404', fontSize: '12px', padding: '6px 10px' }}>
											<b>💬 Коментар:</b> {orderComment}
										</td>
									</tr>
								)}
							</React.Fragment>
						);
					})}
				</tbody>
			</table>

			<h3 className={classes.sectionTitle}>📊 Загальна кількість взятих товарів:</h3>
			<table
				className={classes.table}
				style={{ cursor: 'pointer' }}
				onClick={(e) => {
					e.stopPropagation();
					// Знаходимо ім'я для заголовка
					const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedUser));
					const finalName = selectedCustomerObj ? selectedCustomerObj.name : "Клієнт";

					handlePrintSummary(invoicesSummary, finalName);
				}}
			>
				<thead><tr><th>Товари</th><th className={classes.alignRight}>Кі-сть</th></tr></thead>
				<tbody>
					{invoicesSummary.map((item, index) => (
						<tr key={index}><td>{item.name}</td><td className={classes.alignRight}>{item.totalQuantity} {item.units}</td></tr>
					))}
				</tbody>
			</table>

			{
				isAdminInvoices && stock && (
					<>
						{/* Контейнер заголовка та кнопки */}
						<div style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '10px',
							marginTop: '20px'
						}}>
							<h3 className={classes.sectionTitle} style={{ margin: 0 }}>
								📦 Залишки на складі:
							</h3>
							<button
								onClick={(e) => {
									e.stopPropagation();
									// Використовуємо ту саму логіку експорту, але для поточного складу
									handleExportStockToCSV(stock);
								}}
								className={classes.btnHistory}
								style={{
									background: '#28a745',
									height: '32px',
									fontSize: '12px',
									padding: '0 12px'
								}}
							>
								📥 Експорт Excel
							</button>
						</div>

						{/* Таблиця */}
						<table
							className={classes.table}
							style={{ cursor: 'pointer' }}
							onClick={(e) => {
								e.stopPropagation();
								handlePrintStock(stock);
							}}
						>
							<thead>
								<tr>
									<th>Товари</th>
									<th className={classes.alignRight}>Кі-сть</th>
								</tr>
							</thead>
							<tbody>
								{stock?.filter(s => !!s.visibleproduct).map((s, index) => (
									<tr key={s.id || index}>
										<td>{s.name}</td>
										<td className={classes.alignRight}>
											{s.quantity} {s.units}
										</td>
									</tr>
								))}
								{stock?.filter(s => !!s.visibleproduct).length === 0 && (
									<tr><td colSpan="2" style={{ textAlign: 'center' }}>Склад порожній</td></tr>
								)}
							</tbody>
						</table>
					</>
				)
			}

			{
				isAdminFullAccess && (
					<button className={classes.btnAdd} style={{ backgroundColor: '#f39c12', width: 'auto', marginBottom: '20px', borderColor: '#e67e22' }}
						onClick={() => { if (window.confirm("Створити архів?")) archiveAllDataMonthly(); }}>
						📦 Створити архів за поточний місяць
					</button>
				)
			}
		</div >
	);
};

const mapStateToProps = state => ({
	hasAccount: state.inform.hasAccount,
	customerName: state.inform.customerName,
	customerId: state.inform.customerId,
	customers: state.inform.customers,
	invoices: state.invoices.invoices,
	invoicesSummary: state.invoices.summary,
	stock: state.products.products,
	notifications: state.invoices.notifications,
	usedMaterials: state.invoices.usedMaterials
});

export default connect(mapStateToProps, {
	fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications, deleteNotification, clearNotifications,
	fetchUsedMaterials, addUsedMaterial, fetchUsedMaterialsHistory, archiveAllDataMonthly
})(InvoicesPage);
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
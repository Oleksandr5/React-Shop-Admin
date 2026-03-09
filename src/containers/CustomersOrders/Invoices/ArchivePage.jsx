import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import firebase from 'firebase/app';
import 'firebase/database';
import classes from './InvoicesPage.module.css';

const ArchivePage = ({ hasAccount, customers, customerId }) => {
	const [months, setMonths] = useState([]);
	const [selectedMonth, setSelectedMonth] = useState('');
	const [availableSnapshots, setAvailableSnapshots] = useState([]); // Списк записів за місяць
	const [selectedSnapshot, setSelectedSnapshot] = useState('');   // Обраний час	
	const [fullArchive, setFullArchive] = useState(null);
	const [searchAgreement, setSearchAgreement] = useState('');

	const [selectedUser, setSelectedUser] = useState(customerId || '');

	const [admins, setAdmins] = useState({});
	const idThisCustomers = window.localStorage.getItem("idThisCustomers");

	useEffect(() => {
		const ref = firebase.database().ref('settings/admins');
		ref.on('value', snapshot => { setAdmins(snapshot.val() || {}); });
		return () => ref.off();
	}, []);

	// Перевіряємо: користувач залогінений ТА має відповідне поле "true" у базі адмінів
	const isAdminInvoices = hasAccount && !!admins[idThisCustomers]?.invoices;
	const isAdminUsedMaterials = hasAccount && !!admins[idThisCustomers]?.usedMaterials;
	const isAdminFullAccess = hasAccount && !!admins[idThisCustomers]?.fullAccess;


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
		if (!term) {
			alert("Введіть номер угоди для пошуку");
			return;
		}
		if (!userData || !userData.historyLog) {
			alert("Дані про історію списань для цього клієнта відсутні в архіві.");
			return;
		}

		let found = [];
		Object.keys(userData.historyLog).forEach(productId => {
			const productLogs = userData.historyLog[productId];
			if (!productLogs) return;

			// Перетворюємо об'єкт логів у масив
			const logsArray = Object.values(productLogs);

			// Фільтруємо за номером угоди
			const matches = logsArray.filter(log =>
				String(log.agreement || '').trim() === term
			);

			if (matches.length > 0) {
				const productInfo = userData.summary.find(s => String(s.productId) === String(productId));
				const totalForThisProduct = matches.reduce((sum, current) =>
					sum + Number(current.value || 0), 0
				);

				const units = productInfo?.units || '';
				const name = productInfo?.name || `Товар #${productId}`;
				found.push(`• ${name}: ${totalForThisProduct} ${units}`);
			}
		});

		if (found.length === 0) {
			alert(`❌ В архіві по угоді №${term} не знайдено списань для цього клієнта.`);
		} else {
			const message = `📋 Списано на угоду №${term}:\n\n${found.join('\n')}`;

			// Якщо список дуже великий, відкриваємо в новому вікні, інакше — alert
			if (message.length > 500) {
				const newWindow = window.open("", "_blank", "width=600,height=400");
				if (newWindow) {
					newWindow.document.write(`
                    <html>
                        <head><title>Угода №${term}</title></head>
                        <body style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
                            <h3 style="border-bottom: 2px solid #17a2b8; padding-bottom: 10px;">📋 Звіт по угоді №${term}</h3>
                            <pre style="font-size: 14px; white-space: pre-wrap;">${message}</pre>
                            <button onclick="window.close()" style="margin-top:20px; padding: 10px; cursor:pointer;">Закрити</button>
                        </body>
                    </html>
                `);
				}
			} else {
				alert(message);
			}
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

	const userData = (fullArchive && selectedUser) ? {
		groupedInvoices: (() => {
			// Використовуємо selectedUser замість userId
			const rawInvoices = fullArchive.invoicesHistory?.[selectedUser];

			if (!rawInvoices) return [];

			// Перетворюємо об'єкт накладних у масив
			return Object.values(rawInvoices)
				.map((inv) => ({
					id: inv.idOrderHistory,
					date: inv.date || (inv.createdAt ? new Date(inv.createdAt).toLocaleString("uk-UA") : '-'),
					orderComment: inv.orderComment || "",
					// Перевірка: якщо це вже масив — лишаємо, якщо об'єкт — перетворюємо
					items: Array.isArray(inv.items) ? inv.items : Object.values(inv.items || {})
				}))
				.sort((a, b) => b.id - a.id);
		})(),

		// Переконайтеся, що ці ключі існують саме в об'єкті snapshot (fullArchive)
		summary: fullArchive.invoicesSummaryHistory?.[selectedUser]
			? Object.values(fullArchive.invoicesSummaryHistory[selectedUser])
			: [],
		historyLog: fullArchive.usedMaterialsHistoryHistory?.[selectedUser] || {},
		used: fullArchive.usedMaterialsHistory?.[selectedUser] || {},

		// ПЕРЕВІРТЕ ЦЕЙ КЛЮЧ у вашій БД (чи він точно stockAtThatTime?)
		stock: fullArchive.stockAtThatTime || fullArchive.stock || {}
	} : null;

	const exportToCsv = (productId, productName) => {
		const productLogsObject = userData.historyLog[productId];
		if (!productLogsObject) return alert("Немає даних");

		const logs = Object.values(productLogsObject);

		// Заголовки стовпців
		let csvContent = "Дата;Товар;Кількість;Угода\n";

		// Додаємо рядки
		logs.forEach(log => {
			const date = log.createdAt ? new Date(log.createdAt).toLocaleString() : '---';
			const val = log.value || 0;
			const agr = log.agreement || '---';
			csvContent += `${date};${productName};${val};${agr}\n`;
		});

		// Створюємо файл "на льоту"
		const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);

		link.setAttribute("href", url);
		link.setAttribute("download", `Archive_${productName}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handlePrintSummary = (summaryData, name) => {
		// 1. Кінцева дата — це час створення архіву (archivedAt) або вибраний snapshot
		const endDate = fullArchive?.archivedAt ? new Date(fullArchive.archivedAt) : new Date();

		const currentFullDate = endDate.toLocaleString('uk-UA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		// 2. Початок місяця на основі дати архіву
		const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
		const startOfMonthFormatted = startOfMonth.toLocaleString('uk-UA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

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
                    h2 { text-align: center; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 10px; }
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
                    Архівний запис від: ${currentFullDate}
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

	const handlePrintMaterials = (summaryData, usedData, name) => {
		const endDate = fullArchive?.archivedAt ? new Date(fullArchive.archivedAt) : new Date();
		const currentFullDate = endDate.toLocaleString('uk-UA');
		const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1).toLocaleString('uk-UA');
		const periodString = `${startOfMonth} — ${currentFullDate}`;

		const tableRowsHtml = summaryData.map((item) => {
			const usedQty = usedData[item.productId] || 0;
			return `
        <tr>
            <td>${item.name}</td>
            <td style="text-align: center;">${item.totalQuantity} ${item.units}</td>
            <td style="text-align: center; font-weight: bold; color: #d9534f;">${usedQty} ${item.units}</td>
        </tr>`;
		}).join('');

		const newWindow = window.open("", "_blank", "width=800,height=600");
		if (newWindow) {
			newWindow.document.write(`
            <html>
                <head>
                    <title>Використані матеріали: ${name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h2 { text-align: center; }
                        .period { text-align: center; font-size: 14px; color: #666; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #999; padding: 8px; text-align: left; }
                        th { background: #f2f2f2; font-size: 12px; }
                        .no-print { text-align: center; margin-top: 20px; }
                        button { padding: 10px 20px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <h2>🛠 Використані матеріали</h2>
                    <div class="period"><strong>Період:</strong> ${periodString}<br><strong>Клієнт:</strong> ${name}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Назва товару</th>
                                <th style="text-align: center;">Взято</th>
                                <th style="text-align: center;">Списано (використано)</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
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

	const handlePrintOrderTable = (invoices, name) => {
		const endDate = fullArchive?.archivedAt ? new Date(fullArchive.archivedAt) : new Date();
		const currentFullDate = endDate.toLocaleString('uk-UA', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit', second: '2-digit'
		});

		const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
		const startOfMonthFormatted = startOfMonth.toLocaleString('uk-UA', {
			day: '2-digit', month: '2-digit', year: 'numeric'
		});

		const periodString = `${startOfMonthFormatted} — ${currentFullDate.split(',')[0]}`;

		const tableRowsHtml = invoices.map((invoice) => {
			const items = invoice.items || [];
			const orderComment = invoice.orderComment || "";
			const totalRows = items.length + (orderComment ? 1 : 0);

			const itemsHtml = items.map((item, itemIndex) => {
				const itemNote = item.comment
					? `<div style="color: #d35400; font-size: 11px; margin-top: 2px; font-weight: bold;">📝 ${item.comment}</div>`
					: '';

				return `
            <tr>
                ${itemIndex === 0 ? `<td rowspan="${totalRows}" style="text-align: center; font-weight: bold; border: 1px solid #999;">${invoice.id || invoice.idOrderHistory}</td>` : ''}
                <td style="border: 1px solid #999;">
                    <div>${item.name}</div>
                    ${itemNote}
                </td>
                <td style="text-align: right; font-weight: bold; border: 1px solid #999;">${item.quantity} ${item.units}</td>
                ${itemIndex === 0 ? `<td rowspan="${totalRows}" style="text-align: center; border: 1px solid #999;">${invoice.date}</td>` : ''}
            </tr>
        `;
			}).join('');

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
                        .period { text-align: center; font-size: 14px; color: #000; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 13px; }
                        th { background-color: #f2f2f2; }
                        .customer-info { margin-bottom: 10px; font-size: 15px; }
                        .no-print { text-align: center; margin-top: 30px; }
                        button { padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; font-weight: bold; }
                        @media print { .no-print { display: none; } td { -webkit-print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    <h2>📑 Звіт по замовленням (АРХІВ)</h2>
                    <div class="period"><strong>Період архіву:</strong> ${periodString}</div>
                    <div class="customer-info"><strong>Клієнт:</strong> ${name || 'Не вказано'}</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align: center;">ID</th>
                                <th>Назва товару</th>
                                <th style="text-align: right;">Кількість</th>
                                <th style="text-align: center;">Дата замовлення</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
                    <div style="margin-top: 20px; font-size: 11px; color: #888; text-align: right;">
                        Звіт сформовано з архівного запису від: ${currentFullDate}
                    </div>
                    <div class="no-print">
                        <button onclick="window.print()">🖨️ Друкувати накладну</button>
                        <button onclick="window.close()" style="background: #6c757d; margin-left: 10px;">Закрити</button>
                    </div>
                </body>
            </html>
        `);
			newWindow.document.close();
		}
	};

	const handlePrintStock = (stockData) => {
		// Отримуємо дату з архіву або поточну
		const archiveDate = fullArchive?.archivedAt ? new Date(fullArchive.archivedAt) : new Date();
		const formattedDate = archiveDate.toLocaleString('uk-UA');

		// Перетворюємо об'єкт stockData у масив та фільтруємо видимі товари
		const filteredStock = Object.values(stockData || {}).filter(s => !!s.visibleproduct);

		const tableRowsHtml = filteredStock.map((s) => `
        <tr>
            <td>${s.name}</td>
            <td style="text-align: right; font-weight: bold;">${s.quantity} ${s.units}</td>
        </tr>
    `).join('');

		const newWindow = window.open("", "_blank", "width=800,height=600");
		if (newWindow) {
			newWindow.document.write(`
        <html>
            <head>
                <title>Залишки на складі</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    .header-info { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #333; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #999; padding: 10px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .footer-date { margin-top: 15px; font-size: 12px; color: #555; text-align: right; }
                    .no-print { text-align: center; margin-top: 20px; }
                    button { padding: 10px 20px; background: #fb8c00; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header-info">
                    <h2>📦 Залишки на складі</h2>
                    <span>Дата архіву: ${formattedDate}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Назва товару</th>
                            <th style="text-align: right;">Кількість</th>
                        </tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>
                <p class="footer-date">Звіт сформовано з архіву: ${formattedDate}</p>
                <div class="no-print">
                    <button onclick="window.print()">🖨️ Друкувати</button>
                    <button onclick="window.close()" style="background: #6c757d; margin-left: 10px;">Закрити</button>
                </div>
            </body>
        </html>
        `);
			newWindow.document.close();
		}
	};

	const handleExportStockToCSV = (stockData) => {
		// 1. Фільтруємо дані так само, як і для друку
		const filteredStock = Object.values(stockData || {}).filter(s => !!s.visibleproduct);

		if (filteredStock.length === 0) {
			alert("Немає даних для експорту");
			return;
		}

		// 2. Формуємо заголовок та рядки
		// Використовуємо крапку з комою ";", бо вона краще розпізнається Excel для українського регіону
		const header = ["Назва товару", "Кількість", "Одиниці виміру"].join(";");
		const rows = filteredStock.map(s =>
			`"${s.name.replace(/"/g, '""')}";"${s.quantity}";"${s.units}"`
		);

		const csvContent = [header, ...rows].join("\n");

		// 3. Створюємо Blob з кодуванням UTF-8 (з сигнатурою BOM для Excel)
		const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);

		// 4. Створюємо тимчасове посилання для завантаження
		const link = document.createElement("a");
		const archiveDate = fullArchive?.archivedAt ? fullArchive.archivedAt.split('T')[0] : new Date().toISOString().split('T')[0];

		link.setAttribute("href", url);
		link.setAttribute("download", `stock_archive_${archiveDate}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// --- ЗВІТ ПО УГОДАХ З АРХІВУ ---
	const handlePrintAllAgreementsReport = () => {
		try {
			if (!fullArchive || !selectedUser) return;

			const crewId = selectedUser;
			const workerObj = customers.find(c => String(c.id) === String(crewId));
			const crewDisplayName = workerObj ? `${workerObj.name} (${crewId})` : crewId;

			// В архіві історія списань лежить тут:
			const historyData = fullArchive.usedMaterialsHistory?.[crewId] || {};
			const agreementsMap = {};

			Object.entries(historyData).forEach(([productId, logs]) => {
				if (!logs) return;
				// Шукаємо назву товару в архівному складі
				const productInfo = fullArchive.products?.[productId];
				const name = productInfo?.name || `Товар #${productId}`;
				const units = productInfo?.units || '';

				Object.values(logs).forEach(log => {
					const agreement = String(log.agreement || "Без угоди").trim();
					if (!agreementsMap[agreement]) agreementsMap[agreement] = [];

					agreementsMap[agreement].push({
						name,
						quantity: Number(log.value || 0),
						units,
						date: log.createdAt ? new Date(log.createdAt).toLocaleDateString("uk-UA") : "---"
					});
				});
			});

			// Формування HTML (аналогічно InvoicesPage)
			generateReportWindow("Звіт по угодах (Архів)", crewDisplayName, agreementsMap, true);
		} catch (err) {
			console.error(err);
			alert("Помилка при формуванні архівного звіту по угодах.");
		}
	};

	// --- ЗВІТ ПО ІСТОРІЇ З АРХІВУ ---
	const handlePrintFullHistoryReport = () => {
		try {
			if (!fullArchive || !selectedUser) return;

			const crewId = selectedUser;
			const workerObj = customers.find(c => String(c.id) === String(crewId));
			const crewDisplayName = workerObj ? `${workerObj.name} (${crewId})` : crewId;

			const historyData = fullArchive.usedMaterialsHistory?.[crewId] || {};
			let reportHtml = `<html><head><title>Архівна історія списань</title><style>
            body { font-family: sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; }
            .product-section { margin-bottom: 30px; border: 1px solid #ccc; }
            .product-title { background: #17a2b8; color: white; padding: 10px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #eee; padding: 6px; text-align: left; }
            th { background: #f9f9f9; }
            @media print { .no-print { display: none; } }
        </style></head><body>
        <div class="header">
            <h2>📜 Архівний звіт списань</h2>
            <p><b>Екіпаж:</b> ${crewDisplayName} | <b>Дата архіву:</b> ${new Date(fullArchive.archivedAt).toLocaleDateString()}</p>
        </div>`;

			let hasData = false;
			Object.entries(historyData).forEach(([productId, logs]) => {
				const productInfo = fullArchive.products?.[productId];
				const logsArray = Object.values(logs || {}).sort((a, b) => a.createdAt - b.createdAt);
				if (logsArray.length === 0) return;
				hasData = true;

				let total = 0;
				const rows = logsArray.map(log => {
					total += Number(log.value || 0);
					return `<tr>
                    <td>${new Date(log.createdAt).toLocaleString("uk-UA")}</td>
                    <td><b>${log.value}</b></td>
                    <td>${log.agreement || "—"}</td>
                    <td>${log.comment || ""}</td>
                </tr>`;
				}).reverse().join('');

				reportHtml += `
                <div class="product-section">
                    <div class="product-title">
                        <span>📦 ${productInfo?.name || productId}</span>
                        <span>Разом: ${total} ${productInfo?.units || ''}</span>
                    </div>
                    <table>
                        <thead><tr><th>Дата</th><th>К-сть</th><th>Угода</th><th>Примітка</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
			});

			reportHtml += hasData ? '<div class="no-print" style="text-align:center"><button onclick="window.print()">Друк</button></div>' : '<p>Дані відсутні</p>';
			reportHtml += '</body></html>';

			const win = window.open("", "_blank", "width=900,height=700");
			win.document.write(reportHtml);
			win.document.close();
		} catch (err) {
			alert("Помилка формування історії.");
		}
	};

	// Допоміжна функція для вікна звітів по угодах
	const generateReportWindow = (title, crew, dataMap, isArchive) => {
		let html = `<html><head><title>${title}</title><style>
        body { font-family: sans-serif; padding: 20px; }
        .ag-block { margin-bottom: 25px; border: 1px solid #17a2b8; }
        .ag-header { background: #17a2b8; color: white; padding: 8px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px; font-size: 13px; }
    </style></head><body>
    <h2>${isArchive ? '📦 ' : ''}${title}</h2>
    <p><b>Екіпаж:</b> ${crew}</p>`;

		Object.keys(dataMap).sort().forEach(ag => {
			html += `<div class="ag-block"><div class="ag-header">Угода № ${ag}</div><table>
            <thead><tr><th>Дата</th><th>Товар</th><th>Кількість</th></tr></thead>
            <tbody>${dataMap[ag].map(m => `<tr><td>${m.date}</td><td>${m.name}</td><td>${m.quantity} ${m.units}</td></tr>`).join('')}</tbody>
        </table></div>`;
		});

		html += '<button onclick="window.print()">Друк</button></body></html>';
		const win = window.open("", "_blank", "width=800,height=600");
		win.document.write(html);
		win.document.close();
	};

	return (
		<div className={classes.archiveWrapper}>
			<div className={classes.pageHeader} style={{
				background: 'linear-gradient(135deg, #6c757d, #495057)',
				padding: '20px',
				borderRadius: '8px'
			}}>
				<h2 className={classes.pageTitle} style={{ marginBottom: '20px', textAlign: 'center' }}>
					📦 Архів замовлень
				</h2>

				{/* Основний контейнер для селектів */}
				<div style={{
					display: 'flex',
					flexDirection: 'column', // Стовпчик за замовчуванням (для мобілок)
					gap: '15px',
					width: '100%'
				}} className="adaptive-select-container">

					{/* Рядок: Місяць */}
					<div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
						<label className={classes.label} style={{ color: '#fff', fontSize: '14px' }}>📅 Місяць:</label>
						<select
							value={selectedMonth}
							onChange={(e) => handleMonthChange(e.target.value)}
							className={classes.select}
							style={{ width: '100%', height: '40px', margin: 0 }}
						>
							<option value="">-- Оберіть місяць --</option>
							{months.map(m => <option key={m} value={m}>{m}</option>)}
						</select>
					</div>

					{/* Рядок: Запис від */}
					<div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
						<label className={classes.label} style={{ color: '#fff', fontSize: '14px' }}>🕒 Запис від:</label>
						<select
							value={selectedSnapshot}
							onChange={(e) => handleSnapshotChange(e.target.value)}
							className={classes.select}
							disabled={!availableSnapshots.length}
							style={{ width: '100%', height: '40px', margin: 0 }}
						>
							<option value="">-- Час створення --</option>
							{availableSnapshots.map(s => (
								<option key={s} value={s}>{s.replace('_', ' о ')}</option>
							))}
						</select>
					</div>

					{/* Рядок: Клієнт */}
					<div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
						<label className={classes.label} style={{ color: '#fff', fontSize: '14px' }}>👤 Клієнт:</label>
						<select
							value={selectedUser}
							onChange={(e) => setSelectedUser(e.target.value)}
							className={classes.select}
							disabled={!selectedSnapshot}
							style={{ width: '100%', height: '40px', margin: 0 }}
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
			</div>

			{userData ? (
				<>
					<h3 className={classes.sectionTitle}>📑 Деталізація замовлень:</h3>
					{/* TABLE: АРХІВНІ НАКЛАДНІ */}
					<table
						className={classes.table}
						style={{ cursor: 'pointer' }}
						onClick={(e) => {
							e.stopPropagation();
							const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedUser));
							const finalName = selectedCustomerObj ? selectedCustomerObj.name : "Клієнт";
							handlePrintOrderTable(userData.groupedInvoices, finalName);
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
							{userData.groupedInvoices.length > 0 ? userData.groupedInvoices.map((group, gIdx) => {
								<div style={{ marginBottom: '20px', textAlign: 'right' }}>
									<button
										onClick={() => exportToCsv(userData.groupedInvoices)}
										className={classes.btnExport} // Додайте стиль у CSS або використайте inline
										style={{ padding: '8px 16px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
									>
										📥 Експортувати в CSV
									</button>
								</div>
								const orderComment = group.orderComment;
								const totalRows = group.items.length + (orderComment ? 1 : 0);

								return (
									<React.Fragment key={gIdx}>
										{group.items.map((item, iIdx) => {
											const isLastItem = iIdx === group.items.length - 1;
											const hasNoComment = !orderComment;
											const shouldHaveDivider = isLastItem && hasNoComment && gIdx !== userData.groupedInvoices.length - 1;

											return (
												<tr key={`${gIdx}-${iIdx}`} className={shouldHaveDivider ? classes.invoiceDivider : ""}>
													{iIdx === 0 && (
														<td rowSpan={totalRows} style={{ verticalAlign: 'middle', fontWeight: 'bold' }}>
															{group.id}
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
													<td className={classes.alignRight}>{item.quantity} {item.units}</td>
													{iIdx === 0 && (
														<td rowSpan={totalRows} style={{ verticalAlign: 'middle' }}>
															{group.date}
														</td>
													)}
												</tr>
											);
										})}
										{/* Жовтий рядок коментаря */}
										{orderComment && (
											<tr className={gIdx !== userData.groupedInvoices.length - 1 ? classes.invoiceDivider : ""}>
												<td colSpan="2" style={{ backgroundColor: '#fff9db', color: '#856404', fontSize: '12px', padding: '6px 10px' }}>
													<b>💬 Коментар:</b> {orderComment}
												</td>
											</tr>
										)}
									</React.Fragment>
								);
							}) : (
								<tr><td colSpan="4" style={{ textAlign: 'center' }}>Дані відсутні</td></tr>
							)}
						</tbody>
					</table>

					{/* Блок загальної кількості товарів з періодом */}
					<h3 className={classes.sectionTitle}>📊 Загальна кількість взятих товарів:</h3>
					<table
						className={classes.table}
						style={{ cursor: 'pointer', marginBottom: '30px' }}
						onClick={(e) => {
							e.stopPropagation();
							const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedUser));
							const finalName = selectedCustomerObj ? selectedCustomerObj.name : "Клієнт";
							// Використовуємо userData.summary з архіву
							handlePrintSummary(userData.summary, finalName);
						}}
					>
						<thead>
							<tr>
								<th>Товари</th>
								<th className={classes.alignRight}>Кі-сть</th>
							</tr>
						</thead>
						<tbody>
							{userData.summary.length > 0 ? userData.summary.map((item, index) => (
								<tr key={index}>
									<td>{item.name}</td>
									<td className={classes.alignRight}>{item.totalQuantity} {item.units}</td>
								</tr>
							)) : (
								<tr><td colSpan="2" style={{ textAlign: 'center' }}>Дані відсутні</td></tr>
							)}
						</tbody>
					</table>
					{isAdminUsedMaterials && selectedUser && (
						<>
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

								{/* Блок пошуку по угоді */}
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									flexWrap: 'wrap',
									background: '#f8f9fa',
									padding: '8px 12px',
									borderRadius: '6px',
									border: '1px solid #dee2e6'
								}}>
									<span style={{ fontSize: '13px', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>
										🔍 Пошук по угоді:
									</span>
									{isAdminFullAccess && (
										<div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
											<button
												onClick={handlePrintAllAgreementsReport}
												className={classes.btnAdd}
												style={{
													backgroundColor: '#6c757d',
													borderColor: '#5a6268',
													width: '100%',
													marginBottom: '10px'
												}}
											>
												📋 Звіт по всіх угодах (Архів)
											</button>
											<button
												onClick={handlePrintFullHistoryReport}
												className={classes.btnHistory}
												style={{
													backgroundColor: '#17a2b8',
													color: 'white',
													padding: '8px 15px',
													width: '100%',
													display: 'flex',
													justifyContent: 'center',
													alignItems: 'center',
													gap: '8px'
												}}
											>
												📜 Звіт по всій історії списань (Архів)
											</button>
										</div>
									)}
									<input
										type="text"
										placeholder="№ угоди..."
										value={searchAgreement}
										onChange={(e) => setSearchAgreement(e.target.value)}
										className={classes.select}
										style={{ width: '130px', height: '30px', padding: '2px 8px', fontSize: '13px' }}
									/>
									<button
										onClick={handleSearchByAgreement}
										className={classes.btnHistory}
										style={{
											height: '30px', padding: '0 15px', background: '#17a2b8',
											color: '#fff', border: 'none', borderRadius: '4px',
											cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
										}}
									>
										ПЕРЕВІРИТИ
									</button>
								</div>
							</div>

							<table
								className={classes.table}
								style={{ cursor: 'pointer' }}
								onClick={() => {
									const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedUser));
									const finalName = selectedCustomerObj ? selectedCustomerObj.name : "Клієнт";
									handlePrintMaterials(userData.summary, userData.used, finalName);
								}}
							>
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
												<button
													className={classes.btnHistory}
													onClick={(e) => {
														e.stopPropagation(); // Зупиняємо виклик handlePrintMaterials
														showHistoryAlert(item.productId, item.name);
													}}
												>
													📜
												</button>
											</td>
										</tr>
									)) : (
										<tr><td colSpan="4" style={{ textAlign: 'center' }}>Дані відсутні</td></tr>
									)}
								</tbody>
							</table>
						</>
					)}
					{isAdminInvoices && (
						<>
							{/* Контейнер для заголовка та кнопки експорту */}
							<div style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginTop: '30px',
								marginBottom: '15px',
								gap: '10px',
								flexWrap: 'wrap' // дозволить кнопці переїхати під заголовок на дуже вузьких екранах
							}}>
								<h3 className={classes.sectionTitle} style={{ margin: 0 }}>
									📦 Стан складу (на момент архіву):
								</h3>

								<button
									onClick={(e) => {
										e.stopPropagation(); // Важливо: щоб не спрацював клік по таблиці (друк)
										handleExportStockToCSV(userData.stock);
									}}
									className={classes.btnHistory}
									style={{
										background: '#28a745',
										height: '34px',
										fontSize: '13px',
										padding: '0 15px',
										display: 'flex',
										alignItems: 'center',
										gap: '5px'
									}}
								>
									<span>📥</span> Експорт Excel
								</button>
							</div>

							{/* Обгортка для горизонтальної прокрутки на мобільних */}
							<div style={{ width: '100%', overflowX: 'auto' }}>
								<table
									className={classes.table}
									style={{ cursor: 'pointer', minWidth: '300px' }} // minWidth не дасть таблиці злипнутися
									onClick={(e) => {
										// Клік по всій таблиці викликає друк
										handlePrintStock(userData.stock);
									}}
								>
									<thead>
										<tr>
											<th style={{ textAlign: 'left' }}>Товари</th>
											<th className={classes.alignRight} style={{ width: '100px' }}>Кі-сть</th>
										</tr>
									</thead>
									<tbody>
										{Object.values(userData.stock || {})
											.filter(s => !!s.visibleproduct)
											.map((s, index) => (
												<tr key={index}>
													<td style={{ fontSize: '14px' }}>{s.name}</td>
													<td className={classes.alignRight} style={{ fontWeight: '600' }}>
														{s.quantity} {s.units}
													</td>
												</tr>
											))
										}
										{Object.values(userData.stock || {}).filter(s => !!s.visibleproduct).length === 0 && (
											<tr>
												<td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
													Дані відсутні
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</>
					)}
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
	hasAccount: state.inform.hasAccount,
	customers: state.inform.customers,
	customerId: state.inform.customerId
});

export default connect(mapStateToProps)(ArchivePage);
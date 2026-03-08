import React, { useEffect, useState, useMemo } from 'react'
import { connect, useDispatch } from 'react-redux'
import { fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications, deleteNotification, clearNotifications, fetchUsedMaterials, addUsedMaterial, fetchUsedMaterialsHistory, archiveAllDataMonthly } from '../../../redux/actions/invoices'
import classes from './InvoicesPage.module.css'
import firebase from 'firebase';

const UsedMaterialsTable = ({
	selectedUser,
	customers,
	invoicesSummary,
	usedMaterials,
	stock,
	fetchUsedMaterials,
	addUsedMaterial,
	fetchUsedMaterialsHistory,
	isAdminFullAccess
}) => {
	const [inputValues, setInputValues] = useState({});
	const [agreementValues, setAgreementValues] = useState({});
	const [commonAgreement, setCommonAgreement] = useState('');
	const [searchAgreement, setSearchAgreement] = useState('');
	const [isEditingIds, setIsEditingIds] = useState(false);
	const [newIdsString, setNewIdsString] = useState("");

	// Знаходимо користувача в масиві за його ID
	const userObj = customers?.find(c => String(c.id) === String(selectedUser));

	// Отримуємо ім'я (якщо знайшли) або просто показуємо ID
	const displayUserName = userObj ? userObj.name : `Користувач #${selectedUser}`;

	// 1. Стейт для динамічного списку ID товарів
	const [dynamicProductIds, setDynamicProductIds] = useState([]);

	// 2. Автоматична синхронізація та отримання списку з Firebase
	useEffect(() => {
		const ref = firebase.database().ref('settings/productsForWorkOrders');

		const syncAndFetch = async () => {
			// Твій початковий список як база для першого створення
			const initialList = [104, 123, 121, 122, 120, 119, 103, 124, 118, 117, 125, 132, 126, 108, 116, 112, 109, 114, 113, 115, 110, 111, 130, 129, 131, 128, 150, 153, 152, 151, 149, 148, 147];

			try {
				const snapshot = await ref.once('value');
				if (!snapshot.exists()) {
					await ref.set(initialList);
					setDynamicProductIds(initialList);
					console.log("✅ Список товарів синхронізовано з Firebase");
				} else {
					setDynamicProductIds(snapshot.val() || []);
				}
			} catch (err) {
				console.error("❌ Помилка завантаження налаштувань:", err);
			}
		};

		syncAndFetch();
	}, []);

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

						// Збираємо дати та кількості для кожного окремого списання по цій угоді
						matches.forEach(match => {
							const date = match.createdAt
								? new Date(match.createdAt).toLocaleString("uk-UA", { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
								: "---";

							foundMaterials.push({
								name: productInfo?.name || `Товар #${productId}`,
								quantity: Number(match.value || 0),
								units: productInfo?.units || '',
								date: date
							});
						});
					}
				}
			}

			if (foundMaterials.length === 0) {
				alert(`По угоді №${term} не списано товарів`);
			} else {
				// Формуємо текст: тепер додаємо дату в кожен рядок
				const listText = foundMaterials
					.map(m => `• [${m.date}] ${m.name}: ${m.quantity} ${m.units}`)
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

		if (!valueToAdd || valueToAdd <= 0) {
			alert("Введіть коректну кількість");
			return;
		}
		if (!agreement || agreement.trim() === "") {
			alert("Введіть номер угоди (загальний або для цього товару)");
			return;
		}

		try {
			await addUsedMaterial(selectedUser, productId, valueToAdd, agreement);
			await fetchUsedMaterials(selectedUser);
			setInputValues(prev => ({ ...prev, [productId]: "" }));
			alert("Дані успішно додано");
		} catch (err) {
			console.error("Помилка додавання:", err);
		}
	};

	const handleHistory = async (productId) => {
		try {
			const hist = await fetchUsedMaterialsHistory(selectedUser, productId);
			const productInfo = fullMaterialsList.find(s => Number(s.productId) === Number(productId));
			const productName = productInfo?.name || `Товар #${productId}`;
			const units = productInfo?.units || '';

			if (!hist || hist.length === 0) {
				alert(`Історія для "${productName}" порожня.`);
				return;
			}

			const sortedLogs = [...hist].sort((a, b) => a.createdAt - b.createdAt);
			let runningTotal = 0;

			const historyLines = sortedLogs.map(log => {
				const val = Number(log.value || 0);
				runningTotal += val;
				const date = log.createdAt ? new Date(log.createdAt).toLocaleString("uk-UA") : "---";
				return `${date} — Списано: ${val} ${units} (Сумарно: ${runningTotal}) ${log.agreement ? `[Угода: ${log.agreement}]` : ''}`;
			});

			const historyText = historyLines.reverse().join('\n');
			const fullMessage = `📜 Історія списань для: ${productName}\n📊 Всього списано: ${runningTotal} ${units}\n\n${historyText}`;

			if (fullMessage.length > 1000) {
				const newWindow = window.open("", "_blank", "width=700,height=500");
				if (newWindow) {
					newWindow.document.write(`<html><head><title>Історія</title></head><body style="padding:20px; font-family:monospace; background:#f4f4f4;"><pre>${fullMessage}</pre></body></html>`);
					newWindow.document.close();
				} else { alert(fullMessage); }
			} else { alert(fullMessage); }
		} catch (err) { alert("Не вдалося завантажити історію."); }
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
		</div>
	);
};

const InvoicesPage = ({
	hasAccount, customerName, customerId, invoices, invoicesSummary, fetchInvoices, fetchInvoicesSummary,
	customers, notifications, fetchOrderNotifications, deleteNotification, clearNotifications,
	usedMaterials, fetchUsedMaterials, addUsedMaterial, archiveAllDataMonthly, stock
}) => {

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

		try {
			const path = `invoices/${customerId}/${orderId}`;
			const snapshot = await firebase.database().ref(path).once('value');
			const orderData = snapshot.val();

			if (!orderData) {
				alert(`Замовлення #${orderId} не знайдено.`);
				return;
			}

			const items = orderData.items || [];
			const itemsText = items.map(item => `• ${item.name}: ${item.quantity} ${item.units}`).join('\n');

			let clientName = "ID " + customerId;
			try {
				if (typeof customers !== 'undefined') {
					const customer = customers.find(c => String(c.id) === String(customerId));
					if (customer) clientName = customer.name;
				}
			} catch (e) { /* ignore */ }

			const fullMessage = `📦 Деталі замовлення #${orderId}\n` +
				`👤 Клієнт: ${clientName}\n` +
				`📅 Дата: ${orderData.date || notification.date}\n` +
				`✅ Статус: ${orderData.status || 'Виконано'}\n` +
				`--------------------------\n` +
				`${itemsText}`;

			// --- НОВА ЛОГІКА ВИБОРУ ---
			const isPrint = window.confirm(
				"Деталі замовлення отримано. Оберіть дію:\n\n" +
				"✅ OK — Швидкий перегляд (Alert)\n" +
				"❌ Скасувати — Відкрити вікно для ДРУКУ"
			);

			if (isPrint) {
				alert(fullMessage);
				return;
			}

			// Відкриваємо гарне вікно для друку
			const newWindow = window.open("", "_blank", "width=800,height=750");

			if (newWindow) {
				newWindow.document.write(`
            <html>
                <head>
                    <title>Замовлення #${orderId}</title>
                    <style>
                        body { 
                            padding: 40px; 
                            font-family: 'Segoe UI', sans-serif; 
                            background: #f0f2f5; 
                            color: #333; 
                        }
                        .invoice-card { 
                            background: white; 
                            padding: 30px; 
                            border-radius: 12px; 
                            box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
                            max-width: 600px; 
                            margin: 0 auto; 
                        }
                        pre { 
                            white-space: pre-wrap; 
                            font-family: 'Courier New', monospace; 
                            font-size: 15px; 
                            line-height: 1.6; 
                            background: #fafafa; 
                            padding: 20px; 
                            border: 1px solid #eee; 
                            border-radius: 8px;
                        }
                        .btn-group { margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end; }
                        button { 
                            padding: 12px 25px; 
                            border: none; 
                            border-radius: 8px; 
                            cursor: pointer; 
                            font-weight: bold; 
                            transition: 0.2s;
                        }
                        .print-btn { background: #007bff; color: white; }
                        .close-btn { background: #6c757d; color: white; }
                        
                        @media print {
                            .btn-group { display: none; }
                            body { background: white; padding: 0; }
                            .invoice-card { box-shadow: none; border: none; width: 100%; max-width: 100%; }
                        }
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
			} else {
				alert("Браузер заблокував вікно. Дозвольте спливаючі вікна.");
			}

		} catch (error) {
			console.error("Помилка:", error);
			alert("Сталася помилка при завантаженні даних замовлення.");
		}
	};

	const handlePrintOrderTable = (invoices, name) => {
		// 1. Формуємо дати: початок місяця та поточний час
		const now = new Date();
		const currentFullDate = now.toLocaleString('uk-UA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfMonthFormatted = startOfMonth.toLocaleString('uk-UA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		const periodString = `${startOfMonthFormatted} — ${currentFullDate}`;

		// 2. Формуємо рядки таблиці
		const tableRowsHtml = invoices.map((invoice) => {
			const itemsArray = invoice.items ? Object.entries(invoice.items) : [];
			return itemsArray.map(([id, item], itemIndex) => {
				return `
                <tr>
                    ${itemIndex === 0 ? `<td rowspan="${itemsArray.length}">${invoice.idOrderHistory}</td>` : ''}
                    <td>${item.name}</td>
                    <td style="text-align: right;">${item.quantity} ${item.units}</td>
                    ${itemIndex === 0 ? `<td rowspan="${itemsArray.length}">${invoice.date}</td>` : ''}
                </tr>
            `;
			}).join('');
		}).join('');

		// 3. Відкриваємо вікно друку
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
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 13px; }
                        th { background-color: #f2f2f2; }
                        .customer-info { margin-bottom: 10px; font-size: 15px; }
                        .no-print { text-align: center; margin-top: 30px; }
                        button { padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; font-weight: bold; }
                        @media print { .no-print { display: none; } }
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
                        <button onclick="window.print()">🖨️ Друкувати накладну</button>
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
						<select className={classes.select} value={selectedUser} onChange={e => { setSelectedUser(e.target.value); window.localStorage.setItem('idSelectedCustomer', e.target.value); }}>
							<option value="">--Choose customer--</option>
							{customers.filter(c => (c.id === 7 || c.id > 127) && c.name !== "Шановний клієнт").map(c => (
								<option key={c.id} value={c.id}>{c.name} ({c.email})</option>
							))}
						</select>
					</div>
				)}
			</div>

			{isAdminUsedMaterials && selectedUser && (
				<UsedMaterialsTable
					selectedUser={selectedUser}
					customers={customers}
					invoicesSummary={invoicesSummary}
					usedMaterials={usedMaterials}
					fetchUsedMaterials={fetchUsedMaterials}
					addUsedMaterial={addUsedMaterial}
					stock={stock}
					fetchUsedMaterialsHistory={fetchUsedMaterialsHistory}
					isAdminFullAccess={isAdminFullAccess}
				/>
			)}

			<h3 className={classes.sectionTitle}>📑 Замовлення:</h3>

			{/* TABLE: НАКЛАДНІ */}
			<table
				className={classes.table}
				style={{ cursor: 'pointer' }}
				onClick={(e) => {
					e.stopPropagation();

					// Знаходимо ім'я клієнта зі списку customers за вибраним ID
					const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedUser));
					const finalName = selectedCustomerObj ? selectedCustomerObj.name : "Клієнт";

					// Викликаємо функцію БЕЗ "this."
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
						return itemsArray.map(([id, item], itemIndex) => {
							const isLastRowInInvoice = itemIndex === itemsArray.length - 1;
							const isNotLastInvoice = index !== invoices.length - 1;
							const shouldHaveBorder = isLastRowInInvoice && isNotLastInvoice;

							return (
								<tr key={`${index} -${id} `} className={shouldHaveBorder ? classes.invoiceDivider : ""}>
									{itemIndex === 0 && <td rowSpan={itemsArray.length}>{invoice.idOrderHistory}</td>}
									<td>{item.name}</td>
									<td className={classes.alignRight}>{item.quantity} {item.units}</td>
									{itemIndex === 0 && <td rowSpan={itemsArray.length}>{invoice.date}</td>}
								</tr>
							);
						});
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

			{isAdminInvoices && stock && (
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
			)}

			{isAdminFullAccess && (
				<button className={classes.btnAdd} style={{ backgroundColor: '#f39c12', width: 'auto', marginBottom: '20px', borderColor: '#e67e22' }}
					onClick={() => { if (window.confirm("Створити архів?")) archiveAllDataMonthly(); }}>
					📦 Створити архів за поточний місяць
				</button>
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
	stock: state.products.products,
	notifications: state.invoices.notifications,
	usedMaterials: state.invoices.usedMaterials
});

export default connect(mapStateToProps, {
	fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications, deleteNotification, clearNotifications,
	fetchUsedMaterials, addUsedMaterial, fetchUsedMaterialsHistory, archiveAllDataMonthly
})(InvoicesPage);
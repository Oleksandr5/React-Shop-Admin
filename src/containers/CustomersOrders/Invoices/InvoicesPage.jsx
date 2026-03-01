import React, { useEffect, useState } from 'react'
import { connect, useDispatch } from 'react-redux'
import { fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications, deleteNotification, clearNotifications, fetchUsedMaterials, addUsedMaterial, fetchUsedMaterialsHistory, archiveAllDataMonthly } from '../../../redux/actions/invoices'
import classes from './InvoicesPage.module.css'
import firebase from 'firebase';

const UsedMaterialsTable = ({
	selectedUser,
	invoicesSummary,
	usedMaterials,
	fetchUsedMaterials,
	addUsedMaterial,
	fetchUsedMaterialsHistory
}) => {
	const [inputValues, setInputValues] = useState({});
	const [agreementValues, setAgreementValues] = useState({});

	// --- ДОДАВАННЯ З УГОДОЮ ---
	const handleAddMaterial = async (productId) => {
		const valueToAdd = Number(inputValues[productId]);
		// Беремо номер угоди з локального стану за ID продукту
		const agreement = agreementValues[productId] || "";

		if (!valueToAdd || valueToAdd <= 0) {
			alert("Введіть коректну кількість");
			return;
		}

		try {
			console.log(`Відправка: Продукт ${productId}, К-сть: ${valueToAdd}, Угода: ${agreement}`);

			// Передаємо agreement третім або четвертим параметром (залежно від вашого API)
			// Зазвичай структура: (userId, productId, value, agreement)
			await addUsedMaterial(selectedUser, productId, valueToAdd, agreement);

			// Оновлюємо дані на екрані
			await fetchUsedMaterials(selectedUser);

			// Очищаємо обидва інпути після успішного додавання
			setInputValues(prev => ({ ...prev, [productId]: "" }));
			setAgreementValues(prev => ({ ...prev, [productId]: "" }));

			alert("Дані успішно додано");
		} catch (err) {
			console.error("Помилка додавання:", err);
			alert("Не вдалося зберегти дані");
		}
	};

	// --- ІСТОРІЯ (Виправлено логіку отримання) ---
	const handleHistory = async (productId) => {
		try {
			// 1. Отримуємо дані з пропсів (Firebase)
			const hist = await fetchUsedMaterialsHistory(selectedUser, productId);

			console.log("LOG: Результат у компоненті:", hist);

			if (!hist || hist.length === 0) {
				alert(`Історія для товару №${productId} відсутня у базі.`);
				return;
			}

			// Знаходимо назву товару для заголовка (якщо є доступ до списку summary)
			const productInfo = invoicesSummary.find(s => s.productId === productId);
			const productName = productInfo?.name || `Товар №${productId}`;
			const units = productInfo?.units || 'од.';

			// 2. Формуємо текст історії
			// .slice() робимо, щоб не мутувати оригінальний масив
			// .reverse() щоб нові записи були зверху
			const historyText = hist
				.slice()
				.reverse()
				.map(h => {
					const date = h.createdAt ? new Date(h.createdAt).toLocaleString("uk-UA") : "---";
					// Формат: [Дата] — Списано: X (Сумарно: Y) [Угода: Z]
					return `${date} — Списано: ${h.value} ${units} (Сумарно: ${h.currentValue}) ${h.agreement ? `[Угода: ${h.agreement}]` : '[без угоди]'}`;
				})
				.join("\n");

			const fullMessage = `📜 Історія списань для: ${productName}\n\n${historyText}`;

			// 3. Перевірка на довжину тексту (щоб не було "...")
			if (fullMessage.length > 1000) {
				// Якщо текст занадто довгий для alert, відкриваємо у новому вікні
				const newWindow = window.open("", "_blank", "width=700,height=500");
				newWindow.document.write(`
                <html>
                    <head><title>Історія списань</title></head>
                    <body style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
                        <h2 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">${productName}</h2>
                        <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${fullMessage}</pre>
                        <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer;">Закрити</button>
                    </body>
                </html>
            `);
			} else {
				alert(fullMessage);
			}

		} catch (err) {
			console.error("LOG: Помилка в handleHistory:", err);
			alert("Не вдалося завантажити історію.");
		}
	};

	// 1. Обов'язково стрілочна функція
	const handleUndo = async (productId) => {
		console.log("%c --- СТАРТ handleUndo ---", "color: blue; font-weight: bold;");

		try {
			// ПОМИЛКА 1: Ви використовували this.props, але UsedMaterialsTable — це ФУНКЦІЯ.
			// У функціях пропси беруться прямо з аргументів (вони вже є у вас зверху).
			console.log("1. Продукт:", productId, "| Користувач:", selectedUser);

			// Крок історії
			// ПОМИЛКА 2: customerId був undefined, використовуємо selectedUser
			const hist = await fetchUsedMaterialsHistory(selectedUser, productId);
			console.log("2. Отримана історія:", hist);

			const currentTotal = (usedMaterials || {})[productId] || 0;
			console.log("3. Поточна сума в Redux:", currentTotal);

			if (!hist || hist.length === 0) {
				alert("Зупинка: Історія порожня або не знайдена");
				return;
			}

			const lastEntry = hist[hist.length - 1];
			const rollbackValue = currentTotal - lastEntry.value;
			console.log("4. Останній запис:", lastEntry.value, "| Результат після відкату:", rollbackValue);

			if (window.confirm(`Відмінити дію (+${lastEntry.value})? Поточне значення ${currentTotal} стане ${rollbackValue}`)) {
				console.log("5. Підтверджено. Запис у базу...");

				// ПОМИЛКА 3: Викликаємо функції прямо, без this.props
				await addUsedMaterial(selectedUser, productId, null, null, rollbackValue);

				console.log("6. Оновлення даних на екрані...");
				await fetchUsedMaterials(selectedUser);
				console.log("%c --- УСПІШНО ЗАВЕРШЕНО ---", "color: green; font-weight: bold;");
			}

		} catch (err) {
			console.error("ПОМИЛКА в handleUndo:", err);
			alert("Помилка при спробі відкату");
		}
	};

	return (
		<div className={classes.usedMaterialsSection}>
			<h3 className={classes.sectionTitle}>🛠 Використані матеріали</h3>
			<table className={classes.table}>
				<thead>
					<tr>
						<th style={{ width: "50%" }}>Товар</th>
						<th>Управління</th>
					</tr>
				</thead>
				<tbody>
					{invoicesSummary.map((item) => {
						const { productId, name } = item;
						// Зчитуємо число прямо з об'єкта usedMaterials
						const value = usedMaterials?.[productId] ?? 0;

						return (
							<tr key={productId}>
								<td>{name}</td>
								<td>
									<div className={classes.usedWrapper}>
										<span className={classes.totalBadge}>{value}</span>
										<input
											type="number"
											value={inputValues[productId] ?? ""}
											onChange={e => setInputValues(prev => ({
												...prev, [productId]: e.target.value
											}))}
											className={classes.inputSmall}
											placeholder="К-сть"
										/>
										<input
											type="text"
											value={agreementValues[productId] ?? ""}
											onChange={e => setAgreementValues(prev => ({
												...prev, [productId]: e.target.value
											}))}
											className={classes.inputAgreement} // Стилі, які ми розібрали раніше
											placeholder="Угода №"
										/>
										<button className={classes.btnAdd} onClick={() => handleAddMaterial(productId)}>
											Додати
										</button>
										<button
											className={classes.btnUndo}
											onClick={() => handleUndo(productId)}
										>
											<span className="undoIcon">↩</span>
										</button>
										<button className={classes.btnHistory} onClick={() => handleHistory(productId)}>
											🕒
										</button>
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
	hasAccount,
	customerName,
	customerId,
	invoices,
	invoicesSummary,
	fetchInvoices,
	fetchInvoicesSummary,
	customers,
	notifications,
	fetchOrderNotifications,
	deleteNotification,
	clearNotifications,
	usedMaterials,
	fetchUsedMaterials,
	addUsedMaterial,
	archiveAllDataMonthly,
	stock
}) => {

	const [inputValues, setInputValues] = useState({});
	const [selectedUser, setSelectedUser] = useState(customerId || '');
	const [admins, setAdmins] = useState({}); // ← стан для доступів з Firebase

	const authAdmin = window.localStorage.getItem("authAdmin");
	const idThisCustomers = window.localStorage.getItem("idThisCustomers");

	// --- завантаження доступів з Firebase ---
	useEffect(() => {
		const ref = firebase.database().ref('settings/admins');
		ref.on('value', snapshot => {
			setAdmins(snapshot.val() || {});
		});
		return () => ref.off();
	}, []);

	// --- перевірка доступів ---
	const isAdminInvoices = (hasAccount && authAdmin === "true") ||
		(!!admins[idThisCustomers]?.invoices);

	const isAdminUsedMaterials = (hasAccount && authAdmin === "true") ||
		(!!admins[idThisCustomers]?.usedMaterials);

	// ✅ перевірка, чи користувач має fullAccess	
	const isAdminFullAccess = (hasAccount && authAdmin === "true") ||
		(!!admins[idThisCustomers]?.fullAccess);

	// --- Вибраний користувач ---
	useEffect(() => {
		const savedId = window.localStorage.getItem('idSelectedCustomer') || idThisCustomers;
		if (savedId) {
			setSelectedUser(savedId);
			window.localStorage.setItem('idSelectedCustomer', savedId);
		}
	}, []);

	// --- Завантаження накладних та повідомлень ---
	useEffect(() => {
		if (hasAccount && selectedUser) {
			fetchInvoices(selectedUser);
			fetchInvoicesSummary(selectedUser);
			fetchOrderNotifications(selectedUser);
		}
	}, [selectedUser, hasAccount, fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications]);

	// --- Завантаження використаних матеріалів ---
	useEffect(() => {
		if (selectedUser) {
			fetchUsedMaterials(selectedUser);
		}
	}, [selectedUser]);

	return (
		<div className={classes.wrapper}>

			{/* ПОВІДОМЛЕННЯ */}
			{isAdminUsedMaterials && notifications.length > 0 && (
				<div className={classes.notificationsBlock}>

					<div className={classes.notificationsHeader}>
						<h3>🔔 Підтверджені замовлення</h3>

						<button
							className={classes.clearBtn}
							onClick={() => {
								if (window.confirm("Очистити всі повідомлення?")) {
									clearNotifications(isAdminInvoices ? null : selectedUser);
								}
							}}
						>
							❌ Очистити всі
						</button>

					</div>

					<div className={classes.notificationsList}>
						{notifications.map((n) => (
							<div key={n.orderId} className={classes.notificationItem}>

								<div>
									<strong>Замовлення #{n.orderId}</strong>
									<div className={classes.meta}>
										👤 {n.customerId} ({customers.find(c => c.id === n.customerId)?.name || 'Без імені'}) | 📅 {n.date}
									</div>
								</div>

								<button
									className={classes.deleteBtn}
									onClick={() => {
										if (window.confirm(`Видалити замовлення #${n.orderId}?`)) {
											deleteNotification(n);
										}
									}}
								>
									🗑
								</button>

							</div>
						))}
					</div>

				</div>
			)}

			{/* HEADER */}
			<div className={classes.pageHeader}>
				<h2 className={classes.pageTitle}>
					🧾 Накладні: {customerName}
				</h2>

				{isAdminInvoices && (

					<div className={classes.selectWrapper}>
						<label className={classes.label}>👤 Виберіть отримувача:</label>
						<select
							className={classes.select}
							value={selectedUser}
							onChange={e => {
								const userId = e.target.value;
								setSelectedUser(userId);
								window.localStorage.setItem('idSelectedCustomer', userId);
							}}
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

			<h3 className={classes.sectionTitle}>📑 Замовлення:</h3>

			{/* TABLE: НАКЛАДНІ */}
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
						const itemsArray = invoice.items ? Object.entries(invoice.items) : [];
						return itemsArray.map(([id, item], itemIndex) => {
							const isLastRowInInvoice = itemIndex === itemsArray.length - 1;
							const isNotLastInvoice = index !== invoices.length - 1;
							const shouldHaveBorder = isLastRowInInvoice && isNotLastInvoice;

							return (
								<tr key={`${index}-${id}`} className={shouldHaveBorder ? classes.invoiceDivider : ""}>
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

			{/* TABLE: ПІДСУМКИ */}
			<h3 className={classes.sectionTitle}>📊 Загальна кількість товарів взятих на складі:</h3>
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
							<td className={classes.alignRight}>{item.totalQuantity} {item.units}</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* Використані матеріали */}
			{isAdminUsedMaterials && invoicesSummary.length > 0 && (
				<UsedMaterialsTable
					selectedUser={selectedUser}
					invoicesSummary={invoicesSummary}
					usedMaterials={usedMaterials}
					fetchUsedMaterials={fetchUsedMaterials}
					addUsedMaterial={addUsedMaterial}
					fetchUsedMaterialsHistory={fetchUsedMaterialsHistory}
				/>
			)}

			{/* TABLE: ЗАЛИШКИ */}
			{isAdminInvoices && stock && (
				<>
					<h3 className={classes.sectionTitle}>📦 Залишки на складі:</h3>
					<table className={classes.table}>
						<thead>
							<tr>
								<th style={{ width: "75%" }}>Товари</th>
								<th style={{ width: "25%" }} className={classes.alignRight}>Кі-сть</th>
							</tr>
						</thead>
						<tbody>
							{stock.filter(s => s.visibleproduct).map((s, index) => (
								<tr key={index}>
									<td>{s.name}</td>
									<td className={classes.alignRight}>{s.quantity} {s.units}</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			)}
			{isAdminFullAccess && (
				<button
					className={classes.btnAdd}
					style={{
						backgroundColor: '#f39c12', // Прибрали !important, тут він не працює
						width: 'auto',
						marginBottom: '20px',
						borderColor: '#e67e22'
					}}
					onClick={() => {
						if (window.confirm("УВАГА! Буде створено повну копію всіх даних (накладні, підсумки, списання) за поточний місяць у вузол 'archive'. Продовжити?")) {
							archiveAllDataMonthly();
						}
					}}
				>
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
	fetchInvoices,
	fetchInvoicesSummary,
	fetchOrderNotifications,
	deleteNotification,
	clearNotifications,
	fetchUsedMaterials,
	addUsedMaterial,
	fetchUsedMaterialsHistory,
	archiveAllDataMonthly
})(InvoicesPage);
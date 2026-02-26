import React, { useEffect, useState } from 'react'
import { connect, useDispatch } from 'react-redux'
import { fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications, deleteNotification, clearNotifications, fetchUsedMaterials, addUsedMaterial, fetchUsedMaterialsHistory } from '../../../redux/actions/invoices'
import classes from './InvoicesPage.module.css'
import firebase from 'firebase';

const UsedMaterialsTable = ({ selectedUser, invoicesSummary, usedMaterials }) => {
	const dispatch = useDispatch();

	const [inputValues, setInputValues] = useState({});
	const [agreementValues, setAgreementValues] = useState({});
	const [history, setHistory] = useState({});
	const [currentIndex, setCurrentIndex] = useState({});

	// -------------------------------
	// Ініціалізація історії (по клієнту!)

	useEffect(() => {
		if (!selectedUser) return;
		const userHistory = history[selectedUser];
		if (!userHistory) return;

		console.log("🔵 Поточний клієнт:", selectedUser);
		console.log("history[selectedUser]:", userHistory);
		console.log("повний history:", history);

		Object.entries(userHistory).forEach(([productId, values]) => {
			console.log(`productId ${productId}:`, values);
		});
	}, [history, selectedUser]);

	// Ініціалізація історії для поточного клієнта
	useEffect(() => {
		if (!selectedUser || !invoicesSummary?.length || !usedMaterials) return;

		setHistory(prev => {
			const newHistory = { ...prev };

			if (!newHistory[selectedUser]) newHistory[selectedUser] = {};

			invoicesSummary.forEach(item => {
				const { productId } = item;

				if (!newHistory[selectedUser][productId]) {
					// Встановлюємо лише поточне значення цього клієнта
					const initialValue = usedMaterials[productId]?.[selectedUser] ?? 0;
					newHistory[selectedUser][productId] = [initialValue];
				}
			});

			return newHistory;
		});

		setCurrentIndex(prev => {
			const newIndex = { ...prev };
			if (!newIndex[selectedUser]) newIndex[selectedUser] = {};

			invoicesSummary.forEach(item => {
				const { productId } = item;
				if (newIndex[selectedUser][productId] === undefined) {
					newIndex[selectedUser][productId] = 0;
				}
			});

			return newIndex;
		});
	}, [selectedUser, invoicesSummary, usedMaterials]);

	// -------------------------------

	// -------------------------------
	const handleAddMaterial = async (productId) => {
		const valueToAdd = Number(inputValues[productId]);
		if (!valueToAdd || valueToAdd <= 0) return;

		const agreement = agreementValues[productId] || null;

		setHistory(prev => {
			const userHistory = prev[selectedUser] ? { ...prev[selectedUser] } : {};
			const productHistory = userHistory[productId] ? [...userHistory[productId]] : [0];
			const currentValue = productHistory[productHistory.length - 1] ?? 0;
			const newValue = currentValue + valueToAdd;

			// Додаємо нове значення у продукт
			productHistory.push(newValue);
			userHistory[productId] = productHistory;

			// Одразу оновлюємо currentIndex для поточного продукту
			setCurrentIndex(prevIdx => ({
				...prevIdx,
				[selectedUser]: {
					...prevIdx[selectedUser],
					[productId]: productHistory.length - 1
				}
			}));

			return {
				...prev,
				[selectedUser]: userHistory
			};
		});

		try {
			await dispatch(addUsedMaterial(selectedUser, productId, valueToAdd, agreement));
		} catch (err) {
			console.error("Помилка додавання:", err);
			// rollback, якщо треба
		}

		setInputValues(prev => ({ ...prev, [productId]: "" }));
		setAgreementValues(prev => ({ ...prev, [productId]: "" }));
	};

	// -------------------------------
	// Undo
	const handleUndo = async (productId) => {
		const userHistory = history[selectedUser];
		const userIndex = currentIndex[selectedUser];
		if (!userHistory || !userIndex) return;

		const currentIdx = userIndex[productId] ?? 0;
		const newIdx = Math.max(currentIdx - 1, 0);

		// обрізаємо локально історію
		const newProductHistory = userHistory[productId].slice(0, newIdx + 1);
		const pointerValue = newProductHistory[newProductHistory.length - 1];

		// оновлюємо локальну історію
		setHistory(prev => ({
			...prev,
			[selectedUser]: {
				...prev[selectedUser],
				[productId]: newProductHistory
			}
		}));

		// оновлюємо currentIndex
		setCurrentIndex(prev => ({
			...prev,
			[selectedUser]: {
				...prev[selectedUser],
				[productId]: newIdx
			}
		}));

		// відправляємо обрізану історію на Firebase



		const pointerValue1 = userHistory[productId]?.[newIdx];
		console.log('pointerValue', pointerValue);
		console.log('pointerValue1', pointerValue1);

		if (pointerValue != null) {
			dispatch(addUsedMaterial(selectedUser, productId, 0, null, pointerValue1))
				.then(() => dispatch(fetchUsedMaterials(selectedUser)))
				.catch(err => console.error("Undo error:", err));
		};

		// (опційно) оновити локальні дані з сервера
		// await dispatch(fetchUsedMaterials(selectedUser));
	};

	// -------------------------------
	const handleHistory = async (productId) => {
		try {
			const hist = await dispatch(fetchUsedMaterialsHistory(selectedUser, productId));
			if (!hist || hist.length === 0) {
				alert("Історія відсутня");
				return;
			}

			const text = hist
				.map(h => {
					const agreement = h.agreement ? `(угода: ${h.agreement})` : "";
					const date = new Date(h.createdAt);
					return `${h.value}${agreement} — залишок після списання: ${h.currentValue} — ${date.toLocaleString("uk-UA")}`;
				})
				.join("\n");

			alert(text);

		} catch (err) {
			console.error("Помилка історії:", err);
			alert("Не вдалося отримати історію");
		}
	};

	// -------------------------------
	return (
		<div>
			<h3 className={classes.sectionTitle}>🛠 Використані матеріали</h3>

			<table className={classes.table}>
				<thead>
					<tr>
						<th style={{ width: "50%" }}>Товари</th>
						<th style={{ width: "50%" }}>Використано</th>
					</tr>
				</thead>
				<tbody>
					{invoicesSummary.map((item) => {
						const { productId, name } = item;

						const idx =
							currentIndex[selectedUser]?.[productId] ?? 0;

						const productHistory =
							history[selectedUser]?.[productId] ?? [];

						const value = productHistory[idx] ?? 0;

						return (
							<tr key={productId}>
								<td>{name}</td>
								<td>
									<div className={classes.usedWrapper}>

										<span>{value}</span>

										<input
											type="number"
											value={inputValues[productId] ?? ""}
											onChange={e =>
												setInputValues(prev => ({
													...prev,
													[productId]: e.target.value
												}))
											}
											className={classes.input}
											placeholder="К-сть"
										/>

										<input
											type="text"
											value={agreementValues[productId] ?? ""}
											onChange={e =>
												setAgreementValues(prev => ({
													...prev,
													[productId]: e.target.value
												}))
											}
											className={classes.input}
											placeholder="Угода"
										/>

										<button onClick={() => handleAddMaterial(productId)}>
											Додати
										</button>

										<button onClick={() => handleUndo(productId)}>
											← Назад
										</button>

										<button onClick={() => handleHistory(productId)}>
											Історія
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
	stock
}) => {

	const [inputValues, setInputValues] = useState({});
	const [selectedUser, setSelectedUser] = useState(customerId || '');
	console.log('notifications:', notifications)
	const authAdmin = window.localStorage.getItem("authAdmin");
	const idThisCustomers = window.localStorage.getItem("idThisCustomers");

	const isAdmin =
		(hasAccount && authAdmin === "true") ||
		["139", "155", "156"].includes(idThisCustomers);

	useEffect(() => {
		// Виконується один раз при завантаженні компонента
		const savedId = window.localStorage.getItem('idSelectedCustomer') || idThisCustomers;
		if (savedId) {
			setSelectedUser(savedId);
			window.localStorage.setItem('idSelectedCustomer', savedId);
		}
	}, []); // пустий масив залежностей

	useEffect(() => {
		if (hasAccount && selectedUser) {
			fetchInvoices(selectedUser);
			fetchInvoicesSummary(selectedUser);
			fetchOrderNotifications(selectedUser);
		}
	}, [selectedUser, hasAccount, fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications]);

	useEffect(() => {
		if (selectedUser) {
			fetchUsedMaterials(selectedUser);
		}
	}, [selectedUser]);

	return (
		<div className={classes.wrapper}>

			{notifications.length > 0 && (
				<div className={classes.notificationsBlock}>

					<div className={classes.notificationsHeader}>
						<h3>🔔 Підтверджені замовлення</h3>

						<button
							className={classes.clearBtn}
							onClick={() => {
								if (window.confirm("Очистити всі повідомлення?")) {
									// для адміна передаємо пустий параметр
									clearNotifications(isAdmin ? null : selectedUser);
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
											deleteNotification(n); // передаємо весь об’єкт notification
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

				{isAdmin && (
					<div className={classes.selectWrapper}>
						<label className={classes.label}>
							👤 Виберіть отримувача:
						</label>
						<select
							className={classes.select}
							value={selectedUser}
							onChange={e => {
								const userId = e.target.value;
								setSelectedUser(userId);
								window.localStorage.setItem('idSelectedCustomer', userId); // зберігаємо вибраного клієнта
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

			<h3 className={classes.sectionTitle}>
				📑 Замовлення:
			</h3>

			{/* ================= TABLE: НАКЛАДНІ ================= */}
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
						const itemsArray = invoice.items
							? Object.entries(invoice.items)
							: [];

						return itemsArray.map(([id, item], itemIndex) => {

							const isLastRowInInvoice =
								itemIndex === itemsArray.length - 1;

							const isNotLastInvoice =
								index !== invoices.length - 1;

							const shouldHaveBorder =
								isLastRowInInvoice && isNotLastInvoice;

							return (
								<tr
									key={`${index}-${id}`}
									className={shouldHaveBorder ? classes.invoiceDivider : ""}
								>
									{itemIndex === 0 && (
										<td rowSpan={itemsArray.length}>
											{invoice.idOrderHistory}
										</td>
									)}

									<td>{item.name}</td>

									<td className={classes.alignRight}>
										{item.quantity} {item.units}
									</td>

									{itemIndex === 0 && (
										<td rowSpan={itemsArray.length}>
											{invoice.date}
										</td>
									)}
								</tr>
							);
						});
					})}
				</tbody>
			</table>

			{/* ================= TABLE: ПІДСУМКИ ================= */}
			<h3 className={classes.sectionTitle}>
				📊 Загальна кількість товарів взятих на складі:
			</h3>

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
							<td className={classes.alignRight}>
								{item.totalQuantity} {item.units}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{invoicesSummary.length > 0 && (
				<UsedMaterialsTable
					selectedUser={selectedUser}
					invoicesSummary={invoicesSummary}
					usedMaterials={usedMaterials}
					fetchUsedMaterials={fetchUsedMaterials}
					addUsedMaterial={addUsedMaterial}
					fetchUsedMaterialsHistory={fetchUsedMaterialsHistory}
				/>
			)}


			{/* ================= TABLE: ЗАЛИШКИ ================= */}
			{isAdmin && stock && (
				<>
					<h3 className={classes.sectionTitle}>
						📦 Залишки на складі:
					</h3>

					<table className={classes.table}>
						<thead>
							<tr>
								<th style={{ width: "75%" }}>Товари</th>
								<th style={{ width: "25%" }} className={classes.alignRight}>Кі-сть</th>
							</tr>
						</thead>

						<tbody>
							{stock
								.filter(s => s.visibleproduct)
								.map((s, index) => (
									<tr key={index}>
										<td>{s.name}</td>
										<td className={classes.alignRight}>
											{s.quantity} {s.units}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</>
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
})

export default connect(mapStateToProps, {
	fetchInvoices, fetchInvoicesSummary, fetchOrderNotifications, deleteNotification, clearNotifications, fetchUsedMaterials,
	addUsedMaterial
})(InvoicesPage)


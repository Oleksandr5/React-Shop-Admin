import React, { Component } from 'react'
import classes from './ProductsList.module.css'
import { NavLink } from 'react-router-dom'
import Loader from '../../components/UI/Loader/Loader'
import Button from '../../components/UI/Button/Button'
import Product from '../Product/Product'
import MenuToggle from '../../components/Navigation/MenuToggle/MenuToggle'
import Drawer from '../../components/Navigation/Drawer/Drawer'
import { connect } from 'react-redux'
import { Navbar, Nav, Form, FormControl } from 'react-bootstrap'
import orderBy from 'lodash/orderBy'
import { toggleFilterHandler, menuCloseHandler, resetFilter, promotionFilter, categoriesFilter, subcategoriesFilter, filterCondition, setFilterBy, setSearchQuery, setCurrentPage, setTotalProductsCount, changePortionNumber } from '../../redux/actions/products'
import { onScroll, topFunction } from '../../redux/actions/menu'

class ProductsList extends Component {

	state = {
		promotionFilter: false
	}

	renderCategories() {

		if (this.props.categories[0]) {
			return this.props.categories.map(сategory => {

				return (

					<li
						key={сategory.id}
						className="mr-3 border-top border-bottom liCategory"
					>
						<NavLink
							to={'/сat/' + сategory.id}
							className={`filter_link ${classes.filter_link_cat}`}
							data-categoryid={сategory.id}
							onClick={event => this.clickFilters({ filter: 'categoriesFilter', event })} >
							{сategory.name}
						</NavLink>
						<ul>
							{сategory.subcategories
								? сategory.subcategories.map(subcategory => {
									return (

										<li
											key={subcategory.id}
											className="mr-3 ml-3 liSubcategory"
										>
											<NavLink
												to={'/subcat/' + subcategory.id}
												className={`filter_link ${classes.filter_link_subcat}`}
												data-categoryid={сategory.id}
												data-subcategoryid={subcategory.id}
												onClick={event => this.clickFilters({ filter: 'subcategoriesFilter', event })} >
												{subcategory.name}
											</NavLink>

										</li>

									)
								})
								: null
							}
						</ul>
					</li>

				)
			})
		} else {
			return (

				this.props.loading ? <Loader />
					: this.props.error ? <h3 className="error text-danger text-center mx-auto" >{this.props.error.message}</h3> : <h5>Немає категорій!!! </h5>
			)
		}


	}

	sortBy(products, filterBy) {

		switch (filterBy) {
			case 'all':
				return products
			case 'popularity':
				return orderBy(products, 'popularity', 'desc')
			case 'promotion':
				return orderBy(products, 'promotion', 'desc')
			case 'price':
				return orderBy(products, 'price', 'asc')
			case 'name':
				return orderBy(products, 'name', 'asc')
			default:
				return products

		}

	}

	filterProducts(products, searchQuery) {

		return products.filter(product => product.name.toLowerCase().indexOf(searchQuery.toLowerCase()) >= 0
		)

	}

	searchProducts(products, searchQuery, filterBy) {

		return this.sortBy(this.filterProducts(products, searchQuery), filterBy)

	}

	renderProducts() {

		if (this.props.selectedProducts[0] === null) {
			return <h3 className="mx-auto text-danger m-5">В даній категорії немає продуктів</h3>
		} else {
			if (this.props.products[0]) {

				const productsForCustomers = this.searchProducts(orderBy(this.props.products, ['promotion', 'price', 'name'], ['desc', 'asc', 'desc']), this.props.searchQuery, this.props.filterBy).filter(prod => this.props.filterCondition(prod, this.props.filterProps)).map(product => {

					return (

						<Product key={product.id} name={product.name} price={product.price} units={product.units} stepunits={product.stepunits} quantity={product.quantity} describe={product.describe} image={product.image} id={product.id} promotion={product.promotion} />
					)

				})

				if (productsForCustomers.length) {

					const selectProductsForCustomers = productsForCustomers.splice((this.props.currentPage - 1) * this.props.pageSize, this.props.pageSize)

					return selectProductsForCustomers
				} else {
					return (
						<div className="w-100 d-flex justify-content-center align-items-center align-self-center align-self-md-start">
							<h4 className="mx-auto text-center text-danger">В даній категорії немає таких товарів !!! </h4>
						</div>

					)
				}

			} else {
				return (
					this.props.loading ? <Loader />
						: this.props.error ? <h3 className="error text-danger text-center mx-auto" >{this.props.error.message}</h3> : <h2 className="mx-auto text-center">В магазинів немає товарів !!! </h2>
				)
			}

		}



	}

	clickFilters = obj => {

		const { filter, event } = obj

		if (filter === 'resetFilter') {

			this.props.resetFilter()
			this.props.changePortionNumber(1)
			this.props.setFilterBy('popularity')

			const sortLinks = [...document.querySelectorAll('.aSort .nav-link')]
			sortLinks.forEach(link => {
				link.classList.remove('active')
			})

			const sortLinksThis = [...document.querySelectorAll(`.nav-link[name = popularity]`)]
			sortLinksThis.forEach(link => {
				link.classList.add('active')
			})

			this.setState({
				promotionFilter: false,

			})

		} else if (filter === 'promotionFilter') {
			const promotionLinks = [...document.querySelectorAll('.promotionFilter')]

			promotionLinks.forEach(link => {
				link.classList.toggle('active')
			})

			let status
			this.props.changePortionNumber(1)
			if (this.state.promotionFilter === false) {
				status = true
				console.log(status)
				this.props.promotionFilter({ status })
				this.setState({ promotionFilter: true })
			} else {
				status = false
				console.log(status)
				this.props.promotionFilter({ status })
				this.setState({ promotionFilter: false })
			}
		} else if (filter === 'categoriesFilter') {
			this.props.categoriesFilter({ categoryid: +event.target.dataset.categoryid, products: this.props.products })
			this.props.changePortionNumber(1)
			this.setState({
				promotionFilter: false
			})

		} else if (filter === 'subcategoriesFilter') {
			this.props.subcategoriesFilter({ categoryid: +event.target.dataset.categoryid, subcategoryid: +event.target.dataset.subcategoryid, products: this.props.products })
			this.props.changePortionNumber(1)
			this.setState({
				promotionFilter: false
			})

		}

	}

	setSearchQuery(e) {

		if (this.props.products[0]) {

			const productsForCustomers = this.searchProducts(orderBy(this.props.products, ['promotion', 'price', 'name'], ['desc', 'asc', 'desc']), e, this.props.filterBy).filter(prod => this.props.filterCondition(prod, this.props.filterProps)).map(product => true)

			const totalProductsCount = productsForCustomers.length

			this.props.setSearchQuery(e, totalProductsCount)

		}

	}

	componentDidMount() {

	}

	render() {

		let pageSize = this.props.pageSize
		let totalProductsCount = this.props.totalProductsCount
		let pagesCount = Math.ceil(totalProductsCount / pageSize)

		let portionSize = this.props.portionSize
		let portionCount = Math.ceil(pagesCount / portionSize)
		let portionNumber = this.props.portionNumber
		let leftPortionNumber = (portionNumber - 1) * portionSize + 1
		let rightPortionNumber = portionNumber * portionSize

		let pages = []

		for (let i = 1; i <= pagesCount; i++) {
			pages.push(i);
		}

		return (
			<div className={`row h-100 flex-column flex-md-row ${classes.ProductsList}`}>

				<Drawer
					isOpen={this.props.filter}
					onClose={this.props.menuCloseHandler}
					links={this.props.categories}
					nameDrawer="Категорії"
					onToggle={this.props.toggleFilterHandler}
				/>

				<div className={`d-none position-relative d-md-block col-md-3 pl-5 pl-md-3 ${classes.blockCategory}`}>

					{this.props.categories[0]
						?
						<div className={`position-absolute ${classes.topFilters}`}>
							<h3>Категорії</h3>
							<span className={`d-inline-block mb-3 ${classes.resetFilter}`} onClick={event => this.clickFilters({ filter: 'resetFilter', event })} >Скинути фільтри <i className="ml-1 ml-lg-0 fa fa-hand-pointer-o" aria-hidden="true"></i></span>
							<br />
							<span className={`d-inline-block mb-3 promotionFilter ${classes.promotionFilter}`} onClick={event => this.clickFilters({ filter: 'promotionFilter', event })} >Акції <i className="ml-1 ml-lg-0 fa fa-hand-pointer-o" aria-hidden="true"></i></span>
						</div>
						: <h3>Категорії</h3>}

					<ul className={`d-flex d-md-block overflow-auto webkit_scrollbar_width webkit_scrollbar_style renderCategories ${classes.renderCategories}`}>
						{this.renderCategories()}
					</ul>
				</div>



				<div className={`col col-md-9  px-3 ${classes.blockProducts}`}>

					<div className="d-md-none d-flex flex-column rounded filterToggle">
						<div className="d-flex justify-content-center align-items-center menuToggle">
							<MenuToggle
								onToggle={this.props.toggleFilterHandler}
								isOpen={this.props.filter}
								iconOpen="fa-hand-pointer-o"
								iconClose="fa-hand-pointer-o"
								className="text-center"
								nameToggle="Каталог товарів"
							/>
						</div>

						<Navbar className={`w-100 border d-md-flex flex-md-column align-items-start navbarSort ${classes.navbarSortMob}`} collapseOnSelect expand="md" bg="light" variant="light">

							<Navbar.Brand href="#sort" className="font-weight-bold">Сортування по:</Navbar.Brand>
							<Navbar.Toggle className={`btnToggleSort`} aria-controls="responsive-navbar-nav" />
							<Navbar.Collapse className={`w-100 d-md-flex justify-content-between bg-light`} id="responsive-navbar-nav" >
								<Nav className="mr-auto aSortMobile aSort">
									<Nav.Link href="#sort_by_popularity" name="popularity" onClick={this.props.setFilterBy.bind(this, 'popularity')}>Популярні</Nav.Link>
									<Nav.Link href="#sort_by_promotion" name="promotion" onClick={this.props.setFilterBy.bind(this, 'promotion')}>Акція</Nav.Link>
									<Nav.Link href="#sort_by_price" name="price" onClick={this.props.setFilterBy.bind(this, 'price')}>Ціна</Nav.Link>
									<Nav.Link href="#sort_by_name" name="name" onClick={this.props.setFilterBy.bind(this, 'name')}>Назва</Nav.Link>
								</Nav>
							</Navbar.Collapse>
						</Navbar>
						<Navbar className={`w-100 border position-relative searchBooks`} collapseOnSelect expand="md" bg="light" variant="light">
							<Nav className={`w-100 position-relative`}>
								<FormControl type="text" value={this.props.searchQuery} placeholder="Пошук товарів" className="w-100" onChange={e => this.setSearchQuery(e.target.value)} />
								<i className="fa fa-search" aria-hidden="true"></i>
							</Nav>
						</Navbar>
						<div className={`mb-1 bg-light d-flex justify-content-center align-items-center ${classes.pagination}`} >
							{
								portionNumber > 1 ?
									<Button
										type="button"
										onClick={() => this.props.changePortionNumber(portionNumber - 1)}
										className={`btn btn-success ${classes.arrow_pagination}`}
									>
										<i className="fa fa-arrow-left" aria-hidden="true"></i>
									</Button>
									: null

							}
							{
								pages.filter(p => p >= leftPortionNumber && p <= rightPortionNumber).map(p => {
									return <span key={p + Math.random()} className={this.props.currentPage === p ? classes.selectedPage : null} onClick={() => this.props.setCurrentPage(p)} >{p}</span>
								})
							}
							{
								portionCount > portionNumber ?
									<Button
										type="button"
										onClick={() => this.props.changePortionNumber(portionNumber + 1)}
										className={`btn btn-success ${classes.arrow_pagination}`}
									>
										<i className="fa fa-arrow-right" aria-hidden="true"></i>
									</Button>
									: null

							}
						</div>

					</div>

					{this.props.loading

						? <Loader />
						: <div className={`row align-items-start px-3 overflow-auto webkit_scrollbar_width webkit_scrollbar_style scrollToTop ${classes.Products}`} onScroll={this.props.onScroll}>


							<Navbar className={`w-100 border d-none d-md-flex flex-md-column align-items-start navbarSort ${classes.navbarSort}`} collapseOnSelect expand="md" bg="light" variant="light">
								<Navbar.Brand href="#sort" className="font-weight-bold">Сортування по:</Navbar.Brand>
								<Navbar.Toggle className={`btnToggleSort`} aria-controls="responsive-navbar-nav" />
								<Navbar.Collapse className={`w-100 d-md-flex justify-content-between align-items-center`} id="responsive-navbar-nav">
									<Nav className="mr-auto aSortDesktop aSort">
										<Nav.Link href="#sort_by_popularity" name="popularity" onClick={this.props.setFilterBy.bind(this, 'popularity')}>Популярні</Nav.Link>
										<Nav.Link href="#sort_by_promotion" name="promotion" onClick={this.props.setFilterBy.bind(this, 'promotion')}>Акція</Nav.Link>
										<Nav.Link href="#sort_by_price" name="price" onClick={this.props.setFilterBy.bind(this, 'price')}>Ціна</Nav.Link>
										<Nav.Link href="#sort_by_name" name="name" onClick={this.props.setFilterBy.bind(this, 'name')}>Назва</Nav.Link>
									</Nav>
									<Nav className={`position-relative`}>
										<FormControl type="text" value={this.props.searchQuery} placeholder="Пошук товарів" className="mr-2" onChange={e => this.setSearchQuery(e.target.value)} />
										<i className="fa fa-search" aria-hidden="true"></i>
									</Nav>
								</Navbar.Collapse>
								<div className={`w-100 bg-light d-flex justify-content-center align-items-center ${classes.pagination_md}`} >
									{
										portionNumber > 1 ?
											<Button
												type="button"
												onClick={() => this.props.changePortionNumber(portionNumber - 1)}
												className={`btn btn-success ${classes.arrow_pagination}`}
											>
												<i className="fa fa-arrow-left" aria-hidden="true"></i>
											</Button>
											: null

									}
									{
										pages.filter(p => p >= leftPortionNumber && p <= rightPortionNumber).map(p => {
											return <span key={p + Math.random()} className={this.props.currentPage === p ? classes.selectedPage : null} onClick={() => this.props.setCurrentPage(p)} >{p}</span>
										})
									}
									{
										portionCount > portionNumber ?
											<Button
												type="button"
												onClick={() => this.props.changePortionNumber(portionNumber + 1)}
												className={`btn btn-success ${classes.arrow_pagination}`}
											>
												<i className="fa fa-arrow-right" aria-hidden="true"></i>
											</Button>
											: null

									}
								</div>
							</Navbar>


							{this.renderProducts()}

							<Button
								type="button"
								style={{ display: 'none' }}
								id={'goToTop'}
								onClick={this.props.topFunction}
								className={`btn btn-danger ${classes.btnTop}`}
							>
								<i className="fa fa-arrow-up" aria-hidden="true"></i>
							</Button>
						</div>
					}

				</div>

			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		customers: state.inform.customers,
		nameShop: state.inform.nameShop,
		orders: state.products.orders,
		products: state.products.products,
		idLastProduct: state.products.idLastProduct,
		categories: state.products.categories,
		selectedProducts: state.products.selectedProducts,
		loading: state.products.loading,
		filter: state.products.filter,
		filterBy: state.products.filterBy,
		searchQuery: state.products.searchQuery,
		customerId: state.inform.customerId,
		filterProps: state.products.filterProps,
		error: state.products.error,
		pageSize: state.products.pageSize,
		totalProductsCount: state.products.totalProductsCount,
		currentPage: state.products.currentPage,
		portionSize: state.products.portionSize,
		portionNumber: state.products.portionNumber
	}
}

function mapDispatchToProps(dispatch) {
	return {
		toggleFilterHandler: () => dispatch(toggleFilterHandler()),
		menuCloseHandler: () => dispatch(menuCloseHandler()),
		categoriesFilter: obj => dispatch(categoriesFilter(obj)),
		subcategoriesFilter: obj => dispatch(subcategoriesFilter(obj)),
		resetFilter: () => dispatch(resetFilter()),
		promotionFilter: obj => dispatch(promotionFilter(obj)),
		onScroll: () => dispatch(onScroll()),
		topFunction: () => dispatch(topFunction()),
		filterCondition: (objproduct, objprops) => dispatch(filterCondition(objproduct, objprops)),
		setFilterBy: val => dispatch(setFilterBy(val)),
		setSearchQuery: (val, totalProductsCount) => dispatch(setSearchQuery(val, totalProductsCount)),
		setCurrentPage: currentPage => dispatch(setCurrentPage(currentPage)),
		setTotalProductsCount: totalProductsCount => dispatch(setTotalProductsCount(totalProductsCount)),
		changePortionNumber: portionNumber => dispatch(changePortionNumber(portionNumber))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductsList)
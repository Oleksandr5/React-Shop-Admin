// src/components/Navigation/Drawer/Drawer.js
import React, { Component } from 'react';
import classes from './Drawer.module.css';
import Backdrop from '../../UI/Backdrop/Backdrop';
import Loader from '../../UI/Loader/Loader';
import { NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import {
	resetFilter,
	promotionFilter,
	categoriesFilter,
	subcategoriesFilter,
	changePortionNumber
} from '../../../redux/actions/products';
import { menuCloseHandler, toggleMenuHandler } from '../../../redux/actions/menu';

class Drawer extends Component {
	state = {
		promotionFilter: false
	};

	// Рендер лінків з підтримкою adminOnly
	renderLinks() {
		if (!this.props.links || this.props.links.length === 0) {
			return this.props.loading ? (
				<Loader />
			) : this.props.error ? (
				<h3 className="error text-danger text-center mx-auto">{this.props.error.message}</h3>
			) : (
				<h5>Немає категорій!!!</h5>
			);
		}

		return this.props.links
			.filter(link => !link.adminOnly || (link.adminOnly && this.props.isAdmin))
			.map((link, index) => {
				if (!link.subcategories) {
					return (
						<li key={index}>
							<NavLink
								to={link.to || '/'}
								exact={link.exact || true}
								activeClassName={classes.active}
								data-categoryid={link.id}
								onClick={this.props.menuCloseHandler}
							>
								{link.name}
							</NavLink>
						</li>
					);
				} else {
					return (
						<li key={index}>
							<NavLink
								id={`filter_link_${link.id}`}
								className={`filter_link ${classes.filter_link}`}
								to={'/cat/' + link.id}
								exact={link.exact || true}
								data-categoryid={link.id}
								onClick={event => this.clickFilters({ filter: 'categoriesFilter', event })}
							>
								{link.name}
							</NavLink>
							<ul>
								{link.subcategories.map(sub => (
									<li key={sub.id} className="mr-3 ml-3">
										<NavLink
											id={`filter_link_${link.id}_${sub.id}`}
											to={'/subcat/' + sub.id}
											className={`text-primary filter_link ${classes.filter_link}`}
											data-categoryid={link.id}
											data-subcategoryid={sub.id}
											onClick={event =>
												this.clickFilters({ filter: 'subcategoriesFilter', event })
											}
										>
											{sub.name}
										</NavLink>
									</li>
								))}
							</ul>
						</li>
					);
				}
			});
	}

	clickFilters = obj => {
		const { filter, event } = obj;

		if (filter === 'resetFilter') {
			this.props.resetFilter();
			this.props.changePortionNumber(1);
			this.setState({ promotionFilter: false });
		} else if (filter === 'promotionFilter') {
			let status = !this.state.promotionFilter;
			this.props.promotionFilter({ status });
			this.setState({ promotionFilter: status });
			this.props.changePortionNumber(1);
		} else if (filter === 'categoriesFilter') {
			this.props.categoriesFilter({
				categoryid: +event.target.dataset.categoryid,
				products: this.props.products
			});
			this.props.changePortionNumber(1);
			this.setState({ promotionFilter: false });
		} else if (filter === 'subcategoriesFilter') {
			this.props.subcategoriesFilter({
				categoryid: +event.target.dataset.categoryid,
				subcategoryid: +event.target.dataset.subcategoryid,
				products: this.props.products
			});
			this.props.changePortionNumber(1);
			this.setState({ promotionFilter: false });
		}
	};

	render() {
		const cls = [classes.Drawer];
		if (!this.props.isOpen) cls.push(classes.close);
		if (this.props.nameDrawer === 'Категорії') cls.push(classes.drawerCategory);
		if (this.props.nameDrawer === 'Меню') cls.push(classes.drawerMenu);

		return (
			<React.Fragment>
				<nav
					className={`pt-0 overflow-auto webkit_scrollbar_width webkit_scrollbar_style ${cls.join(
						' '
					)}`}
				>
					<div className={`pt-3 ${classes.topFilters}`}>
						<h3>{this.props.nameDrawer}</h3>
						{this.props.nameDrawer === 'Категорії' && this.props.categories[0] && (
							<div className="mt-3">
								<span
									className={`d-inline-block mb-3 ${classes.resetFilter}`}
									onClick={event => this.clickFilters({ filter: 'resetFilter', event })}
								>
									Скинути фільтри <i className="ml-1 ml-lg-0 fa fa-hand-pointer-o" aria-hidden="true" />
								</span>
								<br />
								<span
									className={`d-inline-block mb-3 promotionFilter ${classes.promotionFilter}`}
									onClick={event => this.clickFilters({ filter: 'promotionFilter', event })}
								>
									Акції <i className="ml-1 ml-lg-0 fa fa-hand-pointer-o" aria-hidden="true" />
								</span>
							</div>
						)}
					</div>

					<ul>{this.renderLinks()}</ul>
					<i className={`fa fa-times position-absolute ${classes.iconClose}`} onClick={this.props.onToggle} />
				</nav>
				{this.props.isOpen && <Backdrop onClick={this.props.onClose} />}
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => ({
	products: state.products.products,
	categories: state.products.categories,
	loading: state.products.loading,
	error: state.products.error,
	isAdmin: state.inform.isAdmin // перевірка для adminOnly
});

const mapDispatchToProps = dispatch => ({
	categoriesFilter: obj => dispatch(categoriesFilter(obj)),
	subcategoriesFilter: obj => dispatch(subcategoriesFilter(obj)),
	resetFilter: () => dispatch(resetFilter()),
	promotionFilter: obj => dispatch(promotionFilter(obj)),
	menuCloseHandler: () => dispatch(menuCloseHandler()),
	toggleMenuHandler: () => dispatch(toggleMenuHandler()),
	changePortionNumber: portionNumber => dispatch(changePortionNumber(portionNumber))
});

export default connect(mapStateToProps, mapDispatchToProps)(Drawer);

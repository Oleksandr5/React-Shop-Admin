import React from 'react'
import classes from './MenuToggle.module.css'

const MenuToggle = props => {

	const cls = [
		classes.MenuToggle,
		'fa'
	]


	if (props.isOpen) {
		cls.push(props.iconOpen)
		cls.push('text-white')
		cls.push(classes.open)
	} else {
		cls.push(props.iconClose)
		cls.push(props.className)
	}

	return (
		<React.Fragment>
			<label onClick={props.onToggle} >{props.nameToggle}</label>

			<i
				className={cls.join(' ')}
				onClick={props.onToggle}
			/>


		</React.Fragment>
	)
}

export default MenuToggle
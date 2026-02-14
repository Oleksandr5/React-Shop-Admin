import React from 'react'
import classes from './Button.module.css'

const Button = props => {

	const cls = [
		classes.Button,
		classes[props.selfType],
		props.className
	]

	return (
		<button
			type={props.type}
			style={props.style}
			onClick={props.onClick}
			className={cls.join(' ')}
			id={props.id}
			data-idthiscustomers={props.data_idthiscustomers}
			disabled={props.disabled}
		>
			{props.children}
		</button>
	)
}

export default Button
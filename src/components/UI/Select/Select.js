import React from 'react'
import classes from './Select.module.css'

const Select = props => {
	const htmlFor = `${props.name}-${Math.random()}`

	return (
		<div className={classes.Select}>
			<label htmlFor={htmlFor} className={props.classNameLabel}>{props.label}</label>
			<select
				id={htmlFor}
				className={props.className}
				value={props.value}
				onChange={props.onChange}
				onClick={props.onClick}
				disabled={props.disabled}
				name={props.name}
			>
				{props.option.map((option, index) => {
					return (
						<option
							value={option.value}
							className={option.className}
							key={Math.random() + index * 2}
							selected={option.selected}
							disabled={option.disabled}
						>
							{option.text}
						</option>
					)
				})}
			</select>
		</div>
	)

}

export default Select
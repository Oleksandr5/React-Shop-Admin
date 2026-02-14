import React from 'react'
import classes from './Input.module.css'

function isInvalid({ valid, touched, shouldValidate }) {
	return !valid && touched && shouldValidate
}

const Input = props => {

	const inputType = props.type || 'text'
	const cls = [classes.Input]
	const htmlFor = `${inputType}-${Math.random()}`

	if (isInvalid(props)) {
		cls.push(classes.invalid)
	}

	return (
		<div className={cls.join(' ')}>
			<label className={props.labelDisplay} htmlFor={props.htmlFor || htmlFor}>{props.label}</label>
			<input
				type={inputType}
				readOnly={props.readOnly}
				className={props.className}
				id={props.id || htmlFor}
				name={props.name}
				value={props.value}
				defaultValue={props.defaultValue}
				ref={props.ref}
				onChange={props.onChange}
				onClick={props.onClick}
				onBlur={props.onBlur}
				onFocus={props.onFocus}
				placeholder={props.placeholder}
				data-price={props.data_price}
				data-quantity={props.data_quantity}
				min={props.min}
				step={props.step}
				max={props.max}
			/>

			{ isInvalid(props) ? <span>{props.errorMessage || 'Введіть правельне значення'}</span> : null}


		</div>
	)

}

export default Input
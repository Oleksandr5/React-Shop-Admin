import { TOGGLE_MENU_HANDLER, MENU_CLOSE_HANDLER } from './actionTypes'

export function toggleMenuHandler() {
	return {
		type: TOGGLE_MENU_HANDLER
	}
}

export function menuCloseHandler() {
	return {
		type: MENU_CLOSE_HANDLER
	}
}

export function onScroll() {
	return (dispatch, getState) => {
		// 1. Спочатку знаходимо кнопку
		const btnGoToTop = document.querySelector("#goToTop");

		// 2. Якщо кнопки немає (наприклад, зараз показується Loader), просто виходимо
		if (!btnGoToTop) return;

		// 3. Знаходимо батьківський контейнер
		const scrollDiv = btnGoToTop.closest(".scrollToTop");

		// 4. Якщо контейнер не знайдено, теж виходимо, щоб не було помилки
		if (!scrollDiv) return;

		// 5. Тільки тепер вішаємо подію
		scrollDiv.onscroll = function () {
			scrollFunction();
		};

		function scrollFunction() {
			// Додаємо перевірку і тут, про всяк випадок
			if (scrollDiv && btnGoToTop) {
				if (scrollDiv.scrollTop > 20) {
					btnGoToTop.style.display = "block";
				} else {
					btnGoToTop.style.display = "none";
				}
			}
		}
	}
}

export function onScrollCart() {

	return (dispatch, getState) => {

		let scrollDiv = document.querySelector("#goToTopCart").closest(".scrollToTop")

		//Get the button
		let btnGoToTop = document.querySelector("#goToTopCart")

		// When the user scrolls down 20px from the top of the document, show the button
		scrollDiv.onscroll = function () { scrollFunction() };

		function scrollFunction() {
			if (scrollDiv.scrollTop > 20) {
				btnGoToTop.style.display = "block";
			} else {
				btnGoToTop.style.display = "none";
			}
		}

	}

}


export function topFunction() {

	return (dispatch, getState) => {

		let scrollDiv = document.querySelector("#goToTop").closest(".scrollToTop")

		let scrolled = scrollDiv.scrollTop
		let timer

		scrollToTop()

		function scrollToTop() {
			if (scrolled > 0) {

				scrollDiv.scrollTo(0, scrolled)
				scrolled = scrolled - 60
				timer = setTimeout(scrollToTop, 10)
			} else {
				clearTimeout(timer)
				scrollDiv.scrollTo(0, 0)
			}
		}

		//        scrollDiv.scrollTop = 0

	}

}

export function leftFunction() {

	return (dispatch, getState) => {

		let scrollDiv = document.querySelector("#goToLeft").closest(".scrollToLeft")

		scrollDiv.scrollLeft -= 300

	}

}

export function rightFunction() {

	return (dispatch, getState) => {

		let scrollDiv = document.querySelector("#goToRight").closest(".scrollToRight")

		scrollDiv.scrollLeft += 300

	}

}

export function topFunctionCart() {

	return (dispatch, getState) => {

		let scrollDiv = document.querySelector("#goToTopCart").closest(".scrollToTop")

		let scrolled = scrollDiv.scrollTop
		let timer

		scrollToTop()

		function scrollToTop() {
			if (scrolled > 0) {

				scrollDiv.scrollTo(0, scrolled)
				scrolled = scrolled - 60
				timer = setTimeout(scrollToTop, 10)
			} else {
				clearTimeout(timer)
				scrollDiv.scrollTo(0, 0)
			}
		}

		//        scrollDiv.scrollTop = 0

	}

}

export function bottomFunctionCart() {

	return (dispatch, getState) => {

		let scrollDiv = document.querySelector("#goToBottomCart").closest(".scrollToBottom")

		let scrolled = scrollDiv.scrollTop
		let scrolledTo = scrollDiv.scrollTop + 400
		let timer

		scrollToBottom()

		function scrollToBottom() {
			if (scrolled < scrolledTo) {

				scrollDiv.scrollTo(0, scrolled)
				scrolled = scrolled + 10
				timer = setTimeout(scrollToBottom, 10)
			} else {
				clearTimeout(timer)
			}
		}

		//        scrollDiv.scrollTop = 0

		//        scrollDiv.scrollTop += 200

	}

}

export function errorFunctionCart() {

	return (dispatch, getState) => {

		let scrollDiv = document.querySelector(".scrollToErrorCart")

		let scrolled = scrollDiv.scrollTop
		let scrolledTo = scrollDiv.scrollTop - 200
		let timer

		scrollToBottom()

		function scrollToBottom() {
			if (scrolled > scrolledTo) {

				scrollDiv.scrollTo(0, scrolled)
				scrolled = scrolled - 10
				timer = setTimeout(scrollToBottom, 10)
			} else {
				clearTimeout(timer)
			}
		}

		//        scrollDiv.scrollTop = 0

		//        scrollDiv.scrollTop += 200

	}

}
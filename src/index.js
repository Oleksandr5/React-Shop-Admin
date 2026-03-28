import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom'
import reportWebVitals from './reportWebVitals';
import { createStore, compose, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'
import rootReducer from './redux/rootReducer'
import firebase from "firebase"
import reduxThunk from 'redux-thunk'
import logger from 'redux-logger'
import 'bootstrap/dist/css/bootstrap.min.css'

const composeEnhancers =
	typeof window === 'object' &&
		window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
		window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
		}) : compose;

// const firebaseConfig = {
// 	apiKey: "AIzaSyCTUkCqutmrXTdzkG6I4O9v8AHwcj0n-Qg",
// 	authDomain: "project-react-shop.firebaseapp.com",
// 	databaseURL: "https://project-react-shop-default-rtdb.firebaseio.com",
// 	projectId: "project-react-shop",
// 	storageBucket: "project-react-shop.appspot.com",
// 	messagingSenderId: "424014729575",
// 	appId: "1:424014729575:web:8f440530c56b53d36f1fc2"
// }

const firebaseConfig = {
	apiKey: "AIzaSyC9TpdNgHfqsqzM8SPel3tabZ_Boq4MeFU",
	authDomain: "admin-react-shop.firebaseapp.com",
	databaseURL: "https://admin-react-shop-default-rtdb.europe-west1.firebasedatabase.app",
	projectId: "admin-react-shop",
	storageBucket: "admin-react-shop.firebasestorage.app",
	messagingSenderId: "783231847579",
	appId: "1:783231847579:web:15aeed1f5e9624bbfa4a3e"
};

firebase.initializeApp(firebaseConfig)

const store = createStore(rootReducer, composeEnhancers(applyMiddleware(logger, reduxThunk)))


const app = (
	<Provider store={store}>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</Provider>

)

ReactDOM.render(app, document.getElementById('root'));

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

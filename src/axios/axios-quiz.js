import axios from 'axios'

export default axios.create({
	baseURL: 'https://project-react-shop-default-rtdb.firebaseio.com/'
})
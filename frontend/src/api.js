import axios from 'axios';

// Comment gérer différentes URLs pour le développement, la pré-production et la production ?
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

export default api;

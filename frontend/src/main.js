import { createApp } from 'vue'
import Home from './pages/Header.vue'
import './assets/tailwind.css';
import router from './router/index.js'  

createApp(Home).use(router).mount('#app')

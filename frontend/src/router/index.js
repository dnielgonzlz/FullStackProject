import { createRouter, createWebHistory } from 'vue-router';
import Landing from '../pages/Landing.vue';
import Login from '../pages/Login.vue';
import SignUp from '../pages/SignUp.vue';
import SearchEvent from '../pages/SearchEvent.vue';
import CreateEvent from '../views/CreateEvent.vue';
import SingleEvent from '../views/SingleEvent.vue';

const routes = [
    { path: '/', component: Landing },
    { path: '/login', component: Login },
    { path: '/signup', component: SignUp },
    { path: '/search', component: SearchEvent},
    { path: '/event/:id', component: SingleEvent, name: 'SingleEvent'},
    { path: '/create-event', component: CreateEvent},
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;

<template>
  <div class="min-h-screen bg-black flex flex-col justify-between p-4 md:p-8">
    <!-- Main header container with navigation -->
    <header class="w-full max-w-6xl mx-auto">
      <nav class="flex justify-between items-center">
        <!-- Site logo/home link -->
        <a 
          @click="navigateHome" 
          class="text-2xl md:text-3xl font-bold text-blue cursor-pointer"
        >
          Eventitude
        </a>
        
        <!-- Authentication navigation buttons -->
        <div class="flex items-center space-x-2 md:space-x-4">
          <!-- Show logout button for authenticated users -->
          <template v-if="isAuthenticated">
            <button 
              @click="handleLogout"
              class="text-blue hover:text-white transition-colors font-bold"
            >
              Log Out
            </button>
          </template>
          <!-- Show login/signup buttons for non-authenticated users -->
          <template v-else>
            <router-link 
              to="/login" 
              class="text-blue hover:text-white transition-colors font-bold"
            >
              Login
            </router-link>
            <router-link 
              to="/signup" 
              class="bg-blue font-bold text-white px-3 py-1 md:px-4 md:py-2 rounded-md hover:opacity-90 transition-colors text-sm md:text-base"
            >
              Sign Up
            </router-link>
          </template>
        </div>
      </nav>
    </header>

    <!-- Success message display area -->
    <div v-if="successMessage" class="mb-4 p-4 bg-green-500 text-white rounded-md text-center">
      {{ successMessage }}
    </div>

    <!-- Router view with page transition animations -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script>
import { usersService } from '../services/users.service.js';
import { eventsService } from '../services/events.service.js';

export default {
  // Component state management
  data() {
    return {
      events: [],          // Stores list of events
      categories: [],      // Stores available event categories
      error: '',          // General error message storage
      categoriesError: '', // Category-specific error message
      loading: true,      // Loading state for events
      loadingCategories: true, // Loading state for categories
      successMessage: ''  // Success message display
    }
  },

  // Computed properties
  computed: {
    // Checks if user is authenticated based on session token
    isAuthenticated() {
      return !!localStorage.getItem('session_token');
    }
  },

  // Component methods
  methods: {
    // Handles user logout process
    handleLogout() {
      const token = localStorage.getItem('session_token');
      
      // Handle case where no token exists
      if (!token) {
        localStorage.removeItem('session_token');
        window.location.replace('/');
        return;
      }
      
      // Process logout through API
      usersService.logout()
        .then(() => {
          localStorage.removeItem('session_token');
          this.successMessage = 'Logged out Successfully!';
          
          // Redirect after successful logout
          setTimeout(() => {
            window.location.replace('/');
          }, 1000);
        })
        .catch(error => {
          console.error('Logout failed:', error);
          // Ensure local logout even if API fails
          localStorage.removeItem('session_token');
          window.location.replace('/');
        });
    },

    // Fetches events from API
    loadEvents() {
      eventsService.getEvents()
        .then(events => {
          this.events = events;
          this.loading = false;
        })
        .catch(error => {
          this.error = error;
          this.loading = false;
        });
    },

    // Fetches categories from API
    loadCategories() {
      eventsService.getCategories()
        .then(response => {
          this.categories = response.categories;
          this.loadingCategories = false;
        })
        .catch(error => {
          this.categoriesError = error;
          this.loadingCategories = false;
        });
    },

    navigateHome() {
      setTimeout(() => {
        window.location.replace('/');
      }, 50);
    }
  },

  // Lifecycle hook - component initialization
  mounted() {
    this.loadEvents();
    this.loadCategories();
  }
}
</script>

<style scoped>
/* Page transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
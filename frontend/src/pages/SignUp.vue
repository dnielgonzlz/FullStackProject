<template>
  <!-- Main signup container with responsive layout -->
  <div class="min-h-screen flex items-center justify-center">
    <!-- Signup form card with dark theme -->
    <div class="bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-md">
      <h2 class="text-3xl font-bold text-blue mb-6 text-center">Sign Up</h2>
      
      <!-- Error message display -->
      <div v-if="error" class="mb-4 p-4 bg-red-500 text-white rounded-md text-center">
        {{ error }}
      </div>

      <!-- Registration form with validation -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- First Name input field -->
        <div>
          <label for="firstName" class="block text-white mb-2">First Name</label>
          <input
            id="firstName"
            v-model="formData.firstName"
            type="text"
            class="w-full px-4 py-2 rounded-md bg-gray-800 text-black border border-gray-700 focus:border-blue focus:outline-none"
            required
          />
        </div>

        <!-- Last Name input field -->
        <div>
          <label for="lastName" class="block text-white mb-2">Last Name</label>
          <input
            id="lastName"
            v-model="formData.lastName"
            type="text"
            class="w-full px-4 py-2 rounded-md bg-gray-800 text-black border border-gray-700 focus:border-blue focus:outline-none"
            required
          />
        </div>

        <!-- Email input field -->
        <div>
          <label for="email" class="block text-white mb-2">Email</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            class="w-full px-4 py-2 rounded-md bg-gray-800 text-black border border-gray-700 focus:border-blue focus:outline-none"
            required
          />
        </div>

        <!-- Password input field with requirements hint -->
        <div>
          <label for="password" class="block text-white mb-2">Password</label>
          <input
            id="password"
            v-model="formData.password"
            type="password"
            class="w-full px-4 py-2 rounded-md bg-gray-800 text-black border border-gray-700 focus:border-blue focus:outline-none"
            required
          />
          <p class="text-gray-400 text-sm mt-1">
            Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.
          </p>
        </div>

        <!-- Submit button with loading state -->
        <button
          type="submit"
          class="w-full bg-blue text-white py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
          :disabled="loading"
        >
          {{ loading ? 'Creating Account...' : 'Sign Up' }}
        </button>

        <!-- Login redirect link -->
        <p class="text-center text-white">
          Already have an account?
          <router-link to="/login" class="text-blue hover:underline">
            Log in
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script>
import { usersService } from '../services/users.service.js';

export default {
  name: 'SignUp',
  
  // Component state management
  data() {
    return {
      formData: {
        firstName: '',    // User's first name
        lastName: '',     // User's last name
        email: '',       // User's email address
        password: ''     // User's password
      },
      error: '',        // Error message storage
      loading: false    // Loading state indicator
    }
  },

  methods: {
    // Handles form submission and user registration
    handleSubmit() {
      this.error = '';
      this.loading = true;

      // Create user data object for API
      const userData = {
        first_name: this.formData.firstName.trim(),
        last_name: this.formData.lastName.trim(),
        email: this.formData.email.trim(),
        password: this.formData.password
      };

      // Attempt user registration
      usersService.signup(userData)
        .then(response => {
          // Redirect to login page with success message
          this.$router.push({
            path: '/login',
            query: { 
              message: 'Account created successfully! Please log in.' 
            }
          });
        })
        .catch(err => {
          this.error = err.error_message || 'Failed to create account. Please try again.';
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }
}
</script>

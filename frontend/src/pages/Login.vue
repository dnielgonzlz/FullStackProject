<template>
  <!-- Main login container with responsive padding -->
  <div class="min-h-screen bg-black flex flex-col justify-center items-center p-4 md:p-8">
    <!-- Login form card with border and shadow -->
    <div class="w-full max-w-md bg-card p-8 rounded-lg border-2 border-blue shadow-lg">
      <h1 class="text-3xl md:text-4xl font-bold text-blue mb-8 text-center">Login to Eventitude</h1>
      
      <!-- Success message display -->
      <div v-if="successMessage" class="mb-4 p-4 bg-green-500 text-white rounded-md text-center">
        {{ successMessage }}
      </div>

      <!-- Login form with validation -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Email input field -->
        <div class="space-y-2">
          <label for="email" class="block text-blue">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email"
            class="w-full p-3 rounded-md bg-black border-2 border-blue text-blue focus:border-blue focus:outline-none"
            placeholder="Enter your email"
          >
          <!-- Email validation error message -->
          <div v-show="submitted && !email" class="text-blue text-sm">Email is required</div>
        </div>

        <!-- Password input field with toggle visibility -->
        <div class="space-y-2">
          <label for="password" class="block text-blue">Password</label>
          <div class="relative">
            <input 
              :type="showPassword ? 'text' : 'password'"
              id="password" 
              v-model="password"
              class="w-full p-3 rounded-md bg-black border-2 border-blue text-blue focus:border-blue focus:outline-none"
              placeholder="Enter your password"
            >
            <!-- Password visibility toggle button -->
            <button 
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue hover:text-white transition-colors"
            >
              <!-- Show/Hide password icons -->
              <svg 
                v-if="!showPassword"
                xmlns="http://www.w3.org/2000/svg" 
                class="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg 
                v-else
                xmlns="http://www.w3.org/2000/svg" 
                class="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </div>
          <!-- Password validation error message -->
          <div v-show="submitted && !password" class="text-blue text-sm">Password is required</div>
        </div>

        <!-- General error message display -->
        <div v-if="error" class="text-blue text-sm text-center">{{ error }}</div>

        <!-- Submit button -->
        <button 
          type="submit"
          class="w-full bg-blue text-white py-3 rounded-md text-lg font-semibold hover:opacity-90 transition-colors"
        >
          Login
        </button>

        <!-- Sign up link -->
        <p class="text-center text-blue">
          Don't have an account? 
          <router-link to="/signup" class="text-blue hover:text-white transition-colors">Sign up</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script>
import { usersService } from '../services/users.service.js';

export default {
  // Component state management
  data() {
    return {
      email: '',          // User email input
      password: '',       // User password input
      submitted: false,   // Form submission state
      error: '',         // Error message storage
      showPassword: false, // Password visibility toggle
      successMessage: '' // Success message storage
    };
  },

  methods: {
    // Handles form submission and validation
    async handleSubmit() {
      this.submitted = true;
      this.error = '';
      const {email, password} = this;

      // Basic form validation
      if (!(email && password)) {
        this.error = 'Please fill in all required fields';
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.error = 'Please enter a valid email.';
        return;
      }

      // Password complexity validation
      const password_pattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
      if (!password_pattern.test(password)) {
        this.error = 'Password must contain at least one number and one uppercase and lowercase letter, and at least 6 or more characters';
        return;
      }

      try {
        // Attempt login with provided credentials
        const credentials = {
          email,
          password
        };

        const response = await usersService.login(credentials);
        
        // Handle successful login
        if (response.session_token) {
          this.successMessage = 'Logged in Successfully!';
          localStorage.setItem('session_token', response.session_token);
          localStorage.setItem('user_id', response.user_id.toString());
          
          // Use router.push instead of window.location
          await this.$router.push({
            path: '/',
            query: { message: 'Logged in successfully!' }
          });
        }
      } catch (error) {
        this.error = error.error_message || 'Invalid email or password';
      }
    }
  }
}
</script>
<template>
  <main class="w-full max-w-6xl mx-auto text-center flex-grow flex flex-col justify-center">
    <!-- Animated title with letter-by-letter reveal -->
    <h1 class="text-5xl md:text-7xl lg:text-8xl font-bold text-blue mb-4 md:mb-6 leading-tight overflow-hidden">
      <span 
        v-for="(letter, index) in 'Eventitude'" 
        :key="index"
        class="inline-block animate-letter"
        :style="{ 
          'animation-delay': `${index * 0.06}s`,
          'transform': 'translateY(100%)',
          'opacity': '0'
        }"
      >
        {{ letter }}
      </span>
    </h1>

    <!-- Animated subtitle with fade-in effect -->
    <p class="text-xl md:text-2xl lg:text-3xl text-white font-bold mb-8 md:mb-12 animate-fade-in opacity-0">
      Create Events and Join Groups Online
    </p>

    <!-- Action buttons container with responsive layout -->
    <div class="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6 animate-fade-in opacity-0" style="animation-delay: 0.6s">
      <!-- Conditional rendering for Create Event button based on authentication -->
      <router-link 
        v-if="isAuthenticated"
        to="/create-event"
        class="w-full md:w-auto bg-blue text-white px-6 py-2 md:px-8 md:py-3 rounded-md text-lg md:text-xl font-semibold hover:opacity-90 transition-colors"
      >
        Create Event
      </router-link>
      <button 
        v-else
        @click="showLoginAlert"
        class="w-full md:w-auto bg-blue text-white px-6 py-2 md:px-8 md:py-3 rounded-md text-lg md:text-xl font-semibold hover:opacity-90 transition-colors"
      >
        Create Event
      </button>

      <!-- Search Events button -->
      <router-link 
        to="/search"
        class="w-full md:w-auto bg-blue text-white px-6 py-2 md:px-8 md:py-3 rounded-md text-lg md:text-xl font-semibold hover:opacity-90 transition-colors"
      >
        Search Events
      </router-link>
    </div>

    <!-- Login requirement alert with fade animation -->
    <div 
      v-if="showAlert" 
      class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg transition-opacity duration-300"
      :class="{ 'opacity-0': alertFading }"
    >
      You need to log in first!
    </div>
  </main>
</template>

<script>
export default {
  // Component state management
  data() {
    return {
      showAlert: false,    // Controls alert visibility
      alertFading: false  // Controls alert fade-out animation
    }
  },

  // Computed properties
  computed: {
    // Checks if user is authenticated based on session token
    isAuthenticated() {
      return !!localStorage.getItem('session_token')
    }
  },

  // Component methods
  methods: {
    // Handles login requirement alert display and navigation
    showLoginAlert() {
      this.showAlert = true
      this.alertFading = false
      
      // Start alert fade-out after 2.5s
      setTimeout(() => {
        this.alertFading = true
      }, 2500)

      // Remove alert after fade animation (3s total)
      setTimeout(() => {
        this.showAlert = false
      }, 3000)

      // Navigate to login page after short delay
      setTimeout(() => {
        this.$router.push('/login')
      }, 500)
    }
  }
}
</script>

<style scoped>
/* Letter reveal animation keyframes */
@keyframes letterReveal {
  0% {
    transform: translateY(100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Fade-in animation keyframes */
@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Animation classes */
.animate-letter {
  animation: letterReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.animate-fade-in {
  animation: fadeIn 0.48s ease-out forwards;
  animation-delay: 0.48s;
}

/* Transition utility class */
.transition-opacity {
  transition: opacity 0.5s ease-out;
}
</style>
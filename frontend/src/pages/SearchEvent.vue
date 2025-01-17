<template>
  <!-- Main search container with responsive padding -->
  <div class="min-h-screen bg-black flex flex-col p-4 md:p-8">
    <!-- Search header and controls section -->
    <div class="w-full max-w-4xl mx-auto text-center mb-12">
      <h1 class="text-3xl md:text-4xl font-bold text-blue mb-8">Search Events</h1>
      
      <!-- Search and Filter Section -->
      <div class="space-y-6">
        <!-- Search input with integrated search button -->
        <div class="relative w-full">
          <input 
            type="text" 
            v-model="searchQuery"
            placeholder="Search for events..."
            class="w-full px-6 py-4 text-xl md:text-2xl bg-black border-2 border-blue text-blue rounded-lg focus:outline-none focus:border-opacity-100 placeholder-blue placeholder-opacity-50"
            @keyup.enter="handleSearch"
          >
          <button 
            @click="handleSearch"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue text-white px-6 py-2 rounded-md hover:opacity-90 transition-colors"
          >
            Search
          </button>
        </div>

        <!-- Category filter buttons -->
        <div class="flex flex-wrap gap-2 justify-center">
          <button
            v-for="category in categories"
            :key="category.category_id"
            @click="toggleCategory(category.category_id)"
            :class="[
              'px-4 py-2 rounded-full border-2 transition-colors',
              selectedCategories.includes(category.category_id)
                ? 'bg-blue text-white border-blue'
                : 'bg-transparent text-blue border-blue hover:bg-blue hover:text-white'
            ]"
          >
            {{ category.name }}
          </button>
        </div>

        <!-- Search hint text -->
        <p class="mt-4 text-blue text-opacity-70">
          Try searching for event types, locations, or dates
        </p>
      </div>
    </div>

    <!-- Search results display section -->
    <div v-if="searchResults.length > 0" class="w-full max-w-6xl mx-auto">
      <h2 class="text-2xl font-bold text-blue mb-6">Search Results</h2>
      <!-- Grid layout for search results -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EventCard 
          v-for="event in searchResults" 
          :key="event.event_id" 
          :event="{
            id: event.event_id,
            title: event.name,
            location: event.location,
            description: event.description,
            creator: event.creator ? `${event.creator.first_name} ${event.creator.last_name}` : 'Unknown',
            start: event.start,
            close_registration: event.close_registration,
            max_attendees: event.max_attendees
          }"
          @click="viewEventDetails(event.event_id)"
        />
      </div>
    </div>

    <!-- No results message -->
    <div v-else-if="hasSearched" class="w-full max-w-4xl mx-auto text-center mt-12">
      <p class="text-blue text-opacity-70">No events found matching your search.</p>
    </div>

    <!-- Loading state indicator -->
    <div v-if="isLoading" class="w-full max-w-4xl mx-auto text-center mt-12">
      <p class="text-blue">Loading results...</p>
    </div>

    <!-- Error message display -->
    <div v-if="error" class="w-full max-w-4xl mx-auto text-center mt-12">
      <p class="text-red-500">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import EventCard from '../components/EventCard.vue'
import { eventsService } from '../services/events.service'

export default {
  name: 'SearchEvent',
  components: {
    EventCard
  },

  // Component state management
  data() {
    return {
      searchQuery: '',           // User search input
      searchResults: [],         // Stores search results
      categories: [],           // Available categories
      selectedCategories: [],   // Selected category filters
      hasSearched: false,      // Tracks if search has been performed
      isLoading: false,        // Loading state indicator
      error: null             // Error message storage
    }
  },

  // Lifecycle hook - fetch categories on component creation
  async created() {
    try {
      this.categories = await eventsService.getCategories();
      this.handleSearch();
    } catch (err) {
      console.error('Failed to load categories:', err);
      this.error = 'Failed to load categories';
    }
  },

  methods: {
    // Handles category selection toggling
    toggleCategory(categoryId) {
      const index = this.selectedCategories.indexOf(categoryId);
      if (index === -1) {
        this.selectedCategories.push(categoryId);
      } else {
        this.selectedCategories.splice(index, 1);
      }
      this.handleSearch();
    },

    // Performs search with current query and filters
    async handleSearch() {
      this.isLoading = true;
      this.error = null;
      this.hasSearched = true;

      try {
        // Execute search with current parameters
        const results = await eventsService.searchEvents({
          q: this.searchQuery.trim(),
          status: 'OPEN',
          categories: this.selectedCategories
        });

        this.searchResults = results;
      } catch (err) {
        this.error = 'Failed to fetch search results. Please try again.';
        console.error('Search error:', err);
      } finally {
        this.isLoading = false;
      }
    },

    // Navigates to event details page
    viewEventDetails(eventId) {
      this.$router.push(`/event/${eventId}`);
    }
  }
}
</script> 
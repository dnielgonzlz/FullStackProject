<template>
  <!-- Main container with dark theme and responsive padding -->
  <div class="min-h-screen bg-black p-4 md:p-8">
    <div class="max-w-3xl mx-auto">
      <!-- Top action bar with draft management and cancel options -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-4">
          <!-- Save draft button -->
          <button 
            @click="saveDraft" 
            class="text-blue hover:text-white flex items-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Draft
          </button>
          
          <!-- View drafts button (shown only if drafts exist) -->
          <button 
            v-if="drafts.length > 0"
            @click="showDraftsModal = true" 
            class="text-blue hover:text-white flex items-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View Drafts ({{ drafts.length }})
          </button>
        </div>

        <!-- Cancel button with navigation -->
        <button 
          @click="$router.back()" 
          class="text-blue hover:text-white flex items-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>

      <!-- Drafts modal with saved event list -->
      <div v-if="showDraftsModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <!-- Modal content -->
        <div class="bg-card border-2 border-blue/30 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <!-- Modal header -->
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-blue">Saved Drafts</h2>
            <button @click="showDraftsModal = false" class="text-blue hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <!-- Draft list -->
          <div class="space-y-4">
            <div v-for="(draft, index) in drafts" :key="index" class="border-2 border-blue/30 rounded-lg p-4">
              <h3 class="text-blue font-bold mb-2">{{ draft.event.title || 'Untitled Draft' }}</h3>
              <p class="text-blue/70 text-sm mb-2">Last saved: {{ new Date(draft.savedAt).toLocaleString() }}</p>
              <div class="flex space-x-4">
                <button @click="loadDraft(index)" class="text-blue hover:text-white text-sm">Load Draft</button>
                <button @click="deleteDraft(index)" class="text-red-500 hover:text-red-400 text-sm">Delete Draft</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error message display -->
      <div v-if="error" class="mb-6 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-lg">
        <p class="text-red-500">{{ error }}</p>
      </div>

      <!-- Event creation form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Basic Information Section -->
        <div class="bg-card border-2 border-blue/30 rounded-lg p-6 space-y-4 shadow-lg">
          <h2 class="text-xl font-bold text-blue mb-4">Basic Information</h2>
          
          <!-- Event title input -->
          <div>
            <label for="title" class="block text-blue mb-2">Event Title *</label>
            <input
              id="title"
              v-model="event.title"
              type="text"
              required
              class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
              placeholder="Give your event a clear, descriptive title"
            />
          </div>

          <!-- Event description textarea -->
          <div>
            <label for="description" class="block text-blue mb-2">Description *</label>
            <textarea
              id="description"
              v-model="event.description"
              rows="4"
              required
              class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
              placeholder="Describe your event in detail. Include what attendees can expect."
            ></textarea>
          </div>

          <!-- Maximum attendees input -->
          <div>
            <label for="maxAttendees" class="block text-blue mb-2">Max Attendees *</label>
            <input
              id="maxAttendees"
              v-model.number="event.max_attendees"
              type="number"
              min="1"
              required
              class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
              placeholder="Maximum number of attendees"
            />
            <p v-if="!event.max_attendees || event.max_attendees < 1" class="text-red-500 text-sm mt-1">
              Maximum attendees must be at least 1
            </p>
          </div>

          <!-- Categories selection -->
          <div>
            <label class="block text-blue mb-2">Categories *</label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div v-for="category in availableCategories" :key="category.category_id" 
                   class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :id="'category-' + category.category_id"
                  :value="category.category_id"
                  v-model="event.categories"
                  class="rounded border-blue/50 bg-black text-blue focus:ring-blue"
                />
                <label :for="'category-' + category.category_id" class="text-blue">
                  {{ category.name }}
                </label>
              </div>
            </div>
            <p v-if="!event.categories.length" class="text-red-500 text-sm mt-1">
              Please select at least one category
            </p>
          </div>
        </div>

        <!-- Location & Time Section -->
        <div class="bg-card border-2 border-blue/30 rounded-lg p-6 space-y-4 shadow-lg">
          <h2 class="text-xl font-bold text-blue mb-4">Location & Time</h2>
          
          <!-- Location input -->
          <div>
            <label for="location" class="block text-blue mb-2">Location *</label>
            <input
              id="location"
              v-model="event.location"
              type="text"
              required
              class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
              placeholder="Enter the event location"
            />
          </div>

          <!-- Date and Time inputs -->
          <div class="space-y-4">
            <h3 class="text-blue font-semibold">Event Date and Time</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Event date picker -->
              <div>
                <label for="eventDate" class="block text-blue mb-2">Event Date *</label>
                <input
                  id="eventDate"
                  v-model="event.eventDate"
                  type="date"
                  required
                  class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
                />
              </div>
              <!-- Event time picker -->
              <div>
                <label for="eventTime" class="block text-blue mb-2">Event Time *</label>
                <input
                  id="eventTime"
                  v-model="event.eventTime"
                  type="time"
                  required
                  class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
                />
              </div>
            </div>

            <!-- Registration deadline inputs -->
            <h3 class="text-blue font-semibold mt-4">Registration Close Date and Time</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Registration close date picker -->
              <div>
                <label for="registrationCloseDate" class="block text-blue mb-2">Registration Close Date *</label>
                <input
                  id="registrationCloseDate"
                  v-model="event.registrationCloseDate"
                  type="date"
                  required
                  class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
                />
              </div>
              <!-- Registration close time picker -->
              <div>
                <label for="registrationCloseTime" class="block text-blue mb-2">Registration Close Time *</label>
                <input
                  id="registrationCloseTime"
                  v-model="event.registrationCloseTime"
                  type="time"
                  required
                  class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
                />
              </div>
            </div>
            <p class="text-sm text-blue/70">
              Note: Registration must close at least 14 days before the event starts.
            </p>
          </div>
        </div>

        <!-- Submit button -->
        <div class="flex justify-end">
          <button 
            type="submit"
            :disabled="isSubmitting"
            class="bg-blue text-white px-8 py-3 rounded-md text-lg font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting">Creating...</span>
            <span v-else>Create Event</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service';

export default {
  name: 'CreateEvent',
  
  // Component state management
  data() {
    return {
      event: {
        title: '',                    // Event title
        description: '',              // Event description
        location: '',                 // Event location
        eventDate: '',                // Event date
        eventTime: '',                // Event time
        registrationCloseDate: '',    // Registration deadline date
        registrationCloseTime: '',    // Registration deadline time
        max_attendees: 1,            // Maximum number of attendees
        categories: [],              // Selected event categories
      },
      isSubmitting: false,          // Form submission state
      error: null,                  // Error message storage
      drafts: [],                   // Stored event drafts
      showDraftsModal: false,       // Draft modal visibility
      availableCategories: [],      // Available category options
    }
  },

  // Lifecycle hooks
  async created() {
    // Load saved drafts and available categories on component creation
    this.loadDraftsFromStorage();
    try {
      const categories = await eventsService.getCategories();
      this.availableCategories = categories;
    } catch (error) {
      this.error = 'Failed to load categories';
    }
  },

  methods: {
    // Loads saved drafts from local storage
    loadDraftsFromStorage() {
      const savedDrafts = localStorage.getItem('eventDrafts');
      if (savedDrafts) {
        this.drafts = JSON.parse(savedDrafts);
      }
    },

    // Saves current event as draft
    saveDraft() {
      if (!this.event.title && !this.event.description) {
        alert('Please add some content before saving a draft');
        return;
      }

      const draft = {
        event: { 
          ...this.event,
          categories: [...this.event.categories]
        },
        savedAt: new Date().toISOString()
      };

      this.drafts.unshift(draft);
      localStorage.setItem('eventDrafts', JSON.stringify(this.drafts));
      alert('Draft saved successfully!');
    },

    // Loads selected draft into form
    loadDraft(index) {
      const draft = this.drafts[index];
      this.event = { 
        ...draft.event,
        categories: draft.event.categories || []
      };
      this.showDraftsModal = false;
    },

    // Deletes selected draft
    deleteDraft(index) {
      if (confirm('Are you sure you want to delete this draft?')) {
        this.drafts.splice(index, 1);
        localStorage.setItem('eventDrafts', JSON.stringify(this.drafts));
      }
    },

    // Validates event dates and times
    validateTimes() {
      if (!this.event.eventDate || !this.event.eventTime || 
          !this.event.registrationCloseDate || !this.event.registrationCloseTime) {
        this.error = 'Please fill in all date and time fields';
        return false;
      }

      const eventDateTime = new Date(`${this.event.eventDate} ${this.event.eventTime}`).getTime();
      const registrationCloseDateTime = new Date(`${this.event.registrationCloseDate} ${this.event.registrationCloseTime}`).getTime();
      const now = new Date().getTime();

      // Validate event timing
      if (eventDateTime <= now) {
        this.error = 'Event must be scheduled in the future';
        return false;
      }

      if (registrationCloseDateTime >= eventDateTime) {
        this.error = 'Registration must close before the event starts';
        return false;
      }

      // Check minimum registration period (14 days)
      const minimumGap = 14 * 24 * 60 * 60 * 1000;
      if (eventDateTime - registrationCloseDateTime < minimumGap) {
        this.error = 'Registration must close at least 14 days before the event';
        return false;
      }

      return true;
    },

    // Handles form submission
    async handleSubmit() {
      console.log('=== CREATE EVENT DEBUG LOGS ===');
      console.log('1. Starting form submission');
      console.log('Event data:', this.event);
      console.log('Current user ID:', localStorage.getItem('user_id'));

      // Validate dates and times
      if (!this.validateTimes()) {
        console.log('2. ❌ Time validation failed:', this.error);
        return;
      }
      console.log('2. ✅ Time validation passed');

      // Validate required fields
      const { title, description, location, max_attendees, categories } = this.event;
      console.log('3. Required fields check:', {
        title,
        description,
        location,
        max_attendees,
        categoriesCount: categories.length
      });

      if (!title || !description || !location || !max_attendees || !categories.length) {
        this.error = 'Please fill in all required fields and select at least one category';
        console.log('3. ❌ Required fields validation failed');
        return;
      }
      console.log('3. ✅ Required fields validation passed');

      try {
        this.isSubmitting = true;
        
        // Format dates for API
        const eventDateTime = new Date(`${this.event.eventDate} ${this.event.eventTime}`).getTime();
        const registrationCloseDateTime = new Date(`${this.event.registrationCloseDate} ${this.event.registrationCloseTime}`).getTime();

        // Parse max_attendees to ensure it's a number
        const parsedMaxAttendees = parseInt(this.event.max_attendees, 10);

        // Prepare request data
        const requestBody = {
          name: title,
          description,
          location,
          start: eventDateTime.toString(),
          close_registration: registrationCloseDateTime.toString(),
          max_attendees: parsedMaxAttendees,
          categories: categories
        };

        console.log('4. Sending API request with body:', requestBody);

        // Create event
        const result = await eventsService.createEvent(requestBody);
        console.log('5. ✅ API response:', result);
        
        // Navigation
        console.log('6. Attempting navigation to:', `/event/${result.event_id}`);
        await this.$router.push({
          path: `/event/${result.event_id}`,
          query: { message: 'Event created successfully!' }
        });
        console.log('7. ✅ Navigation successful');

      } catch (error) {
        console.error('❌ Event creation failed:', error);
        this.error = error.error_message || 'Failed to create event';
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
</script> 
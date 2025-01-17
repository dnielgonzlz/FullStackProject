<template>
  <div class="min-h-screen bg-black p-4 md:p-8">
    <!-- Message Display -->
    <div v-if="$route.query.message" class="max-w-4xl mx-auto mb-4">
      <div class="bg-blue/10 border-2 border-blue/30 rounded-lg p-4 text-center">
        <p class="text-blue">{{ $route.query.message }}</p>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="$route.query.error" class="max-w-4xl mx-auto mb-4">
      <div class="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4 text-center">
        <p class="text-red-500">{{ $route.query.error }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-4xl mx-auto">
      <div class="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-6 text-center">
        <p class="text-red-500">{{ error }}</p>
        <button 
          @click="$router.push('/search')" 
          class="mt-4 text-blue hover:text-white transition-colors"
        >
          Return to Search
        </button>
      </div>
    </div>

    <!-- Event Content -->
    <div v-else class="max-w-4xl mx-auto">
      <!-- Back button -->
      <button 
        @click="$router.back()" 
        class="text-blue hover:text-white mb-6 flex items-center transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Search
      </button>

      <!-- Event Details Card -->
      <div class="bg-card border-2 border-blue/30 rounded-lg p-6 mb-8 shadow-lg hover:border-blue transition-all">
        <div class="flex justify-between items-start mb-6">
          <h1 class="text-3xl md:text-4xl font-bold text-blue">{{ event.title }}</h1>
          
          <div class="flex space-x-2">
            <button 
              @click="handleRegistration"
              :disabled="loading || isEventFull || isRegistrationClosed || isRegistered"
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                isRegistered ? 'bg-green-500 text-white cursor-not-allowed' : 
                isEventFull ? 'bg-gray-500 text-white cursor-not-allowed' :
                isRegistrationClosed ? 'bg-gray-500 text-white cursor-not-allowed' :
                'bg-blue text-white hover:opacity-90'
              ]"
            >
              {{ registrationButtonText }}
            </button>

            <button 
              v-if="isCreator"
              @click="showEditForm = true"
              class="px-4 py-2 bg-blue text-white rounded-md hover:opacity-90 transition-colors font-semibold"
            >
              <div class="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Event</span>
              </div>
            </button>

            <button 
              v-if="isCreator"
              @click="handleEventDeletion"
              class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-semibold"
            >
              <div class="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Event</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Event Info -->
        <div class="space-y-4 mb-8">
          <div class="flex items-center text-blue">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{{ event.location }}</span>
          </div>

          <div class="flex items-center text-blue">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Created by {{ event.creator }}</span>
          </div>

          <p class="text-white text-lg leading-relaxed">{{ event.description }}</p>
        </div>

        <!-- Add this after the event info section -->
        <div class="flex items-center text-blue mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>{{ event.currentAttendees }} / {{ event.maxAttendees }} attendees</span>
        </div>

        <!-- Add this new section for attendees list -->
        <div v-if="isCreator && event.attendees && event.attendees.length > 0" class="mb-6">
          <h3 class="text-blue font-semibold mb-2">Attendees List:</h3>
          <div class="bg-card/50 border border-blue/30 rounded-lg p-4">
            <ul class="space-y-2">
              <li v-for="attendee in event.attendees" :key="attendee.user_id" class="text-white">
                {{ attendee.first_name }} {{ attendee.last_name }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-8 border-b border-blue">
        <div class="flex">
          <button 
            class="text-white border-blue border-b-2 pb-4 font-semibold"
          >
            Questions ({{ questions.length }})
          </button>
        </div>
      </div>

      <!-- Questions Section -->
      <div class="space-y-6">
        <!-- Ask Question Form -->
        <div class="bg-card border-2 border-blue/30 rounded-lg p-6 mb-6 shadow-lg">
          <textarea
            v-model="newQuestion"
            rows="3"
            placeholder="Ask a question..."
            class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none mb-3"
          ></textarea>
          <button 
            @click="addQuestion"
            class="bg-blue text-white px-4 py-2 rounded-md hover:opacity-90 transition-colors"
          >
            Ask Question
          </button>
        </div>

        <!-- Questions List -->
        <div class="space-y-6">
          <div 
            v-for="question in sortedQuestions" 
            :key="question.question_id"
            class="bg-card border-2 border-blue/30 rounded-lg p-6 shadow-lg hover:border-blue transition-all"
          >
            <!-- Question Content -->
            <div class="flex justify-between items-start mb-4">
              <div class="flex-grow">
                <div class="flex items-center text-blue text-sm mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Asked by {{ question.asked_by.first_name }}</span>
                </div>
                <p class="text-white">{{ question.question }}</p>
              </div>

              <!-- Vote and Delete Controls -->
              <div class="flex items-center space-x-4">
                <!-- Vote Controls -->
                <div class="flex items-center space-x-2">
                  <button 
                    @click="handleQuestionVote(question.question_id, 'up')"
                    :class="[
                      'hover:text-white transition-colors',
                      getVoteClass(question.question_id, 'up')
                    ]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  
                  <span class="text-blue font-bold">{{ question.votes }}</span>
                  
                  <button 
                    @click="handleQuestionVote(question.question_id, 'down')"
                    :class="[
                      'hover:text-white transition-colors',
                      getVoteClass(question.question_id, 'down')
                    ]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <!-- Delete button (only shown for question author) -->
                <button 
                  v-if="canDeleteQuestion(question)"
                  @click="deleteQuestion(question.question_id)"
                  class="text-red-500 hover:text-red-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Form Modal -->
    <div v-if="showEditForm && isCreator" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-card border-2 border-blue/30 rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 class="text-2xl text-blue font-bold mb-4">Edit Event</h2>
        
        <form @submit.prevent="handleEventEdit" class="space-y-4">
          <div>
            <label class="text-blue block mb-2">Event Name</label>
            <input 
              v-model="editForm.name" 
              type="text" 
              class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
            >
          </div>

          <div>
            <label class="text-blue block mb-2">Description</label>
            <textarea 
              v-model="editForm.description" 
              rows="3"
              class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
            ></textarea>
          </div>

          <div>
            <label class="text-blue block mb-2">Location</label>
            <input 
              v-model="editForm.location" 
              type="text"
              class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
            >
          </div>

          <div>
            <label class="text-blue block mb-2">Maximum Attendees</label>
            <input 
              v-model="editForm.maxAttendees" 
              type="number"
              min="1"
              class="w-full p-3 rounded-md bg-black border-2 border-blue/50 text-blue focus:border-blue focus:outline-none"
            >
          </div>

          <div class="flex justify-end space-x-4">
            <button 
              type="button"
              @click="showEditForm = false"
              class="px-4 py-2 text-blue hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="px-4 py-2 bg-blue text-white rounded-md hover:opacity-90 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service';
import { questionsService } from '../services/questions.service';

export default {
  name: 'SingleEvent',
  data() {
    return {
      event: {
        id: null,
        title: '',
        location: '',
        description: '',
        creator: '',
        maxAttendees: 0,
        currentAttendees: 0,
        startTime: '',
        registrationClose: '',
        attendees: []
      },
      newQuestion: '',
      questions: [],
      loading: true,
      error: null,
      userVotes: {},
      showEditForm: false,
      editForm: {
        name: '',
        description: '',
        location: '',
        maxAttendees: 0
      }
    }
  },
  async created() {
    console.log('=== SINGLE EVENT DEBUG LOGS ===');
    console.log('1. Component created');
    console.log('Route params:', this.$route.params);
    
    try {
      const eventId = this.$route.params.id;
      console.log('2. Fetching event with ID:', eventId);
      
      const eventData = this.$route.params.eventData;
      console.log('3. Event data from route:', eventData);

      if (!eventData) {
        console.log('4. No event data in route, fetching from API');
        const fetchedEventData = await eventsService.getEventById(eventId);
        console.log('5. API response:', fetchedEventData);
        this.processEventData(fetchedEventData);
      } else {
        console.log('4. Using event data from route');
        this.processEventData(eventData);
      }

      console.log('6. Processed event data:', this.event);
      console.log('7. Questions:', this.questions);

      await this.loadVoteStatuses();
      console.log('8. Vote statuses loaded:', this.userVotes);

    } catch (err) {
      console.error('❌ Error in created hook:', err);
      this.error = err.error_message || 'Failed to load event details';
    } finally {
      this.loading = false;
    }
  },
  methods: {

    processEventData(eventData) {
    this.event = {
      id: eventData.event_id,
      title: eventData.name,
      location: eventData.location,
      description: eventData.description,
      creator: `${eventData.creator.first_name} ${eventData.creator.last_name}`,
      creator_id: eventData.creator.creator_id,
      maxAttendees: eventData.max_attendees,
      currentAttendees: eventData.number_attending,
      startTime: eventData.start,
      registrationClose: eventData.close_registration,
      attendees: eventData.attendees || []
    };

    this.questions = eventData.questions.map(q => ({
      question_id: q.question_id,
      question: q.question,
      asked_by: q.asked_by,
      votes: q.votes
    }));
  },

    async addQuestion() {
      if (!this.newQuestion.trim()) return;

      try {
        const result = await questionsService.askQuestion(this.event.id, this.newQuestion);
        await this.refreshEventData();
        this.newQuestion = '';
      } catch (err) {
        console.error('Error asking question:', err);
        // You might want to show an error message to the user here
      }
    },
    async handleQuestionVote(questionId, voteType) {
      try {
        const currentVote = this.userVotes[questionId] || 0;
        
        if (voteType === 'up') {
          if (currentVote === 1) {
            // Remove upvote
            await questionsService.removeVote(questionId);
          } else {
            // Add upvote
            await questionsService.upvoteQuestion(questionId);
          }
        } else {
          if (currentVote === -1) {
            // Remove downvote
            await questionsService.removeVote(questionId);
          } else {
            // Add downvote
            await questionsService.downvoteQuestion(questionId);
          }
        }
        
        await this.refreshEventData();
        await this.loadVoteStatuses(); // Reload vote statuses
      } catch (err) {
        console.error('Error voting on question:', err);
      }
    },
    canDeleteQuestion(question) {
      const currentUserId = parseInt(localStorage.getItem('user_id'));
      return question.asked_by.user_id === currentUserId;
    },
    async deleteQuestion(questionId) {
      try {
        await questionsService.deleteQuestion(questionId);
        await this.refreshEventData();
      } catch (err) {
        console.error('Error deleting question:', err);
        // You might want to show an error message to the user here
      }
    },
    async refreshEventData() {
      try {
        const eventId = this.$route.params.id;
        const eventData = await eventsService.getEventById(eventId);
        
        if (!eventData) {
          this.error = 'Event not found';
          return;
        }

        this.event = {
          id: eventData.event_id,
          title: eventData.name,
          location: eventData.location,
          description: eventData.description,
          creator: eventData.creator ? `${eventData.creator.first_name} ${eventData.creator.last_name}` : 'Unknown',
          creator_id: eventData.creator ? eventData.creator.user_id : null,
          maxAttendees: eventData.max_attendees,
          currentAttendees: eventData.number_attending,
          startTime: eventData.start,
          registrationClose: eventData.close_registration,
          attendees: eventData.attendees || []
        };

        // Update questions with null check
        this.questions = (eventData.questions || []).map(q => ({
          question_id: q.question_id,
          question: q.question,
          asked_by: q.asked_by,
          votes: q.votes
        }));

        this.loading = false;
      } catch (err) {
        console.error('Error fetching event:', err);
        this.error = err.error_message || 'Failed to load event details';
        this.loading = false;
      }
    },
    async handleRegistration() {
      if (!localStorage.getItem('session_token')) {
        // Redirect to login if not authenticated
        this.$router.push('/login');
        return;
      }

      if (this.isRegistered || this.isEventFull || this.isRegistrationClosed) {
        // Show error message via router query if already registered
        if (this.isRegistered) {
          this.$router.push({
            path: `/event/${this.event.id}`,
            query: { error: 'You are already registered!' }
          });
        }
        return;
      }

      try {
        await eventsService.registerForEvent(this.event.id);
        
        // Refresh event data to update attendee count and status
        await this.refreshEventData();

        // Show success message via router query
        this.$router.push({
          path: `/event/${this.event.id}`,
          query: { message: 'You have registered successfully!' }
        });
      } catch (err) {
        console.error('Error registering for event:', err);
        // Handle error via router query
        this.$router.push({
          path: `/event/${this.event.id}`,
          query: { error: err.error_message || 'Failed to register for event' }
        });
      }
    },
    async loadVoteStatuses() {
      try {
        for (const question of this.questions) {
          const status = await questionsService.getVoteStatus(question.question_id);
          this.$set(this.userVotes, question.question_id, status.vote);
        }
      } catch (err) {
        console.error('Error loading vote statuses:', err);
      }
    },
    async handleEventDeletion() {
      // Check if user is creator
      const currentUserId = parseInt(localStorage.getItem('user_id'));
      const creatorId = this.event.creator_id; // Make sure this is available in your event data

      if (currentUserId !== creatorId) {
        this.$router.push({
          path: `/event/${this.event.id}`,
          query: { error: 'You need to be the creator of the event!' }
        });
        return;
      }

      // Ask for confirmation
      if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
      }

      try {
        await eventsService.archiveEvent(this.event.id);
        // Redirect to search page with success message
        this.$router.push({
          path: '/search',
          query: { message: 'Event successfully deleted' }
        });
      } catch (err) {
        console.error('Error deleting event:', err);
        this.$router.push({
          path: `/event/${this.event.id}`,
          query: { error: err.error_message || 'Failed to delete event' }
        });
      }
    },
    initializeEditForm() {
      this.editForm = {
        name: this.event.title,
        description: this.event.description,
        location: this.event.location,
        maxAttendees: this.event.maxAttendees
      };
    },
    async handleEventEdit() {
      if (!this.isCreator) {
        this.$router.push({
          path: `/event/${this.event.id}`,
          query: { error: 'You must be the creator to edit this event' }
        });
        return;
      }

      try {
        const updateData = {
          name: this.editForm.name,
          description: this.editForm.description,
          location: this.editForm.location,
          max_attendees: parseInt(this.editForm.maxAttendees)
        };

        await eventsService.updateEvent(this.event.id, updateData);
        
        // Refresh event data
        await this.refreshEventData();
        
        // Close form and show success message
        this.showEditForm = false;
        this.$router.push({
          path: `/event/${this.event.id}`,
          query: { message: 'Event updated successfully' }
        });
      } catch (err) {
        console.error('Error updating event:', err);
        this.$router.push({
          path: `/event/${this.event.id}`,
          query: { error: err.error_message || 'Failed to update event' }
        });
      }
    }
  },
  computed: {
    isEventFull() {
      return this.event.currentAttendees >= this.event.maxAttendees;
    },
    isRegistrationClosed() {
      return this.event.registrationClose < Date.now();
    },
    isRegistered() {
      // Check if current user is in attendees list or is the creator
      const currentUserId = localStorage.getItem('user_id');
      return this.event.attendees?.some(a => a.user_id === currentUserId) || 
             this.event.creator?.creator_id === currentUserId;
    },
    registrationButtonText() {
      if (this.isRegistered) return 'Registered';
      if (this.isEventFull) return 'Event Full';
      if (this.isRegistrationClosed) return 'Registration Closed';
      return 'Register for Event';
    },
    sortedQuestions() {
      return [...this.questions].sort((a, b) => b.votes - a.votes);
    },
    getVoteClass() {
      return (questionId, voteType) => {
        const vote = this.userVotes[questionId] || 0;
        if (voteType === 'up' && vote === 1) {
          return 'text-green-500';
        }
        if (voteType === 'down' && vote === -1) {
          return 'text-red-500';
        }
        return 'text-blue';
      };
    },
    isCreator() {
      const currentUserId = parseInt(localStorage.getItem('user_id'));
      const creatorId = this.event.creator_id;
      console.log('Current User ID:', currentUserId);
      console.log('Creator ID:', creatorId);
      console.log('Are they equal?', currentUserId === creatorId);
      return currentUserId === creatorId;
    }
  },
  watch: {
    showEditForm(newValue) {
      if (newValue) {
        this.initializeEditForm();
      }
    }
  }
}
</script> 
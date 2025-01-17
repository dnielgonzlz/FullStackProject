<template>
  <div class="bg-card border-2 border-blue/30 rounded-lg p-6 hover:bg-card-hover hover:border-blue transition-all cursor-pointer relative group shadow-lg">
    <!-- Event content -->
    <div>
      <h2 class="text-xl font-bold text-blue mb-2 truncate group-hover:text-white transition-colors">{{ event.title }}</h2>
      
      <div class="flex items-center text-blue text-opacity-90 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="truncate group-hover:text-white transition-colors">{{ event.location }}</span>
      </div>
      
      <p class="text-white text-opacity-90 mb-4 line-clamp-2">{{ event.description }}</p>
      
      <div class="flex items-center text-blue text-opacity-80 text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span class="group-hover:text-white transition-colors">Created by {{ event.creator }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EventCard',
  props: {
    event: {
      type: Object,
      required: true,
      validator: function(obj) {
        return obj.title && obj.location && obj.description && obj.creator;
      }
    }
  }
}
</script> 
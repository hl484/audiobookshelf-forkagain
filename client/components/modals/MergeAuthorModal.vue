<template>
  <div class="merge-author-modal">
    <div class="modal-content">
      <h2 class="text-center">Merge Authors</h2>
      <div class="flex justify-around items-center">
        <!-- Author A Card -->
        <div>
          <author-card :author="authorA" @select="updateSelectedInfo" />
        </div>

        <!-- Merge Info -->
        <div class="merge-info bg-card p-4 rounded-lg shadow-lg">
          <h3 class="text-center">Merge Info</h3>
          <div class="info-item" v-if="selectedInfo.image">
            <img :src="selectedInfo.image" alt="Author Image" class="merged-image" />
          </div>
          <div class="info-item" v-if="selectedInfo.name">
            <p>{{ selectedInfo.name }}</p>
          </div>
          <div class="info-item" v-if="selectedInfo.numBooks">
            <p>{{ selectedInfo.numBooks }} Books</p>
          </div>
        </div>

        <!-- Author B Card -->
        <div>
          <author-card :author="authorB" @select="updateSelectedInfo" />
        </div>
      </div>
      <div class="flex justify-center space-x-4 mt-4">
        <button class="btn btn-primary" @click="mergeAuthors">Merge</button>
        <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
import AuthorCard from '@/components/cards/AuthorCard.vue'

export default {
  components: {
    AuthorCard
  },
  props: {
    authorA: {
      type: Object,
      required: true
    },
    authorB: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      selectedInfo: {
        image: null,
        name: null,
        numBooks: null
      }
    }
  },
  methods: {
    updateSelectedInfo(info) {
      this.selectedInfo[info.key] = info.value
    },
    mergeAuthors() {
      const mergedAuthor = {
        imagePath: this.selectedInfo.image,
        name: this.selectedInfo.name,
        numBooks: this.selectedInfo.numBooks
      }
      this.$emit('merge', mergedAuthor)
    }
  }
}
</script>

<style scoped>
.merge-author-modal {
  /* 样式定义 */
}
.modal-content {
  background-color: #1a1a1a;
  color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  max-width: 800px;
  margin: auto;
}
.merge-info {
  width: 200px;
  text-align: center;
}
.info-item {
  margin: 10px 0;
}
.merged-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary {
  background-color: #2563eb;
  color: #ffffff;
}
.btn-primary:hover {
  background-color: #1d4ed8;
}
.btn-secondary {
  background-color: #6b7280;
  color: #ffffff;
}
.btn-secondary:hover {
  background-color: #4b5563;
}
</style>

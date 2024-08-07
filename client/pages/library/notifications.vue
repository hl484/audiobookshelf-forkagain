<template>
  <div id="page-wrapper" class="bg-bg page overflow-y-auto p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl mb-4 text-center">Similar Authors Detected</h1>
      <p class="text-center mb-6">The following authors are detected as similar. Do you want to merge them?</p>
      <div v-for="(authorPair, index) in authorPairs" :key="index" class="notification">
        <div class="flex justify-between items-center bg-card p-4 rounded-lg mb-6 shadow-lg">
          <author-card :author="authorPair[0]" @edit="editAuthor" />
          <author-card :author="authorPair[1]" @edit="editAuthor" />
        </div>
      </div>
      <div class="flex justify-center space-x-4">
        <button class="btn btn-primary" @click="showMergeModal(authorPair)">Merge</button>
        <button class="btn btn-secondary" @click="cancelNotification">Cancel</button>
      </div>
    </div>
    <merge-author-modal v-if="isMergeModalVisible" :authorA="selectedAuthorPair[0]" :authorB="selectedAuthorPair[1]" @close="closeMergeModal" @merge="mergeAuthors" />
  </div>
</template>

<script>
import AuthorCard from '@/components/cards/AuthorCard.vue'
import MergeAuthorModal from '@/components/modals/MergeAuthorModal.vue'

export default {
  components: {
    AuthorCard,
    MergeAuthorModal
  },
  data() {
    return {
      authorPairs: [
        [
          { id: 101, name: 'Author A', numBooks: 5 },
          { id: 102, name: 'Author B', numBooks: 3 }
        ]
      ],
      isMergeModalVisible: false,
      selectedAuthorPair: null
    }
  },
  /* async mounted() {
    // 假设你有一个 API 来获取相似的作者对
    try {
      const response = await this.$axios.get('/api/similar-authors')
      this.authorPairs = response.data
    } catch (error) {
      console.error('Failed to fetch similar authors', error)
    }
  },
  */

  methods: {
    editAuthor(author) {
      this.$store.commit('globals/showEditAuthorModal', author)
    },
    showMergeModal() {
      this.selectedAuthorPair = this.authorPairs[0]
      this.isMergeModalVisible = true
    },
    closeMergeModal() {
      this.isMergeModalVisible = false
      this.selectedAuthorPair = []
    },
    mergeAuthors(mergedAuthor) {
      // 合并作者的逻辑
      this.isMergeModalVisible = false
    },
    cancelNotification() {
      // 取消通知的逻辑
    }
  }
}
</script>

<style scoped>
#page-wrapper {
  background-color: #1a1a1a;
  color: #ffffff;
}

.bg-card {
  background-color: #2c2c2c;
  display: flex;
  justify-content: space-around;
  padding: 20px;
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

.text-center {
  text-align: center;
}
</style>

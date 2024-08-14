<template>
  <div id="page-wrapper" class="bg-bg page overflow-y-auto p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl mb-4 text-center">Similar Authors Detected</h1>

      <p class="text-center mb-6">The following authors are detected as similar. Do you want to merge them?</p>
      <div class="grid grid-cols-1 gap-4 justify-center">
        <div v-for="(authorPair, index) in authorPairs" :key="index" class="notification bg-card p-4 rounded-lg shadow-lg flex flex-col items-center w-full">
          <div class="flex justify-between items-center w-full mb-4 author-container">
            <AuthorCard v-for="author in authorPair" :key="author.id" :author="author" :width="cardWidth" :height="cardHeight" @edit="editAuthor" />
          </div>
          <!--     <div>
            {{ authorPair.id }}
            {{ authorPair.name }}
            {{ authorPair.alias }}
            {{ authorPair.numBooks }}
            {{ authorPair.description }}

          </div>-->
          <div class="flex justify-center space-x-4 w-full mt-4">
            <button class="btn btn-primary" @click="showMergeModal(authorPair)">Merge</button>
            <button class="btn btn-secondary" @click="cancelNotification(authorPair)">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    <merge-author-modal v-if="isMergeModalVisible" :authorA="selectedAuthorPair[0]" :authorB="selectedAuthorPair[1]" @close="closeMergeModal" @merge="handleMerge" />
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
      authorPairs: [],
      /* authorPairs: [
        [
          { id: 101, name: 'Author A', numBooks: 5, imagePath: null, asin: 'ASIN_A', description: 'Description A', alias: ['Alias A1', 'Alias A2'], handled: false },
          { id: 102, name: 'Author B', numBooks: 3, imagePath: null, asin: 'ASIN_B', description: 'Description B', alias: ['Alias B1', 'Alias B2'], handled: false }
        ]
      ],*/
      isMergeModalVisible: false,
      selectedAuthorPair: null,
      isHovering: {},
      searching: false,
      nameBelow: false,
      cardWidth: 200,
      cardHeight: 250
    }
  },
  computed: {
    hasUnreadNotifications() {
      return this.authorPairs.some((pair) => !pair[0].handled || !pair[1].handled)
    },
    userToken() {
      return this.$store.getters['user/getToken']
    },
    currentLibraryId() {
      return this.$store.state.libraries.currentLibraryId
    },
    libraryProvider() {
      return this.$store.getters['libraries/getLibraryProvider'](this.currentLibraryId) || 'google'
    },
    sizeMultiplier() {
      return this.$store.getters['user/getSizeMultiplier']
    }
  },
  methods: {
    async fetchAuthorPairs() {
      console.log('---------fetchAuthorPairs started-------------')
      try {
        const token = this.userToken
        console.log(`------------${token}---------`)
        console.log(`------------${this.$store.getters['user/getToken']}---------`)
        const response = await this.$axios.get('/api/getNotifications', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        this.authorPairs = response.data.map((notification) => {
          console.log(`------${notification}--------`)
          return [
            {
              id: notification.id,
              name: notification.name,
              numBooks: notification.numBooks,
              imagePath: notification.imagePath,
              asin: notification.asin,
              description: notification.description,
              alias: notification.alias,
              handled: notification.handled || false
            },
            {
              id: notification.id,
              name: notification.name,
              numBooks: notification.numBooks,
              imagePath: notification.imagePath,
              asin: notification.asin,
              description: notification.description,
              alias: notification.alias,
              handled: notification.handled || false
            }
          ]
        })
        this.updateGlobalNotificationsState()
        // 事件监听器绑定到获取到的 authorPairs
        // this.authorPairs.forEach((authorPair) => {
        //   this.$eventBus.$on(`searching-author-${authorPair[0].id}`, this.setSearching)
        //   this.$eventBus.$on(`searching-author-${authorPair[1].id}`, this.setSearching)
        //  })
      } catch (error) {
        console.error('Failed to fetch author pairs:', error)
      }
    },
    editAuthor(author) {
      this.$store.commit('globals/showEditAuthorModal', author)
    },
    showMergeModal(authorPair) {
      this.selectedAuthorPair = authorPair
      this.isMergeModalVisible = true
    },
    closeMergeModal() {
      this.isMergeModalVisible = false
      this.selectedAuthorPair = null
    },
    async handleMerge(mergedAuthor) {
      // 处理合并后的作者逻辑
      console.log('Merged Author:', mergedAuthor)
      /*this.isMergeModalVisible = false
      this.cancelNotification() // 合并后取消通知*/
      this.selectedAuthorPair.forEach((author) => (author.handled = true))
      await this.markNotificationAsHandled(this.selectedAuthorPair)
      this.isMergeModalVisible = false
      this.updateGlobalNotificationsState()
    },
    async cancelNotification(authorPairToCancel) {
      // 取消通知逻辑
      //this.authorPairs = []
      //this.selectedAuthorPair.forEach((author) => (author.handled = true))
      this.authorPairs = this.authorPairs.filter((pair) => pair !== authorPairToCancel)
      /* if (!Array.isArray(authorPair)) {
        console.error('Expected an array for authorPair, but received:', authorPair)
        return
      }

      // 标记 authorPair 中的所有 author 为 handled
      authorPair.forEach((author) => {
        author.handled = true
      })

      // 从 authorPairs 中移除已经处理的通知
      this.authorPairs = this.authorPairs.filter((pair) => !pair.some((author) => author.handled === false))
           */
      // 更新全局通知状态
      this.updateGlobalNotificationsState()
    },
    updateGlobalNotificationsState() {
      const hasUnread = this.authorPairs.some((pair) => !pair[0].handled || !pair[1].handled)
      this.$store.commit('setHasUnreadNotifications', hasUnread)
    },
    mouseover(index) {
      this.$set(this.isHovering, index, true)
    },
    mouseleave(index) {
      this.$set(this.isHovering, index, false)
    },
    async searchAuthor(author) {
      this.searching = true
      const payload = {}
      if (author.asin) payload.asin = author.asin
      else payload.q = author.name

      payload.region = 'us'
      if (this.libraryProvider.startsWith('audible.')) {
        payload.region = this.libraryProvider.split('.').pop() || 'us'
      }

      const response = await this.$axios.$post(`/api/authors/${author.id}/match`, payload).catch((error) => {
        console.error('Failed', error)
        return null
      })
      if (!response) {
        this.$toast.error(`Author ${author.name} not found`)
      } else if (response.updated) {
        if (response.author.imagePath) this.$toast.success(`Author ${response.author.name} was updated`)
        else this.$toast.success(`Author ${response.author.name} was updated (no image found)`)
      } else {
        this.$toast.info(`No updates were made for Author ${response.author.name}`)
      }
      this.searching = false
    }
  },
  mounted() {
    console.log('-----mounted started-------------')
    this.fetchAuthorPairs()
    /*this.authorPairs.forEach((authorPair) => {
      this.$eventBus.$on(`searching-author-${authorPair[0].id}`, this.setSearching)
      this.$eventBus.$on(`searching-author-${authorPair[1].id}`, this.setSearching)
    })*/
  },
  beforeDestroy() {
    this.authorPairs.forEach((authorPair) => {
      this.$eventBus.$off(`searching-author-${authorPair[0].id}`, this.setSearching)
      this.$eventBus.$off(`searching-author-${authorPair[1].id}`, this.setSearching)
    })
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
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.author-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  overflow: visible;
  padding-right: 10px;
}

.AuthorCard {
  flex: 0 1 calc(50% - 20px);
  max-width: calc(50% - 10px);
  margin: 0 5px;
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

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  justify-content: center;
}

.notification {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #2c2c2c;
  padding: 20px;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  overflow: hidden;
}

img {
  border-radius: 0.5rem;
}
#page-wrapper {
  padding: 20px;
}

.grid {
  gap: 10px;
}
</style>

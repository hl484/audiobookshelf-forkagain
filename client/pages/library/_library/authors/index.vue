<template>
  <div class="page" :class="streamLibraryItem ? 'streaming' : ''">
    <app-book-shelf-toolbar page="authors" is-home :authors="authors" />
    <div id="bookshelf" class="w-full h-full p-8e overflow-y-auto" :style="{ fontSize: sizeMultiplier + 'rem' }">
      <!-- Cover size widget -->
      <widgets-cover-size-widget class="fixed right-4 z-50" :style="{ bottom: streamLibraryItem ? '181px' : '16px' }" />
      <div class="flex justify-end p-4">
        <button class="btn" :class="mergeButtonClass" @click="showMergeModal" :disabled="selectedAuthors.length !== 2">Merge</button>
      </div>
      <div class="flex flex-wrap justify-center">
        <template v-for="author in authorsSorted">
          <div class="author-card-container p-3e">
            <cards-author-card :key="author.id" :author="author" @edit="editAuthor" />
            <div class="flex justify-center mt-2">
              <!-- <input type="checkbox" v-model="selectedAuthorsMap[author.id]" @change="updateSelectedAuthors" :disabled="selectedAuthors.length >= 2 && !selectedAuthorsMap[author.id]" /> -->
            </div>
          </div>
        </template>
      </div>
    </div>

    <edit-modal />
    <merge-author-modal v-if="isMergeModalVisible" :authorA="selectedAuthors[0]" :authorB="selectedAuthors[1]" @close="closeMergeModal" @merge="handleMerge" />
    <merge-author-modal v-if="isMergeModalVisible" :authorA="selectedAuthors[0]" :authorB="selectedAuthors[1]" @close="closeMergeModal" @merge="handleMerge" />
  </div>
</template>

<script>
import EditModal from '@/components/modals/authors/EditModal.vue'
import MergeAuthorModal from '@/components/modals/MergeAuthorModal.vue'

export default {
  components: {
    EditModal,
    MergeAuthorModal
  },
  async asyncData({ store, params, redirect }) {
    var libraryId = params.library
    var libraryData = await store.dispatch('libraries/fetch', libraryId)
    if (!libraryData) {
      return redirect('/oops?message=Library not found')
    }

    const library = libraryData.library
    if (library.mediaType === 'podcast') {
      return redirect(`/library/${libraryId}`)
    }

    return {
      libraryId
    }
  },
  data() {
    return {
      loading: true,
      authors: [],
      selectedAuthorsMap: {},
      isMergeModalVisible: false
    }
  },
  computed: {
    sizeMultiplier() {
      return this.$store.getters['user/getSizeMultiplier']
    },
    streamLibraryItem() {
      return this.$store.state.streamLibraryItem
    },
    currentLibraryId() {
      return this.$store.state.libraries.currentLibraryId
    },
    selectedAuthors() {
      return this.authors.filter((author) => this.selectedAuthorsMap[author.id])
    },
    mergeButtonClass() {
      return this.selectedAuthors.length === 2 ? 'btn-primary' : 'btn-disabled'
    },
    authorSortBy() {
      return this.$store.getters['user/getUserSetting']('authorSortBy') || 'name'
    },
    authorSortDesc() {
      return !!this.$store.getters['user/getUserSetting']('authorSortDesc')
    },
    authorsSorted() {
      const sortProp = this.authorSortBy
      const bDesc = this.authorSortDesc ? -1 : 1
      return this.authors.sort((a, b) => {
        if (typeof a[sortProp] === 'number' && typeof b[sortProp] === 'number') {
          return a[sortProp] > b[sortProp] ? bDesc : -bDesc
        }
        return a[sortProp].localeCompare(b[sortProp], undefined, { sensitivity: 'base' }) * bDesc
      })
    }
  },
  methods: {
    async init() {
      this.authors = await this.$axios
        .$get(`/api/libraries/${this.currentLibraryId}/authors`)
        .then((response) => response.authors)
        .catch((error) => {
          console.error('Failed to load authors', error)
          return []
        })
      this.loading = false
    },
    authorAdded(author) {
      if (!this.authors.some((au) => au.id === author.id)) {
        this.authors.push(author)
      }
    },
    authorUpdated(author) {
      this.authors = this.authors.map((au) => {
        if (au.id === author.id) {
          return author
        }
        return au
      })
    },
    authorRemoved(author) {
      this.authors = this.authors.filter((au) => au.id !== author.id)
    },
    editAuthor(author) {
      this.confirmMerge(() => {
        this.$store.commit('globals/showEditAuthorModal', author)
      })
    },
    confirmMerge(callback) {
      const payload = {
        message: 'Discover similar authors xxx and xxx, do you want to merge them?',
        type: 'yesNo',
        callback: (confirmed) => {
          if (confirmed) {
            console.log('Authors merged')
          }
          if (typeof callback === 'function') {
            callback()
          }
        }
      }
      this.$store.commit('globals/setConfirmPrompt', payload)
    },
    updateSelectedAuthors() {
      this.selectedAuthors = this.authors.filter((author) => this.selectedAuthorsMap[author.id])
      this.selectedAuthors = this.authors.filter((author) => this.selectedAuthorsMap[author.id])
    },
    showMergeModal() {
      if (this.selectedAuthors.length === 2) {
        this.isMergeModalVisible = true
      }
    },
    closeMergeModal() {
      this.isMergeModalVisible = false
    },
    handleMerge(mergedAuthor) {
      //TODO: API that merge two authors
      console.log('Merged Author:', mergedAuthor)
      this.isMergeModalVisible = false
      this.selectedAuthorsMap = {}
    },
    toggleAuthorSelection(authorId) {
      this.$set(this.selectedAuthorsMap, authorId, !this.selectedAuthorsMap[authorId])
    }
  },
  mounted() {
    this.init()
    this.$root.socket.on('author_added', this.authorAdded)
    this.$root.socket.on('author_updated', this.authorUpdated)
    this.$root.socket.on('author_removed', this.authorRemoved)
  },
  beforeDestroy() {
    this.$root.socket.off('author_added', this.authorAdded)
    this.$root.socket.off('author_updated', this.authorUpdated)
    this.$root.socket.off('author_removed', this.authorRemoved)
  }
}
</script>

<style scoped>
.page {
  background-color: #1a1a1a;
  color: #ffffff;
}

.author-card-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background-color: #28a745;
  color: #ffffff;
}

.btn-disabled {
  background-color: #6c757d;
  color: #ffffff;
}

.flex {
  display: flex;
}

.justify-end {
  justify-content: flex-end;
}

.justify-center {
  justify-content: center;
}

.mt-2 {
  margin-top: 0.5rem;
}

.p-4 {
  padding: 1rem;
}

.p-8e {
  padding: 2rem;
}
</style>

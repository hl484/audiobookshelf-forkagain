<template>
  <div id="page-wrapper" class="bg-bg page overflow-y-auto p-4 md:p-8" :class="streamLibraryItem ? 'streaming' : ''">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-wrap sm:flex-nowrap justify-center mb-6">
        <div class="w-48 min-w-48">
          <div class="w-full h-60">
            <covers-author-image :author="author" rounded="0" />
          </div>
        </div>
        <div class="flex-grow py-4 sm:py-0 px-4 md:px-8">
          <div class="flex items-center mb-8">
            <h1 class="text-2xl">{{ author.name }}</h1>

            <button v-if="userCanUpdate" class="w-8 h-8 rounded-full flex items-center justify-center mx-4 cursor-pointer text-gray-300 hover:text-warning transform hover:scale-125 duration-100" @click="editAuthor">
              <span class="material-symbols text-base">edit</span>
            </button>
          </div>

          <!-- Alias or Original Author Section -->
          <div v-if="originalAuthor" class="mb-4">
            <p class="text-white text-opacity-60 uppercase text-xs mb-2">Origin Author:</p>
            <nuxt-link :to="`/author/${originalAuthor.id}`" class="block bg-gray-800 p-2 rounded mb-2 text-white">
              {{ originalAuthor.name }}
            </nuxt-link>
          </div>
          <div v-else-if="aliases.length" class="mb-4">
            <p class="text-white text-opacity-60 uppercase text-xs mb-2">Aliases:</p>
            <div v-for="alias in aliases" :key="alias.id" class="bg-gray-800 p-2 rounded mb-2 text-white">
              <nuxt-link :to="`/author/${alias.id}`" class="block">{{ alias.name }}</nuxt-link>
            </div>
          </div>

          <p v-if="author.description" class="text-white text-opacity-60 uppercase text-xs mb-2">{{ $strings.LabelDescription }}</p>
          <p ref="description" id="author-description" class="text-white max-w-3xl text-base whitespace-pre-wrap" :class="{ 'show-full': showFullDescription }">{{ author.description }}</p>
          <button v-if="isDescriptionClamped" class="py-0.5 flex items-center text-slate-300 hover:text-white" @click="showFullDescription = !showFullDescription">
            {{ showFullDescription ? $strings.ButtonReadLess : $strings.ButtonReadMore }} <span class="material-symbols text-xl pl-1">{{ showFullDescription ? 'expand_less' : 'expand_more' }}</span>
          </button>
        </div>
      </div>

      <div class="py-4">
        <widgets-item-slider :items="libraryItems" shelf-id="author-books" :bookshelf-view="$constants.BookshelfView.AUTHOR">
          <nuxt-link :to="`/library/${currentLibraryId}/bookshelf?filter=authors.${$encode(author.id)}`" class="hover:underline">
            <h2 class="text-lg">{{ libraryItems.length }} {{ $strings.LabelBooks }}</h2>
          </nuxt-link>
        </widgets-item-slider>
      </div>

      <div v-for="series in authorSeries" :key="series.id" class="py-4">
        <widgets-item-slider :items="series.items" :shelf-id="series.id" :bookshelf-view="$constants.BookshelfView.AUTHOR">
          <nuxt-link :to="`/library/${currentLibraryId}/series/${series.id}`" class="hover:underline">
            <h2 class="text-lg">{{ series.name }}</h2>
          </nuxt-link>
          <p class="text-white text-opacity-40 text-base px-2">{{ $strings.LabelSeries }}</p>
        </widgets-item-slider>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  async asyncData({ store, app, params, redirect, query }) {
    const author = await app.$axios.$get(`/api/authors/${params.id}?include=items,series`).catch((error) => {
      console.error('Failed to get author', error)
      return null
    })

    // const authorAliases = await app.$axios.$get(`/api/authors/${params.id}/alias`).catch((error) => {
    //   console.error('Failed to get aliases', error)
    //   return []
    // })

    if (!author) {
      return redirect(`/library/${store.state.libraries.currentLibraryId}/authors`)
    }

    if (query.library) {
      store.commit('libraries/setCurrentLibrary', query.library)
    }

    return {
      author,
      originalAuthor: author.originalAuthor || null,
      aliases: author.aliases || []
    }
  },
  data() {
    return {
      isDescriptionClamped: false,
      showFullDescription: false
    }
  },
  computed: {
    streamLibraryItem() {
      return this.$store.state.streamLibraryItem
    },
    currentLibraryId() {
      return this.$store.state.libraries.currentLibraryId
    },
    libraryItems() {
      return this.author.libraryItems || []
    },
    authorSeries() {
      return this.author.series || []
    },
    userCanUpdate() {
      return this.$store.getters['user/getUserCanUpdate']
    }
  },
  methods: {
    checkDescriptionClamped() {
      if (!this.$refs.description) return
      this.isDescriptionClamped = this.$refs.description.scrollHeight > this.$refs.description.clientHeight
    },
    editAuthor() {
      this.$store.commit('globals/showEditAuthorModal', this.author)
    },
    authorUpdated(author) {
      if (author.id === this.author.id) {
        console.log('Author was updated', author)
        this.author = {
          ...author,
          series: this.authorSeries,
          libraryItems: this.libraryItems
        }
        this.$nextTick(this.checkDescriptionClamped)
      }
    },
    authorRemoved(author) {
      if (author.id === this.author.id) {
        console.warn('Author was removed')
        this.$router.replace(`/library/${this.currentLibraryId}/authors`)
      }
    }
  },
  mounted() {
    if (!this.author) this.$router.replace('/')
    this.checkDescriptionClamped()

    this.$root.socket.on('author_updated', this.authorUpdated)
    this.$root.socket.on('author_removed', this.authorRemoved)
  },
  beforeDestroy() {
    this.$root.socket.off('author_updated', this.authorUpdated)
    this.$root.socket.off('author_removed', this.authorRemoved)
  }
}
</script>


<style scoped>
#author-description {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  max-height: 6.25rem;
  transition: all 0.3s ease-in-out;
}
#author-description.show-full {
  -webkit-line-clamp: unset;
  max-height: 999rem;
}

.alias-box {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  margin: 0.25rem;
}
</style>

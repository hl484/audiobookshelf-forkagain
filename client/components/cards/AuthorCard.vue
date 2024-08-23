<template>
  <div :style="{ minWidth: cardWidth + 'px', maxWidth: cardWidth + 'px' }">
    <nuxt-link :to="`/author/${author.id}`">
      <div cy-id="card" @mouseover="mouseover" @mouseleave="mouseleave" @click="clickCard" :class="overlayWrapperClasslist">
        <div cy-id="imageArea" :style="{ height: cardHeight + 'px' }" class="bg-primary box-shadow-book rounded-md relative overflow-hidden">
          <!-- Image or placeholder -->
          <covers-author-image :author="author" />

          <!-- Author name & num books overlay -->
          <div cy-id="textInline" v-show="!searching && !nameBelow" class="absolute bottom-0 left-0 w-full py-1e bg-black bg-opacity-60 px-2e">
            <p class="text-center font-semibold truncate" :style="{ fontSize: 0.75 + 'em' }">{{ name }}</p>
            <p class="text-center text-gray-200" :style="{ fontSize: 0.65 + 'em' }">{{ numBooks }} {{ $strings.LabelBooks }}</p>
          </div>

          <!-- Search icon btn -->
          <div cy-id="match" v-show="!searching && isHovering && userCanUpdate" class="absolute top-0 left-0 p-2e cursor-pointer hover:text-white text-gray-200 transform hover:scale-125 duration-150" @click.prevent.stop="searchAuthor">
            <ui-tooltip :text="$strings.ButtonQuickMatch" direction="bottom">
              <span class="material-symbols" :style="{ fontSize: 1.125 + 'em' }">search</span>
            </ui-tooltip>
          </div>
          <div cy-id="edit" v-show="isHovering && !searching && userCanUpdate" class="absolute top-0 right-0 p-2e cursor-pointer hover:text-white text-gray-200 transform hover:scale-125 duration-150" @click.prevent.stop="$emit('edit', author)">
            <ui-tooltip :text="$strings.LabelEdit" direction="bottom">
              <span class="material-symbols" :style="{ fontSize: 1.125 + 'em' }">edit</span>
            </ui-tooltip>
          </div>

          <!-- Radio button -->
          <div cy-id="selectedRadioButton" v-if="!isAuthorBookshelfView" class="absolute cursor-pointer hover:text-yellow-300 hover:scale-125 transform duration-100" :style="{ bottom: 0.375 + 'em', left: 0.375 + 'em' }" @click.stop.prevent="selectBtnClick">
            <span class="material-symbols" :class="selected ? 'text-yellow-400' : ''" :style="{ fontSize: 1.25 + 'em' }">{{ selected ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
          </div>

          <!-- Loading spinner -->
          <div cy-id="spinner" v-show="searching" class="absolute top-0 left-0 z-10 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
            <widgets-loading-spinner size="" />
          </div>
        </div>
        <div cy-id="nameBelow" v-show="nameBelow" class="w-full py-1e px-2e">
          <p class="text-center font-semibold truncate text-gray-200" :style="{ fontSize: 0.75 + 'em' }">{{ name }}</p>
        </div>

        <!-- Series name overlay -->
        <div cy-id="seriesNameOverlay" v-if="booksInSeries && libraryItem && isHovering" class="w-full h-full absolute top-0 left-0 z-10 bg-black bg-opacity-60 rounded flex items-center justify-center" :style="{ padding: 1 + 'em' }">
          <p v-if="seriesName" class="text-gray-200 text-center" :style="{ fontSize: 1.1 + 'em' }">{{ seriesName }}</p>
        </div>

        <!-- Error widget -->
        <ui-tooltip cy-id="ErrorTooltip" v-if="showError" :text="errorText" class="absolute bottom-4e left-0 z-10">
          <div :style="{ height: 1.5 + 'em', width: 2.5 + 'em' }" class="bg-error rounded-r-full shadow-md flex items-center justify-end border-r border-b border-red-300">
            <span class="material-symbols text-red-100 pr-1e" :style="{ fontSize: 0.875 + 'em' }">priority_high</span>
          </div>
        </ui-tooltip>

        <!-- rss feed icon -->
        <div cy-id="rssFeed" v-if="rssFeed && !isSelectionMode && !isHovering" class="absolute text-success top-0 left-0 z-10" :style="{ padding: 0.375 + 'em' }">
          <span class="material-symbols" :style="{ fontSize: 1.5 + 'em' }">rss_feed</span>
        </div>
        <!-- media item shared icon -->
        <div cy-id="mediaItemShare" v-if="mediaItemShare && !isSelectionMode && !isHovering" class="absolute text-success left-0 z-10" :style="{ padding: 0.375 + 'em', top: rssFeed ? '2em' : '0px' }">
          <span class="material-symbols" :style="{ fontSize: 1.5 + 'em' }">public</span>
        </div>

        <!-- Series sequence -->
        <div cy-id="seriesSequence" v-if="seriesSequence && !isHovering && !isSelectionMode" class="absolute rounded-lg bg-black bg-opacity-90 box-shadow-md z-10" :style="{ top: 0.375 + 'em', right: 0.375 + 'em', padding: `${0.1}em ${0.25}em` }">
          <p :style="{ fontSize: 0.8 + 'em' }">#{{ seriesSequence }}</p>
        </div>

        <!-- Podcast Episode # -->
        <div cy-id="podcastEpisodeNumber" v-if="recentEpisodeNumber !== null && !isHovering && !isSelectionMode && !processing" class="absolute rounded-lg bg-black bg-opacity-90 box-shadow-md z-10" :style="{ top: 0.375 + 'em', right: 0.375 + 'em', padding: `${0.1}em ${0.25}em` }">
          <p :style="{ fontSize: 0.8 + 'em' }">
            Episode<span v-if="recentEpisodeNumber"> #{{ recentEpisodeNumber }}</span>
          </p>
        </div>

        <!-- Podcast Num Episodes -->
        <div cy-id="numEpisodes" v-else-if="!numEpisodesIncomplete && numEpisodes && !isHovering && !isSelectionMode" class="absolute rounded-full bg-black bg-opacity-90 box-shadow-md z-10 flex items-center justify-center" :style="{ top: 0.375 + 'em', right: 0.375 + 'em', width: 1.25 + 'em', height: 1.25 + 'em' }">
          <p :style="{ fontSize: 0.8 + 'em' }">{{ numEpisodes }}</p>
        </div>

        <!-- Podcast Num Episodes -->
        <div cy-id="numEpisodesIncomplete" v-else-if="numEpisodesIncomplete && !isHovering && !isSelectionMode" class="absolute rounded-full bg-yellow-400 text-black font-semibold box-shadow-md z-10 flex items-center justify-center" :style="{ top: 0.375 + 'em', right: 0.375 + 'em', width: 1.25 + 'em', height: 1.25 + 'em' }">
          <p :style="{ fontSize: 0.8 + 'em' }">{{ numEpisodesIncomplete }}</p>
        </div>
      </div>
    </nuxt-link>
  </div>
</template>

<script>
export default {
  props: {
    author: {
      type: Object,
      default: () => {}
    },
    width: Number,
    height: {
      type: Number,
      default: 192
    },
    nameBelow: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      searching: false,
      isHovering: false,
      selected: false,
      processing: false,
      libraryItem: null,
      imageReady: false,
      selected: false,
      isSelectionMode: false,
      displayTitleTruncated: false,
      displaySubtitleTruncated: false,
      showCoverBg: false
      // isSelectionMode: false//
    }
  },
  computed: {
    cardWidth() {
      return this.width || this.cardHeight * 0.8
    },
    cardHeight() {
      return this.height * this.sizeMultiplier
    },
    userToken() {
      return this.$store.getters['user/getToken']
    },
    _author() {
      return this.author || {}
    },
    authorId() {
      return this._author.id
    },
    name() {
      return this._author.name || ''
    },
    asin() {
      return this._author.asin || ''
    },
    numBooks() {
      return this._author.numBooks || 0
    },
    userCanUpdate() {
      return this.$store.getters['user/getUserCanUpdate']
    },
    currentLibraryId() {
      return this.$store.state.libraries.currentLibraryId
    },
    libraryProvider() {
      return this.$store.getters['libraries/getLibraryProvider'](this.currentLibraryId) || 'google'
    },
    sizeMultiplier() {
      return this.$store.getters['user/getSizeMultiplier']
    },

    // 添加从 LazyBook.vue 粘贴的计算属性
    overlayWrapperClasslist() {
      const classes = []

      if (this.isSelectionMode) {
        classes.push('bg-opacity-60')
      } else {
        classes.push('bg-opacity-40')
      }

      if (this.selected) {
        classes.push('border-2', 'border-yellow-400')
      }

      if (this.isHovering) {
        classes.push('hover-white-border')
      }

      return classes
    }
  },
  methods: {
    mouseover() {
      this.isHovering = true
    },
    mouseleave() {
      this.isHovering = false
    },
    clickCard(e) {
      this.selected = !this.selected

      if (this.processing) return
      if (this.isSelectionMode) {
        e.stopPropagation()
        e.preventDefault()
        this.selectBtnClick(e)
      } else {
        var router = this.$router || this.$nuxt.$router
        if (router) {
          if (this.collapsedSeries) router.push(`/library/${this.libraryId}/series/${this.collapsedSeries.id}`)
          else router.push(`/item/${this.libraryItemId}`)
        }
      }
      // this.isSelectionMode = this.selected//
    },

    async searchAuthor() {
      this.searching = true
      const payload = {}
      if (this.asin) payload.asin = this.asin
      else payload.q = this.name

      payload.region = 'us'
      if (this.libraryProvider.startsWith('audible.')) {
        payload.region = this.libraryProvider.split('.').pop() || 'us'
      }

      var response = await this.$axios.$post(`/api/authors/${this.authorId}/match`, payload).catch((error) => {
        console.error('Failed', error)
        return null
      })
      if (!response) {
        this.$toast.error(`Author ${this.name} not found`)
      } else if (response.updated) {
        if (response.author.imagePath) this.$toast.success(`Author ${response.author.name} was updated`)
        else this.$toast.success(`Author ${response.author.name} was updated (no image found)`)
      } else {
        this.$toast.info(`No updates were made for Author ${response.author.name}`)
      }
      this.searching = false
    },

    setSearching(isSearching) {
      this.searching = isSearching
    },
    //add selectmethod
    selectBtnClick(evt) {
      if (this.processingBatch) return
      this.selected = !this.selected
      this.$emit('select', { entity: this.libraryItem, shiftKey: evt.shiftKey })
    }
  },

  mounted() {
    this.$eventBus.$on(`searching-author-${this.authorId}`, this.setSearching)
  },
  beforeDestroy() {
    this.$eventBus.$off(`searching-author-${this.authorId}`, this.setSearching)
  }
}
</script>
<style scoped>
.hover-white-border {
  border: 2px solid white;
}

.border-yellow-400.selected {
  border-color: yellow;
}
</style>

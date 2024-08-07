<template>
  <div class="modal-overlay">
    <div class="modal-container">
      <h2 class="modal-title">Merge Authors</h2>
      <div class="author-sections">
        <div class="author-section">
          <h3>Author A</h3>
          <div class="author-details">
            <label>
              <input type="checkbox" v-model="selectedAuthorAName" @change="updateMergedAuthorName('A')" />
              Name: {{ authorA.name }}
            </label>
            <label>
              <input type="checkbox" v-model="selectedAuthorAImage" @change="updateMergedAuthorImage('A')" />
              <covers-author-image :author="authorA" />
            </label>
            <label>
              <input type="checkbox" v-model="selectedAuthorAASIN" @change="updateMergedAuthorASIN('A')" />
              ASIN: {{ authorA.asin }}
            </label>
            <label>
              <input type="checkbox" v-model="selectedAuthorADescription" @change="updateMergedAuthorDescription('A')" />
              Description: {{ authorA.description }}
            </label>
            <label v-for="(alias, index) in authorA.alias" :key="index">
              <input type="checkbox" v-model="selectedAuthorAAlias[index]" @change="updateMergedAuthorAlias('A', index)" />
              Alias: {{ alias }}
            </label>
          </div>
        </div>
        <div class="author-section">
          <h3>Author B</h3>
          <div class="author-details">
            <label>
              <input type="checkbox" v-model="selectedAuthorBName" @change="updateMergedAuthorName('B')" />
              Name: {{ authorB.name }}
            </label>
            <label>
              <input type="checkbox" v-model="selectedAuthorBImage" @change="updateMergedAuthorImage('B')" />
              <covers-author-image :author="authorB" />
            </label>
            <label>
              <input type="checkbox" v-model="selectedAuthorBASIN" @change="updateMergedAuthorASIN('B')" />
              ASIN: {{ authorB.asin }}
            </label>
            <label>
              <input type="checkbox" v-model="selectedAuthorBDescription" @change="updateMergedAuthorDescription('B')" />
              Description: {{ authorB.description }}
            </label>
            <label v-for="(alias, index) in authorB.alias" :key="index">
              <input type="checkbox" v-model="selectedAuthorBAlias[index]" @change="updateMergedAuthorAlias('B', index)" />
              Alias: {{ alias }}
            </label>
          </div>
        </div>
        <div class="merged-author-section">
          <h3>Merged Author</h3>
          <div class="author-details">
            <p>Name: {{ mergedAuthor.name }}</p>
            <covers-author-image :author="mergedAuthor" />
            <p>ASIN: {{ mergedAuthor.asin }}</p>
            <p>Description: {{ mergedAuthor.description }}</p>
            <p>Alias: {{ mergedAuthor.alias }}</p>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" @click="mergeAuthors">Merge</button>
        <button class="btn btn-secondary" @click="close">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
import CoversAuthorImage from '@/components/covers/AuthorImage.vue'

export default {
  components: {
    CoversAuthorImage
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
      mergedAuthor: {
        name: '',
        imagePath: '',
        asin: '',
        description: '',
        alias: []
      },
      selectedAuthorAName: false,
      selectedAuthorAImage: false,
      selectedAuthorAASIN: false,
      selectedAuthorADescription: false,
      selectedAuthorAAlias: [],
      selectedAuthorBName: false,
      selectedAuthorBImage: false,
      selectedAuthorBASIN: false,
      selectedAuthorBDescription: false,
      selectedAuthorBAlias: [],
      searching: false
    }
  },
  methods: {
    updateMergedAuthorName(author) {
      if (author === 'A') {
        this.mergedAuthor.name = this.selectedAuthorAName ? this.authorA.name : this.authorB.name
      } else {
        this.mergedAuthor.name = this.selectedAuthorBName ? this.authorB.name : this.authorA.name
      }
    },
    updateMergedAuthorImage(author) {
      if (author === 'A') {
        this.mergedAuthor.imagePath = this.selectedAuthorAImage ? this.authorA.imagePath : this.authorB.imagePath
      } else {
        this.mergedAuthor.imagePath = this.selectedAuthorBImage ? this.authorB.imagePath : this.authorA.imagePath
      }
    },
    updateMergedAuthorASIN(author) {
      if (author === 'A') {
        this.mergedAuthor.asin = this.selectedAuthorAASIN ? this.authorA.asin : this.authorB.asin
      } else {
        this.mergedAuthor.asin = this.selectedAuthorBASIN ? this.authorB.asin : this.authorA.asin
      }
    },
    updateMergedAuthorDescription(author) {
      if (author === 'A') {
        this.mergedAuthor.description = this.selectedAuthorADescription ? this.authorA.description : this.authorB.description
      } else {
        this.mergedAuthor.description = this.selectedAuthorBDescription ? this.authorB.description : this.authorA.description
      }
    },
    updateMergedAuthorAlias(author, index) {
      if (author === 'A') {
        this.$set(this.mergedAuthor.alias, index, this.selectedAuthorAAlias[index] ? this.authorA.alias[index] : this.authorB.alias[index])
      } else {
        this.$set(this.mergedAuthor.alias, index, this.selectedAuthorBAlias[index] ? this.authorB.alias[index] : this.authorA.alias[index])
      }
    },
    mergeAuthors() {
      this.$emit('merge', this.mergedAuthor)
      this.close()
    },
    close() {
      this.$emit('close')
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
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-container {
  background-color: #1a1a1a;
  padding: 20px;
  border-radius: 10px;
  width: 800px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  text-align: center;
  font-size: 24px;
  margin-bottom: 20px;
}

.author-sections {
  display: flex;
  justify-content: space-between;
}

.author-section,
.merged-author-section {
  flex: 1;
  margin: 0 10px;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-details label {
  margin-bottom: 10px;
}

.merged-author-section {
  border-left: 2px solid #333;
  padding-left: 20px;
}

.modal-actions {
  text-align: center;
  margin-top: 20px;
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
  margin-left: 10px;
}

.btn-secondary:hover {
  background-color: #4b5563;
}
</style>

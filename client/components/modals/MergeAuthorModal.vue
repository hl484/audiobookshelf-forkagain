<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <h2 class="modal-title">Merge Authors</h2>
      <div class="author-sections">
        <!-- Author A Section -->
        <div class="author-section">
          <h3>Author A</h3>
          <div class="author-details">
            <label>
              <input type="radio" name="name" v-model="selectedAuthor" value="A" @change="updateMergedAuthorName('A')" />
              Name: {{ authorA.name }}
            </label>
            <label>
              <input type="radio" name="image" v-model="selectedImage" value="A" @change="updateMergedAuthorImage('A')" />
              <div class="author-image-container">
                <covers-author-image :author="authorA" :default-image="defaultImage" />
              </div>
            </label>
            <label>
              <input type="radio" name="asin" v-model="selectedASIN" value="A" @change="updateMergedAuthorASIN('A')" />
              ASIN: {{ authorA.asin }}
            </label>
            <label>
              <input type="radio" name="description" v-model="selectedDescription" value="A" @change="updateMergedAuthorDescription('A')" />
              Description: {{ authorA.description }}
            </label>
            <label v-for="(alias, index) in authorA.alias" :key="index">
              <input type="radio" :name="'alias' + index" v-model="selectedAlias[index]" :value="`A${index}`" @change="updateMergedAuthorAlias('A', index)" />
              Alias: {{ alias }}
            </label>
            <button class="btn btn-merge-alias" @click="mergeAliasesToB">Merge A Aliases to B</button>
          </div>
        </div>

        <!-- Author B Section -->
        <div class="author-section">
          <h3>Author B</h3>
          <div class="author-details">
            <label>
              <input type="radio" name="name" v-model="selectedAuthor" value="B" @change="updateMergedAuthorName('B')" />
              Name: {{ authorB.name }}
            </label>
            <label>
              <input type="radio" name="image" v-model="selectedImage" value="B" @change="updateMergedAuthorImage('B')" />
              <div class="author-image-container">
                <covers-author-image :author="authorB" :default-image="defaultImage" />
              </div>
            </label>
            <label>
              <input type="radio" name="asin" v-model="selectedASIN" value="B" @change="updateMergedAuthorASIN('B')" />
              ASIN: {{ authorB.asin }}
            </label>
            <label>
              <input type="radio" name="description" v-model="selectedDescription" value="B" @change="updateMergedAuthorDescription('B')" />
              Description: {{ authorB.description }}
            </label>
            <label v-for="(alias, index) in authorB.alias" :key="index">
              <input type="radio" :name="'alias' + index" v-model="selectedAlias[index]" :value="`B${index}`" @change="updateMergedAuthorAlias('B', index)" />
              Alias: {{ alias }}
            </label>
            <button class="btn btn-merge-alias" @click="mergeAliasesToA">Merge B Aliases to A</button>
          </div>
        </div>

        <!-- Merged Author Section -->
        <div class="merged-author-section">
          <h3>Merged Author</h3>
          <div class="author-details">
            <p>Name: {{ mergedAuthor.name }}</p>
            <div class="author-image-container">
              <covers-author-image :author="mergedAuthor" :default-image="defaultImage" />
            </div>
            <p>ASIN: {{ mergedAuthor.asin }}</p>
            <p>Description: {{ mergedAuthor.description }}</p>
            <p>Alias: {{ mergedAuthor.alias.join(', ') }}</p>
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
      selectedAuthor: 'A',
      selectedImage: 'A',
      selectedASIN: 'A',
      selectedDescription: 'A',
      selectedAlias: {},
      defaultImage: '/path/to/default-image.png' // 提供图像占位符路径
    }
  },
  methods: {
    updateMergedAuthorName(author) {
      this.mergedAuthor.name = author === 'A' ? this.authorA.name : this.authorB.name
    },
    updateMergedAuthorImage(author) {
      this.mergedAuthor.imagePath = author === 'A' ? this.authorA.imagePath : this.authorB.imagePath
    },
    updateMergedAuthorASIN(author) {
      this.mergedAuthor.asin = author === 'A' ? this.authorA.asin : this.authorB.asin
    },
    updateMergedAuthorDescription(author) {
      this.mergedAuthor.description = author === 'A' ? this.authorA.description : this.authorB.description
    },
    updateMergedAuthorAlias(author, index) {
      this.$set(this.mergedAuthor.alias, index, author === 'A' ? this.authorA.alias[index] : this.authorB.alias[index])
    },
    mergeAliasesToB() {
      this.mergedAuthor.alias = [...new Set([...this.authorB.alias, ...this.authorA.alias])]
    },
    mergeAliasesToA() {
      this.mergedAuthor.alias = [...new Set([...this.authorA.alias, ...this.authorB.alias])]
    },
    async mergeAuthors() {
      try {
        const payload = {
          authorAId: this.authorA.id,
          authorBId: this.authorB.id,
          mergedAuthorData: this.mergedAuthor
        }
        const response = await this.$axios.post('/api/authors/merge', payload)
        this.$toast.success('Authors merged successfully')
        this.$emit('merge', response.data)
        this.close()
      } catch (error) {
        this.$toast.error('Failed to merge authors')
        console.error('Merge error:', error)
      }
    },
    close() {
      this.$emit('close')
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
  width: 70%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-title {
  text-align: center;
  font-size: 24px;
  margin-bottom: 20px;
}

.author-sections {
  display: flex;
  justify-content: space-between;
  flex-grow: 1;
  overflow-y: auto;
}

.author-section,
.merged-author-section {
  flex: 1;
  margin-right: 10px;
  max-width: 30%;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-details label {
  margin-bottom: 10px;
}

.author-image {
  max-width: 100px;
  max-height: 100px;
  object-fit: cover;
  border-radius: 10px;
  margin-bottom: 10px;
}

.merged-author-section {
  border-left: none;
  padding-left: 0;
}

.modal-actions {
  text-align: center;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #333;
  position: relative;
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

/* 新增样式 */
.btn-merge-alias {
  background-color: #34d399; /* 自定义颜色 */
  color: #1a1a1a;
  margin-top: 10px;
}

.btn-merge-alias:hover {
  background-color: #10b981; /* hover 颜色 */
}

.author-image-container {
  background-image: url('/path/to/default-image.png');
  background-size: cover;
  background-position: center;
  width: 100px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
}
</style>

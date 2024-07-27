const { DataTypes, Model } = require('sequelize')

class BookAlias extends Model {
  constructor(values, options) {
    super(values, options)

    /** @type {UUIDV4} */
    this.id
    /** @type {UUIDV4} */
    this.bookId
    /** @type {UUIDV4} */
    this.aliasId
    /** @type {Date} */
    this.createdAt
  }

  static removeByIds(aliasId = null, bookId = null) {
    const where = {}
    if (aliasId) where.aliasId = aliasId
    if (bookId) where.bookId = bookId
    return this.destroy({
      where
    })
  }

  /**
   * Get number of books for alias
   *
   * @param {string} aliasId
   * @returns {Promise<number>}
   */
  static getCountForAlias(aliasId) {
    return this.count({
      where: {
        aliasId
      }
    })
  }

  /**
   * Initialize model
   * @param {import('../Database').sequelize} sequelize
   */
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        }
      },
      {
        sequelize,
        modelName: 'bookAlias',
        timestamps: true,
        updatedAt: false
      }
    )

    const { book, alias } = sequelize.models
    book.belongsToMany(alias, { through: BookAlias })
    alias.belongsToMany(book, { through: BookAlias })

    book.hasMany(BookAlias, {
      onDelete: 'CASCADE'
    })
    BookAlias.belongsTo(book)

    alias.hasMany(BookAlias, {
      onDelete: 'CASCADE'
    })
    BookAlias.belongsTo(alias)
  }
}
module.exports = BookAlias


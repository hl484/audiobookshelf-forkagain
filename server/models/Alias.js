const { DataTypes, Model, where, fn, col } = require('sequelize')
const Logger = require('../Logger')

class Alias extends Model {
  constructor(values, options) {
    super(values, options)

    /** @type {UUIDV4} */
    this.id
    /** @type {string} */
    this.name
    /** @type {UUIDV4} */
    this.authorId
    /** @type {Date} */
    this.updatedAt
    /** @type {Date} */
    this.createdAt
  }

  /**
   * Get the alias by ID
   * @param {string} aliasId
   * @returns {Promise<Alias>}
   */
  static async getAliasById(aliasId) {
    return this.findByPk(aliasId)
  }

  /**
   * Remove alias by ID
   * @param {string} aliasId
   * @returns {Promise<void>}
   */
  static async removeAliasById(aliasId) {
    await this.destroy({
      where: {
        id: aliasId
      }
    })
    Logger.info(`Alias with ID ${aliasId} removed`)
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
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        authorId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Author',
            key: 'id'
          }
        },
        updatedAt: DataTypes.DATE,
        createdAt: DataTypes.DATE
      },
      {
        sequelize,
        modelName: 'alias',
        indexes: [
          {
            fields: [
              {
                name: 'name',
                collate: 'NOCASE'
              }
            ]
          }
        ]
      }
    )
  }

  /**
   * Define associations
   * @param {import('../Database').sequelize} sequelize
   */
  static associate(models) {
    this.belongsTo(models.Author, {
      foreignKey: 'authorId',
      as: 'authors',
      onDelete: 'CASCADE'
    })
  }
}

module.exports = Alias

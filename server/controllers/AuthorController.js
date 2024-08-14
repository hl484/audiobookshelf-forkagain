const sequelize = require('sequelize')
const fs = require('../libs/fsExtra')
const { createNewSortInstance } = require('../libs/fastSort')

const Logger = require('../Logger')
const SocketAuthority = require('../SocketAuthority')
const Database = require('../Database')
const CacheManager = require('../managers/CacheManager')
const CoverManager = require('../managers/CoverManager')
const AuthorFinder = require('../finders/AuthorFinder')

const { reqSupportsWebp, isValidASIN } = require('../utils/index')

const naturalSort = createNewSortInstance({
  comparer: new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare
})
class AuthorController {
  constructor() {}
  // async getAuthor(req, res) {
  //   const { libraryId, name } = req.body.params
  //   const authorJson = await Database.getAuthorIdByName(libraryId, name)
  //   res.json(authorJson)
  // }
  async findOne(req, res) {
    const include = (req.query.include || '').split(',')

    const authorJson = req.author.toJSON()

    //TODO: Determine whether it is an original name or an alias
    if (req.author.is_alias_of) {
      const originalAuthor = await Database.authorModel.findByPk(req.author.is_alias_of, {
        attributes: ['id', 'name']
      })
      authorJson.originalAuthor = originalAuthor
    } else {
      const aliases = await Database.authorModel.findAll({
        where: {
          is_alias_of: req.author.id
        },
        attributes: ['id', 'name']
      })
      authorJson.aliases = aliases
    }

    // Used on author landing page to include library items and items grouped in series
    if (include.includes('items')) {
      authorJson.libraryItems = await Database.libraryItemModel.getForAuthor(req.author, req.user)

      if (include.includes('series')) {
        const seriesMap = {}
        // Group items into series
        authorJson.libraryItems.forEach((li) => {
          if (li.media.metadata.series) {
            li.media.metadata.series.forEach((series) => {
              const itemWithSeries = li.toJSONMinified()
              itemWithSeries.media.metadata.series = series

              if (seriesMap[series.id]) {
                seriesMap[series.id].items.push(itemWithSeries)
              } else {
                seriesMap[series.id] = {
                  id: series.id,
                  name: series.name,
                  items: [itemWithSeries]
                }
              }
            })
          }
        })
        // Sort series items
        for (const key in seriesMap) {
          seriesMap[key].items = naturalSort(seriesMap[key].items).asc((li) => li.media.metadata.series.sequence)
        }

        authorJson.series = Object.values(seriesMap)
      }

      // Minify library items
      authorJson.libraryItems = authorJson.libraryItems.map((li) => li.toJSONMinified())
    }

    return res.json(authorJson)
  }

  /**
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async update(req, res) {
    const payload = req.body
    let hasUpdated = false

    // author imagePath must be set through other endpoints as of v2.4.5
    if (payload.imagePath !== undefined) {
      Logger.warn(`[AuthorController] Updating local author imagePath is not supported`)
      delete payload.imagePath
    }

    const authorNameUpdate = payload.name !== undefined && payload.name !== req.author.name

    // Check if author name matches another author and merge the authors
    let existingAuthor = null
    if (authorNameUpdate) {
      const author = await Database.authorModel.findOne({
        where: {
          id: {
            [sequelize.Op.not]: req.author.id
          },
          name: payload.name
        }
      })
      existingAuthor = author?.getOldAuthor()
    }
    if (existingAuthor) {
      Logger.info(`[AuthorController] Merging author "${req.author.name}" with "${existingAuthor.name}"`)
      const bookAuthorsToCreate = []
      const allItemsWithAuthor = await Database.authorModel.getAllLibraryItemsForAuthor(req.author.id)

      const oldLibraryItems = []
      allItemsWithAuthor.forEach((libraryItem) => {
        // Replace old author with merging author for each book
        libraryItem.media.authors = libraryItem.media.authors.filter((au) => au.id !== req.author.id)
        libraryItem.media.authors.push({
          id: existingAuthor.id,
          name: existingAuthor.name
        })

        const oldLibraryItem = Database.libraryItemModel.getOldLibraryItem(libraryItem)
        oldLibraryItems.push(oldLibraryItem)

        bookAuthorsToCreate.push({
          bookId: libraryItem.media.id,
          authorId: existingAuthor.id
        })
      })
      if (oldLibraryItems.length) {
        await Database.removeBulkBookAuthors(req.author.id) // Remove all old BookAuthor
        await Database.createBulkBookAuthors(bookAuthorsToCreate) // Create all new BookAuthor
        for (const libraryItem of allItemsWithAuthor) {
          await libraryItem.saveMetadataFile()
        }
        SocketAuthority.emitter(
          'items_updated',
          oldLibraryItems.map((li) => li.toJSONExpanded())
        )
      }

      // Remove old author
      await Database.removeAuthor(req.author.id)
      SocketAuthority.emitter('author_removed', req.author.toJSON())
      // Update filter data
      Database.removeAuthorFromFilterData(req.author.libraryId, req.author.id)

      // Send updated num books for merged author
      const numBooks = await Database.bookAuthorModel.getCountForAuthor(existingAuthor.id)
      SocketAuthority.emitter('author_updated', existingAuthor.toJSONExpanded(numBooks))

      res.json({
        author: existingAuthor.toJSON(),
        merged: true
      })
    } else {
      // Regular author update
      if (req.author.update(payload)) {
        hasUpdated = true
      }

      if (hasUpdated) {
        req.author.updatedAt = Date.now()

        let numBooksForAuthor = 0
        if (authorNameUpdate) {
          const allItemsWithAuthor = await Database.authorModel.getAllLibraryItemsForAuthor(req.author.id)

          numBooksForAuthor = allItemsWithAuthor.length
          const oldLibraryItems = []
          // Update author name on all books
          for (const libraryItem of allItemsWithAuthor) {
            libraryItem.media.authors = libraryItem.media.authors.map((au) => {
              if (au.id === req.author.id) {
                au.name = req.author.name
              }
              return au
            })
            const oldLibraryItem = Database.libraryItemModel.getOldLibraryItem(libraryItem)
            oldLibraryItems.push(oldLibraryItem)

            await libraryItem.saveMetadataFile()
          }

          if (oldLibraryItems.length) {
            SocketAuthority.emitter(
              'items_updated',
              oldLibraryItems.map((li) => li.toJSONExpanded())
            )
          }
        } else {
          numBooksForAuthor = await Database.bookAuthorModel.getCountForAuthor(req.author.id)
        }

        await Database.updateAuthor(req.author)
        SocketAuthority.emitter('author_updated', req.author.toJSONExpanded(numBooksForAuthor))
      }

      res.json({
        author: req.author.toJSON(),
        updated: hasUpdated
      })
    }
  }

  /**
   * DELETE: /api/authors/:id
   * Remove author from all books and delete
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async delete(req, res) {
    Logger.info(`[AuthorController] Removing author "${req.author.name}"`)

    await Database.authorModel.removeById(req.author.id)

    if (req.author.imagePath) {
      await CacheManager.purgeImageCache(req.author.id) // Purge cache
    }

    SocketAuthority.emitter('author_removed', req.author.toJSON())

    // Update filter data
    Database.removeAuthorFromFilterData(req.author.libraryId, req.author.id)

    res.sendStatus(200)
  }

  /**
   * POST: /api/authors/:id/image
   * Upload author image from web URL
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async uploadImage(req, res) {
    if (!req.user.canUpload) {
      Logger.warn('User attempted to upload an image without permission', req.user)
      return res.sendStatus(403)
    }
    if (!req.body.url) {
      Logger.error(`[AuthorController] Invalid request payload. 'url' not in request body`)
      return res.status(400).send(`Invalid request payload. 'url' not in request body`)
    }
    if (!req.body.url.startsWith?.('http:') && !req.body.url.startsWith?.('https:')) {
      Logger.error(`[AuthorController] Invalid request payload. Invalid url "${req.body.url}"`)
      return res.status(400).send(`Invalid request payload. Invalid url "${req.body.url}"`)
    }

    Logger.debug(`[AuthorController] Requesting download author image from url "${req.body.url}"`)
    const result = await AuthorFinder.saveAuthorImage(req.author.id, req.body.url)

    if (result?.error) {
      return res.status(400).send(result.error)
    } else if (!result?.path) {
      return res.status(500).send('Unknown error occurred')
    }

    if (req.author.imagePath) {
      await CacheManager.purgeImageCache(req.author.id) // Purge cache
    }

    req.author.imagePath = result.path
    req.author.updatedAt = Date.now()
    await Database.authorModel.updateFromOld(req.author)

    const numBooks = await Database.bookAuthorModel.getCountForAuthor(req.author.id)
    SocketAuthority.emitter('author_updated', req.author.toJSONExpanded(numBooks))
    res.json({
      author: req.author.toJSON()
    })
  }

  /**
   * DELETE: /api/authors/:id/image
   * Remove author image & delete image file
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async deleteImage(req, res) {
    if (!req.author.imagePath) {
      Logger.error(`[AuthorController] Author "${req.author.imagePath}" has no imagePath set`)
      return res.status(400).send('Author has no image path set')
    }
    Logger.info(`[AuthorController] Removing image for author "${req.author.name}" at "${req.author.imagePath}"`)
    await CacheManager.purgeImageCache(req.author.id) // Purge cache
    await CoverManager.removeFile(req.author.imagePath)
    req.author.imagePath = null
    await Database.authorModel.updateFromOld(req.author)

    const numBooks = await Database.bookAuthorModel.getCountForAuthor(req.author.id)
    SocketAuthority.emitter('author_updated', req.author.toJSONExpanded(numBooks))
    res.json({
      author: req.author.toJSON()
    })
  }

  async match(req, res) {
    let authorData = null
    const region = req.body.region || 'us'
    if (req.body.asin && isValidASIN(req.body.asin.toUpperCase?.())) {
      authorData = await AuthorFinder.findAuthorByASIN(req.body.asin, region)
    } else {
      authorData = await AuthorFinder.findAuthorByName(req.body.q, region)
    }
    if (!authorData) {
      return res.status(404).send('Author not found')
    }
    Logger.debug(`[AuthorController] match author with "${req.body.q || req.body.asin}"`, authorData)

    let hasUpdates = false
    if (authorData.asin && req.author.asin !== authorData.asin) {
      req.author.asin = authorData.asin
      hasUpdates = true
    }

    // Only updates image if there was no image before or the author ASIN was updated
    if (authorData.image && (!req.author.imagePath || hasUpdates)) {
      await CacheManager.purgeImageCache(req.author.id)

      const imageData = await AuthorFinder.saveAuthorImage(req.author.id, authorData.image)
      if (imageData?.path) {
        req.author.imagePath = imageData.path
        hasUpdates = true
      }
    }

    if (authorData.description && req.author.description !== authorData.description) {
      req.author.description = authorData.description
      hasUpdates = true
    }

    if (hasUpdates) {
      req.author.updatedAt = Date.now()

      await Database.updateAuthor(req.author)

      const numBooks = await Database.bookAuthorModel.getCountForAuthor(req.author.id)
      SocketAuthority.emitter('author_updated', req.author.toJSONExpanded(numBooks))
    }

    res.json({
      updated: hasUpdates,
      author: req.author
    })
  }

  // GET api/authors/:id/image
  async getImage(req, res) {
    const {
      query: { width, height, format, raw },
      author
    } = req

    if (raw) {
      // any value
      if (!author.imagePath || !(await fs.pathExists(author.imagePath))) {
        return res.sendStatus(404)
      }

      return res.sendFile(author.imagePath)
    }

    const options = {
      format: format || (reqSupportsWebp(req) ? 'webp' : 'jpeg'),
      height: height ? parseInt(height) : null,
      width: width ? parseInt(width) : null
    }
    return CacheManager.handleAuthorCache(res, author, options)
  }

  /**
   * GET: /api/authors/:id/alias
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getAlias(req, res) {
    try {
      const authorId = req.params.id;

      const author = await Database.authorModel.findByPk(authorId);
      if (!author) {
        return res.status(404).send('Author not found');
      }

      const aliases = await Database.authorModel.findAll({
        where: {
          is_alias_of: authorId
        }
      });

      if (!aliases.length) {
        return res.status(200).json([]);
      }
      const aliasesArr = aliases.map(alias => ({
        id: alias.id,
        name: alias.name
      }));
      return res.status(200).json(aliasesArr);
    }
    catch (error) {
      Logger.error(`[AuthorController] Error getting alias: ${error.message}`);
      return res.status(500).send('Internal Server Error');
    }
  }

  /**
   * POST: /api/authors/:id/alias
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async addAlias(req, res) {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).send('Missing name');
      }

      const authorId = req.params.id;
      const author = await Database.authorModel.findByPk(authorId);
      if (!author) {
        return res.status(404).send('Author not found');
      }

      const newAlias = await Database.authorModel.create({
        name: name,
        libraryId: author.libraryId,
        is_alias_of: authorId
      });
      return res.status(201).json({
        message: 'Successfully created a new alias',
        alias: newAlias
      });
    }

    catch (error) {
      Logger.error(`[AuthorController] Error adding alias: ${error.message}`);
      return res.status(500).send('Internal Server Error');
    }
  }

  /**
   * DELETE: /api/authors/:id/alias
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async deleteAlias(req, res) {
    try {
      const { name } = req.body
      if (!name) {
        return res.status(400).send('Missing name');
      }

      const authorId = req.params.id;
      const author = await Database.authorModel.findByPk(authorId);
      if (!author) {
        return res.status(404).send('Author not found');
      }

      const alias = await Database.authorModel.findOne({
        where: {
          is_alias_of: authorId,
          name: name
        }
      });
      if (!alias) {
        return res.status(404).send('Alias not found');
      }
      await alias.update({ is_alias_of: null });
      return res.status(200).json({
        message: 'Successfully unlinked the alias'
      });
    }
    catch (error) {
      Logger.error(`[AuthorController] Error deleting alias: ${error.message}`);
      res.status(500).send('Internal Server Error');
    }
  }

  /**
   * GET: api/authors/:id/origin
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getOriginAuthor(req, res) {
    try {
      const authorId = req.params.id;
      const author = await Database.authorModel.findByPk(authorId);
      if (!author) {
        return res.status(404).send('Author not found');
      }

      const originId = author.is_alias_of
      if (originId == null) {
        return res.status(200).json([]);
      }

      const originAuhtor = await Database.authorModel.findByPk(originId);
      return res.status(200).json(originAuhtor);
    }
    catch (error) {
      Logger.error(`[AuthorController] Error deleting alias: ${error.message}`);
      res.status(500).send('Internal Server Error');
    }
  }

  async middleware(req, res, next) {
    const author = await Database.authorModel.getOldById(req.params.id)
    if (!author) return res.sendStatus(404)

    if (req.method == 'DELETE' && !req.user.canDelete) {
      Logger.warn(`[AuthorController] User attempted to delete without permission`, req.user)
      return res.sendStatus(403)
    } else if ((req.method == 'PATCH' || req.method == 'POST') && !req.user.canUpdate) {
      Logger.warn('[AuthorController] User attempted to update without permission', req.user)
      return res.sendStatus(403)
    }

    req.author = author
    next()
  }
}
module.exports = new AuthorController()

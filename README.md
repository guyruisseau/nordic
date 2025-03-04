# nordic

Another nodejs ORM for postgres. Serverless and lightweight approach.

[See changelog](https://github.com/jtouzy/nordic/releases)

## Installation

Install nordic package with npm.

```
npm install nordic --save
```

## Quick example

Below a quick example of connecting to your database and creating an article in few lines.

```javascript
const { Nordic } = require('nordic')
const credentials = require('myDatabaseSuperSecuredCredentials.json')

const nordic = new Nordic()
nordic.initialize(credentials)
const dao = await nordic.getDao('articles')
const article = await dao.create({ name: 'My super article' })
await nordic.shutdown()
```

## How to start

Simply get a new nordic instance.

```javascript
const { Nordic } = require('nordic')
const nordic = new Nordic()
```

Each Nordic instance you have will open a DB connection. In many cases, be sure to keep a Nordic singleton to avoid duplicate connections.

In a second time, configure the nordic instance with the `initialize` function.

*Note that this line will only configure the client access to your db. No connection is made at this point.*

```javascript
nordic.initialize({
  host: 'pg.mysuperhostname.myamazingcompany.mypowerfulamazonrdsserver.com',
  port: 5432,
  database: 'myawesomedatabase',
  user: 'myoverratedaccount',
  password: 'mysecuredp@ssword'
})
```

## Dao instances

### Get a dao instance

After base configuration, you have access to Dao objects, based on your schemas/tables.

*Note that the first dao you will get is gonna start the database connection, if you haven't [configured your database metadata manually](#database-metadata).*

```javascript
// with string configuration (public schema by default)
const articlesDao = await nordic.getDao('articles')

// with object configuration
const articlesDao = await nordic.getDao({ schema: 'secured', table: 'articles' })

// with custom class
const articlesDao = await nordic.getDao(ArticlesDao)
```

You can see below how to create [your own dao instances](#writing-your-own-dao-classes).

### Functions on dao instance

On your dao instances, you have multiples functions available (ES6 syntax in example below).

*Note that the first function you will call is gonna start the database connection, if you have [configured your database metadata manually](#database-metadata). If not, a connection is made on when the dao is created to fetch database metadata.*

```javascript
// 1 / Find all items in given table
// >> SELECT * FROM articles
const allItems = await articlesDao.findAll()

// 2 / Find items in given table (with properties)
// >> SELECT * FROM articles WHERE article_id = 1
const items = await articlesDao.find({ articleId: 1 })
// >> SELECT * FROM articles WHERE state IN ('CREATED', 'SOLD')
const items = await articlesDao.find({ state: ['CREATED', 'SOLD'] })

// 3.1 / Find one item in given table (with properties)
// >> SELECT * FROM articles WHERE article_id = 1 (only first row)
const item = await articlesDao.findOne({ articleId: 1 })
// 3.2 / Find one item in given table (with primary key implicit => only working with single primary key)
// >> SELECT * FROM articles WHERE article_id = 1 (only first row)
const item = await articlesDao.findOne(1)

// 4 / Aggregates
// >> SELECT COUNT(*) FROM articles
const count = await articlesDao.count()

// 5.1 / Create single item
// >> INSERT INTO articles (article_id, title) VALUES (1, 'My title')
const myItem = { articleId: 1, title: 'My title' }
await articlesDao.create(myItem)
// 5.2 / Create multiple items
// >> INSERT INTO articles (article_id, title) VALUES (1, 'My title'), (2, 'My second title')
const myItems = [ { articleId: 1, title: 'My title' }, { articleId: 2, title: 'My second title' } ]
await articlesDao.create(myItems)

// 6 / Update item
// >> UPDATE articles SET title = 'My new title' WHERE article_id = 1
const myItem = await articlesDao.findOne({ articleId: 1 })
myItem.title = 'My new title'
await articlesDao.update(myItem)
// >> UPDATE articles SET title = 'My new title' WHERE title = 'My old title'
await articlesDao.updateWithConditions(myItem, { title: 'My old title' })

// 7 / Delete item
// >> DELETE FROM articles WHERE article_id = 1
const myItem = await articlesDao.findOne({ articleId: 1 })
await articlesDao.delete(myItem)
// >> DELETE FROM articles WHERE title = 'My title'
await articlesDao.deleteWithConditions({ title: 'My title' })
```

### Transactional mode

As soon as an `INSERT`, `UPDATE`, or `DELETE` query is launched, a transaction is opened in the current database session. This transaction should be closed when you needed it, or at the connection shutdown. See the example below.

```javascript
// 1 - Delete called. A DB transaction will start.
await articlesDao.delete(oldItem)
// 2 - Create another one. This is executed in the same DB transaction.
await articlesDao.create(newItem)
// 3 - My service is done. End connection with shutdown, and force COMMIT transaction.
await nordic.shutdown(true)

// If you want to rollback the transaction on shutdown, just update the boolean value
await nordic.shutdown(false)

// You can manually commit/rollback if you want, and the next INSERT/UPDATE or DELETE query will start another transaction.
await nordic.commit()
await nordic.rollback()
```

## Customization

### Options configuration

In addition to the database connection informations, you can send an `options` property to customize nordic configuration.

```javascript
nordic.initialize({
  ...,
  options: {}
})
```

Below, you can see all the available configuration options.

#### Database objects vs. model objects keys

By default, no transformations are made to the objects fetched-from or stored-to database. You can configure two functions in the `options` property to transform keys during fetching or storing phases.

*Note: To reduce dependencies, no methods is provided by default. But you can find examples of using lodash `toCamelCase` and `toSnakeCase` functions in [unit tests](https://github.com/jtouzy/nordic/blob/master/test/data/DataProxy.test.js))*

```javascript
{
  transform: {
    // Your object keys will be translated with this function when fetching objects from database.
    databaseToObjectKeyTransform: () => {},
    // Your object keys will be translated with this function when sending objects to database.
    objectToDatabaseKeyTransform: () => {}
  }
}
```

#### Database metadata

To work well with primary keys or column definitions, nordic needs to know more about your database metadata. When you're getting your first Dao object, nordic will fetch this data from database.

Of course, for performance purpose (and for serverless/microservices target), it's recommanded to give those metadata to your nordic instance on the initialization phase like below.

First, use `nordic` command line tool to generate a static file for your database metadata.

```bash
./node_modules/.bin/nordic md
```

The command line tool will ask you some informations to access your database. You should give an account with access to the `information_schema` of your database instance. And when the connection is made, a `nordic-metadata.json` file will be generated. You can use it to give nordic all informations about your database metadata, like below (in the configuration options).

```javascript
{
  metadataPath: 'my/pathto/nordic/metadata.json'
}
```

An other way is available if you don't want to generate a metadata file (if you have those metadata in memory or anything else), you can directly send a metadata object in options, with the `metadata` key. This key is read in first priority, then the metadataPath key is read, and if nothing is configured, nordic will fetch metadata itself.

```javascript
{
  metadata: myDatabaseMetadataObject
}
```

### Writing your own dao classes

You can customize your dao instances with your additional functions by overriding Dao class. You must provide an entity() static function to allow nordic to retrieve the linked table.

```javascript
const { Dao } = require('nordic')

// Custom ProductDao (with string configuration, public schema by default)
class ProductDao extends Dao {
  static entity() {
    return 'products'
  }
  // Add your own functions here...
}

// Custom ProductDao (with object configuration)
class ProductDao extends Dao {
  static entity() {
    return { schema: 'secured', table: 'products' }
  }
  // Add your own functions here...
}
```

#### Properties propertiesMapping

With custom dao instances, you can customize actions when inserting or updating records. Just provide a properties mapping object to the super constructor, which reference properties to be customized when inserting/updating records.

In the example below, the `tokens` property will be replaced from `$1` to `to_tsvector($1)` on INSERT and UPDATE queries.

```javascript
class ProductDao extends Dao {
  static entity() {
    return 'products'
  }
  constructor(context) {
    super(context, {
      tokens(item, value) {
        return `to_tsvector(${value})`
      }
    })
  }
  // Add your own functions here...
}
```

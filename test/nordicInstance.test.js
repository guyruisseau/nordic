const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const Nordic = require('../src/Nordic')
const toCamelCase = require('lodash.camelcase')
const MockedDatabaseProxy = require('./_toolkit/MockedDatabaseProxy')

describe('nordic.$initializeDatabaseMetadata', () => {
  it('Should read metadata file and store it', () => {
    // Given
    const nordic = new Nordic()
    const metadataPath = path.resolve(__dirname, '_toolkit', 'test-metadata.json')
    const fileContent = fs.readFileSync(metadataPath, 'utf8')
    const jsonMetadata = JSON.parse(fileContent)
    // When
    nordic.$initializeDatabaseMetadata(null, metadataPath)
    // Expect
    expect(nordic.$databaseMetadata).to.be.eql(jsonMetadata)
  })
  it('Should read metadata object and store it', () => {
    // Given
    const nordic = new Nordic()
    const metadataPath = path.resolve(__dirname, '_toolkit', 'test-metadata.json')
    const fileContent = fs.readFileSync(metadataPath, 'utf8')
    const jsonMetadata = JSON.parse(fileContent)
    // When
    nordic.$initializeDatabaseMetadata(jsonMetadata)
    // Expect
    expect(nordic.$databaseMetadata).to.be.eql(jsonMetadata)
  })
})

describe('nordic.rawQuery', () => {
  it('Should call database proxy with given query, with no parameters', async () => {
    // Given
    const nordic = new Nordic()
    const mockedDatabaseProxy = new MockedDatabaseProxy()
    nordic.$initializeDataProxy()
    nordic.$databaseProxy = mockedDatabaseProxy
    // When
    await nordic.rawQuery('SELECT * FROM articles')
    // Expect
    expect(mockedDatabaseProxy.$queries).to.be.eql([{
      text: 'SELECT * FROM articles',
      values: []
    }])
  })
  it('Should call database proxy with given query, with one parameter', async () => {
    // Given
    const nordic = new Nordic()
    const mockedDatabaseProxy = new MockedDatabaseProxy()
    nordic.$initializeDataProxy()
    nordic.$databaseProxy = mockedDatabaseProxy
    // When
    await nordic.rawQuery('SELECT * FROM articles WHERE article_id = :id', {
      id: 1
    })
    // Expect
    expect(mockedDatabaseProxy.$queries).to.be.eql([{
      text: 'SELECT * FROM articles WHERE article_id = $1',
      values: [1]
    }])
  })
  it('Should call database proxy with given query, with multiple parameters', async () => {
    // Given
    const nordic = new Nordic()
    const mockedDatabaseProxy = new MockedDatabaseProxy()
    nordic.$initializeDataProxy()
    nordic.$databaseProxy = mockedDatabaseProxy
    // When
    await nordic.rawQuery('SELECT * FROM articles WHERE article_id = :id AND article_title = :title', {
      id: 1,
      title: 'Title of article'
    })
    // Expect
    expect(mockedDatabaseProxy.$queries).to.be.eql([{
      text: 'SELECT * FROM articles WHERE article_id = $1 AND article_title = $2',
      values: [1, 'Title of article']
    }])
  })
  /*it('Should call database proxy with given query, with multiple parameters with same names', async () => {
    // Given
    const mockedDatabaseProxy = new MockedDatabaseProxy()
    nordic.$initializeDataProxy()
    nordic.$databaseProxy = mockedDatabaseProxy
    // When
    await nordic.rawQuery('SELECT * FROM articles WHERE article_id = :id AND article_title = :id', {
      id: 1
    })
    // Expect
    expect(mockedDatabaseProxy.$queries).to.be.eql([{
      text: 'SELECT * FROM articles WHERE article_id = $1 AND article_title = $2',
      values: [1, 1]
    }])
  })*/
  it('Should call database proxy with given query, with array parameters', async () => {
    // Given
    const nordic = new Nordic()
    const mockedDatabaseProxy = new MockedDatabaseProxy()
    nordic.$initializeDataProxy()
    nordic.$databaseProxy = mockedDatabaseProxy
    // When
    await nordic.rawQuery('SELECT * FROM articles WHERE article_title IN (:title)', {
      title: ['Title of article', 'Title of article 2']
    })
    // Expect
    expect(mockedDatabaseProxy.$queries).to.be.eql([{
      text: 'SELECT * FROM articles WHERE article_title IN ($1, $2)',
      values: ['Title of article', 'Title of article 2']
    }])
  })
  it('Should call database proxy with given query, with multiple parameters with arrays', async () => {
    // Given
    const nordic = new Nordic()
    const mockedDatabaseProxy = new MockedDatabaseProxy()
    nordic.$initializeDataProxy()
    nordic.$databaseProxy = mockedDatabaseProxy
    // When
    await nordic.rawQuery('SELECT * FROM articles WHERE article_id = :id AND article_title IN (:title)', {
      id: 1,
      title: ['Title of article', 'Title of article 2']
    })
    // Expect
    expect(mockedDatabaseProxy.$queries).to.be.eql([{
      text: 'SELECT * FROM articles WHERE article_id = $1 AND article_title IN ($2, $3)',
      values: [1, 'Title of article', 'Title of article 2']
    }])
  })
  it('Should get database proxy data and mapping with transform options', async () => {
    // Given
    const nordic = new Nordic()
    const mockedDatabaseProxy = new MockedDatabaseProxy()
    nordic.$initializeDataProxy({
      databaseToObjectKeyTransform: toCamelCase
    })
    nordic.$databaseProxy = mockedDatabaseProxy
    // When
    const result = await nordic.rawQuery('SELECT * FROM articles WHERE article_id = :id AND article_title = :title', {
      id: 1
    })
    // Expect
    expect(result).to.be.eql([{ articleId: 1, title: 'article1' }])
  })
})

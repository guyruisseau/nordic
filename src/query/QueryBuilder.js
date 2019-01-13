class QueryBuilder {
  constructor(tableMetadata) {
    this.$tableMetadata = tableMetadata
  }
  getSelectQuery() {
    return {
      text: `SELECT * FROM ${this.getFromClauseWithTableMetadata()}`,
      values: []
    }
  }
  getSelectCountQuery() {
    return {
      text: `SELECT COUNT(*) as count FROM ${this.getFromClauseWithTableMetadata()}`,
      values: []
    }
  }
  getSelectQueryWithConditionsObject(conditionsObject) {
    const conditions = this.getConditionsWithObject(conditionsObject)
    const { text, values } = this.getSelectQuery()
    return {
      text: this.$appendWhereConditionIfNeeded(text, conditions, false),
      values: values.concat(conditions.values)
    }
  }
  getSelectCountQueryWithConditionsObject(conditionsObject) {
    const conditions = this.getConditionsWithObject(conditionsObject)
    const { text, values } = this.getSelectCountQuery()
    return {
      text: this.$appendWhereConditionIfNeeded(text, conditions, false),
      values: values.concat(conditions.values)
    }
  }
  getInsertQuery(createdValues) {
    const createdItems = Array.isArray(createdValues) ? createdValues : [createdValues]
    if (createdItems.length === 0) {
      throw new Error(`Trying to insert an empty array.`)
    }
    const allKeys = [... new Set(createdItems.reduce((accumulator, item) => {
      return accumulator.concat(Object.keys(item))
    }, []))]
    const valuesQuery = createdItems.map((newItem, index) => `(${allKeys.map((k, idx) => `$${ idx + 1 + (allKeys.length*index) }`).join(', ')})`).join(', ')
    return {
      text: `INSERT INTO ${this.getTableWithSchemaClause()} (${allKeys.join(', ')}) VALUES ${valuesQuery} RETURNING *`,
      values: createdItems.reduce((accumulator, newItem) => {
        return accumulator.concat(allKeys.map(k => typeof newItem[k] === 'undefined' ? null : newItem[k]))
      }, [])
    }
  }
  getUpdateQuery(updatedValues, conditionsObject) {
    const updateExpression = this.getConditionsWithObject(updatedValues, ',', false)
    const conditions = this.getConditionsWithObject(conditionsObject, 'AND', true, updateExpression.values.length)
    return {
      text: this.$appendWhereConditionIfNeeded(`UPDATE ${this.getTableWithSchemaClause()} SET ${updateExpression.text}`, conditions),
      values: updateExpression.values.concat(conditions.values)
    }
  }
  getDeleteQuery(conditionsObject) {
    const conditions = this.getConditionsWithObject(conditionsObject)
    return {
      text: this.$appendWhereConditionIfNeeded(`DELETE FROM ${this.getTableWithSchemaClause()}`, conditions),
      values: conditions.values
    }
  }
  getFromClauseWithTableMetadata() {
    return `${this.getTableWithSchemaClause()} AS ${this.$tableMetadata.name}`
  }
  getTableWithSchemaClause() {
    return `${this.$tableMetadata.schema}.${this.$tableMetadata.name}`
  }
  $appendWhereConditionIfNeeded(query, conditions, appendReturning = true) {
    const hasConditions = conditions && conditions.values && conditions.values.length > 0
    return `${query}${hasConditions ? ` WHERE ${conditions.text}` : ''}${appendReturning ? ' RETURNING *' : ''}`
  }
  getConditionsWithObject(conditionsObject, separator = 'AND', separatorSpaceBefore = true, indexOffset = 0) {
    const conditionKeys = Object.keys(conditionsObject || {})
    return {
      text: conditionKeys.reduce((accumulator, key) => {
        let nextIndex = accumulator.length + indexOffset + 1
        const value = conditionsObject[key]
        if (Array.isArray(value)) {
          return accumulator.concat([`${key} IN (${value.map(v => {
            nextIndex = nextIndex + 1
            return `$${nextIndex - 1}`
          }).join(', ')})`])
        } else {
          nextIndex = nextIndex + 1
          return accumulator.concat([`${key} = $${nextIndex - 1}`])
        }
      }, []).join(`${separatorSpaceBefore ? ' ' : ''}${separator} `),
      values: conditionKeys.reduce((accumulator, key) => {
        const value = conditionsObject[key]
        return accumulator.concat(Array.isArray(value) ? value : [value])
      }, [])
    }
  }
}

module.exports = QueryBuilder

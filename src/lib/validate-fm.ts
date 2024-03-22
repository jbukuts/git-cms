import matter from 'gray-matter'
import Ajv, { SchemaObject } from 'ajv'

const ajv = new Ajv({ allErrors: true })

export default function validateFrontmatter(rawContent: string, schema: SchemaObject | undefined) {
  const { data, content } = matter(rawContent)

  if (schema) {
    const validator = ajv.compile(schema)
    const valid = validator(data)
    if (!valid) {
      const errs = validator.errors!
      throw new Error(JSON.stringify(errs))
    }
  }

  return { data, content }
}

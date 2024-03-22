import 'dotenv/config'
import GitCMS from '../dist'
import { FromSchema } from 'json-schema-to-ts'
import { SchemaObject } from 'ajv'
import util from 'util'

const schema = {
  type: 'object',
  properties: {
    desc: {
      type: 'string'
    },
    date: {
      type: 'string'
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  },
  required: []
} as const satisfies SchemaObject

type FrontMatter = FromSchema<typeof schema>

const { API_KEY, OWNER, REPO, SRC_PATH } = process.env as Record<string, string>

const gitCms = new GitCMS<FrontMatter>({
  apiKey: API_KEY,
  owner: OWNER,
  repo: REPO,
  srcPath: SRC_PATH,
  schema
})

async function main(): Promise<void> {
  const filesTree = await gitCms.listItems({ recursive: true })

  // log data from call
  console.log(util.inspect(filesTree, { showHidden: false, depth: null, colors: true }))

  // get full md content for each item
  for await (const item of filesTree) {
    const { getContent } = item

    const c = await getContent()
    console.log(c)
  }

  return
}

await main()

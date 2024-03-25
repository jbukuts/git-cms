import 'dotenv/config'
import GitCMS from '../src'
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

if (!API_KEY || !OWNER || !REPO || !SRC_PATH)
  throw new Error('You need to configure a .env file to run this example!')

const gitCms = new GitCMS<FrontMatter>({
  apiKey: API_KEY,
  owner: OWNER,
  repo: REPO,
  srcPath: SRC_PATH,
  schema
})

async function main(): Promise<void> {
  const startTime = performance.now()

  const filesTree = await gitCms.listItems({
    recursive: true,
    includeContent: false,
    ascending: true,
    sortBy: 'updated'
  })

  const endTime = performance.now()

  // log data from call
  console.log(util.inspect(filesTree, { showHidden: false, depth: null, colors: true }))

  console.log(endTime - startTime)

  // get full raw content for each item
  // for await (const item of filesTree) {
  //   const { sha } = item
  //   const content = await gitCms.getRawContentBySha({ sha })
  //   console.log(content)
  // }

  return
}

await main()

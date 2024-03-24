/* eslint-disable @typescript-eslint/no-floating-promises */
import 'dotenv/config'
import assert from 'node:assert'
import { describe, it } from 'node:test'
import GitCMS from '../src'

const { API_KEY } = process.env as Record<string, string>

const gitCms = new GitCMS({
  apiKey: API_KEY,
  owner: 'jbukuts',
  repo: 'git-cms',
  srcPath: '/test_docs'
})

describe('GitCMS class', () => {
  it('should work with no options', async () => {
    const list = await gitCms.listItems()
    assert.strictEqual(list.length, 1)
  })

  it('should work recursively', async () => {
    const list = await gitCms.listItems({ recursive: true, includeContent: false })
    assert.strictEqual(list.length, 3)
    assert.strictEqual(list[0].content, undefined)
  })

  it('should only return files with specified extensions', async () => {
    const list = await gitCms.listItems({ recursive: true, extensions: ['.mdx'] })
    assert.strictEqual(list.length, 0)
  })

  it('should return content when specified', async () => {
    const list = await gitCms.listItems({ recursive: false, includeContent: true })
    assert.strictEqual(!!list[0].content, true)
  })
})

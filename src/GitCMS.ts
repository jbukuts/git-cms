import { Octokit } from 'octokit'
import { calcReadTime, splitPath } from './lib/helpers'
import type { SchemaObject } from 'ajv'
import parseLinkHeader from 'parse-link-header'
import { createToC, flattenTree, validateFrontmatter } from './lib'
import { GET_BLOB_REQ, GET_COMMITS_REQ, GET_TREE_REQ } from './constants'
import type {
  WithRequired,
  GitCMSSettings,
  ListFilesOptions,
  TreeItem,
  FileListOject
} from './types'

export default class GitCMS<FM = Record<string, unknown>> {
  /** @private */
  private settings: GitCMSSettings

  /** @private */
  private octoInstance: Octokit

  /** @private */
  private fmSchema: SchemaObject | undefined

  /** @constructor */
  public constructor(options: GitCMSSettings) {
    const { schema } = options

    if (schema) this.fmSchema = schema
    this.settings = options
    this.octoInstance = new Octokit({ auth: options.apiKey })
  }

  /**
   * Traverse repository content via GitHub Trees API
   * @private
   *
   * @param sha sha1 of folder to start travsersing from
   * @param extensions extensions to filter files by
   * @param structure recursive helper to store chil
   * @returns tree-like structure of folder contents with repository
   */
  private async manualTreeTraverse(
    sha: string,
    extensions: ListFilesOptions['extensions'] = ['.md'],
    recurse: boolean = false,
    structure: TreeItem = { sha: '', url: '', path: '', type: '', size: -1, mode: '' }
  ) {
    // get tree from sha
    const {
      data: { tree }
    } = await this.octoInstance.request(GET_TREE_REQ, {
      owner: this.settings.owner,
      repo: this.settings.repo,
      tree_sha: sha
    })

    // asign children as only files matching extension of folders
    structure.children = tree
      .filter((item) => {
        const { path, type } = item
        return (
          path !== undefined &&
          ((type === 'blob' && extensions?.some((ext) => path.endsWith(ext))) || type === 'tree')
        )
      })
      .reduce(
        (acc, curr) => {
          const key: string = curr.path!
          acc[key] = curr as TreeItem
          return acc
        },
        {} as Record<string, TreeItem>
      )

    // recursively travserse
    for await (const item of Object.values(structure.children)) {
      const { sha, type } = item
      if (type === 'tree' && sha && recurse)
        await this.manualTreeTraverse(sha, extensions, recurse, item)
    }

    return structure as WithRequired<TreeItem, 'path' | 'sha'>
  }

  /**
   * Obtains sha1 of given path via GitHub Trees API
   * @private
   *
   * @param path path to obtain sha1 for
   * @param startSha sha1 to start from
   * @returns {Promise<string>} sha of provided path within repository
   */
  private async getShaOfPath(path: string, startSha: string = 'main') {
    const pathArr = splitPath(path)
    let sha = startSha
    for await (const folder of pathArr) {
      const {
        data: { tree }
      } = await this.octoInstance.request(GET_TREE_REQ, {
        owner: this.settings.owner,
        repo: this.settings.repo,
        tree_sha: sha
      })

      const folderList = tree.filter((item) => item.type === 'tree')
      const itemIndex = folderList.findIndex((item) => item.path === folder)
      if (itemIndex === -1) throw new Error()
      sha = folderList[itemIndex].sha || ''
      if (sha === '') throw new Error()
    }

    return sha
  }

  /**
   * Get blob for given sha
   * @public
   *
   * @param sha sha1 of item to get blob for
   * @returns response data for blob item from API
   */
  public async getBlob(sha: string) {
    return this.octoInstance
      .request(GET_BLOB_REQ, {
        owner: this.settings.owner,
        repo: this.settings.repo,
        file_sha: sha
      })
      .then((res) => res.data)
  }

  /**
   * Get list of commits for item
   * @private
   *
   * @param path path to item
   * @param page pagination parameter
   * @returns list of commit data for item
   */
  private async getCommits(path: string, page: number = 1) {
    const { owner, repo } = this.settings
    return this.octoInstance.request(GET_COMMITS_REQ, {
      owner,
      repo,
      path,
      page,
      per_page: 100,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  }

  /**
   * Get creation and last updated dates from commits on a item in the repository
   * @private
   *
   * @param path path to item to obtain dates for
   * @returns tuple contains created and lasted updated date strings
   */
  private async getDates(relPath: string) {
    const fullPath = this.settings.srcPath + relPath
    const { data, headers } = await this.getCommits(fullPath)

    const updated = data[0]
    let created = data[data.length - 1]

    const links = parseLinkHeader(headers.link)
    if (links && links.last?.page) {
      const { data } = await this.getCommits(fullPath, parseInt(links.last.page))
      created = data.pop()!
    }

    return [created.commit.author?.date, updated.commit.author?.date]
  }

  /**
   * Create list of items from repository via GitHub Trees API
   * Will traverse directories recursively to get all items
   * @public
   *
   * @param options
   * @returns list of content with metadata attached
   */
  public async listItems(options: ListFilesOptions) {
    const { extensions = ['.md'], path = this.settings.srcPath, recursive = false } = options

    // get sha of starting folder
    const sha = await this.getShaOfPath(path)

    // get entire folder structure
    const tree = await this.manualTreeTraverse(sha, extensions, recursive)

    // flatten rec tree to list of files
    const flat = flattenTree(tree)

    // generate list
    const finalList: FileListOject<FM>[] = await Promise.all(
      flat.map(async (item) => {
        const { sha, path, size } = item
        const data = await this.getBlob(sha)
        const { content, encoding } = data

        const decode = (c: string, e: BufferEncoding) => Buffer.from(c, e).toString()
        const { data: fm, content: clipContent } = validateFrontmatter(
          decode(content, encoding as BufferEncoding),
          this.fmSchema
        )
        const [created, updated] = await this.getDates(path)

        const toc = createToC(clipContent)
        const reading_time = calcReadTime(size)

        const obj: FileListOject<FM> = {
          title: toc[0]?.title || null,
          reading_time,
          toc,
          created,
          updated,
          ...item,
          frontmatter: fm as FM,
          getContent: () =>
            this.getBlob(sha).then((r) => decode(r.content, r.encoding as BufferEncoding))
        }

        return obj
      })
    )

    // sort list by dates
    finalList.sort((a, b) => a.created?.localeCompare(b.created || '') || 0)
    return finalList
  }
}

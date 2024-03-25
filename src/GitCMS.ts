import { Octokit } from 'octokit'
import { calcReadTime, decode, splitPath } from './lib/helpers'
import type { SchemaObject } from 'ajv'
import parseLinkHeader from 'parse-link-header'
import { createToC, flattenTree, validateFrontmatter } from './lib'
import { GET_BLOB_REQ, GET_COMMITS_REQ, GET_TREE_REQ } from './constants'
import type {
  WithRequired,
  GitCMSSettings,
  ListFilesOptions,
  TreeItem,
  FileListOject,
  GetContentByShaOpt,
  GetContentByPathOpt,
  GetContentRes,
  GetContentOpts
} from './types'
import p from 'path'

/**
 * @class
 *
 */
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
   * Traverse repository content via GitHub Trees API.
   * Although GH does have built-in utility that does this via the API
   * that is limited by amount so it's been implemented manually just in case.
   * @private
   *
   * @param sha SHA of folder to start travsersing from.
   * @param extensions Extensions to filter files by.
   * @param structure Recursive helper to store children data.
   * @returns Tree-like structure of folder contents with repository
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
          ((type === 'blob' && extensions?.some((ext) => path.endsWith(ext))) ||
            (recurse && type === 'tree'))
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

    // recursively travserse (faster)
    await Promise.all(
      Object.values(structure.children).map(async (item) => {
        const { sha, type } = item
        if (type === 'tree' && sha && recurse)
          await this.manualTreeTraverse(sha, extensions, recurse, item)
      })
    )

    // recursively travserse
    // for await (const item of Object.values(structure.children)) {
    //   const { sha, type } = item
    //   if (type === 'tree' && sha && recurse)
    //     await this.manualTreeTraverse(sha, extensions, recurse, item)
    // }

    return structure as WithRequired<TreeItem, 'path' | 'sha'>
  }

  /**
   * Obtains sha1 of given path via GitHub Trees API.
   * Used by `listItems` to begin tree traversal.
   * @private
   *
   * @param path Path to obtain sha1 for.
   * @param startSha SHA to start from.
   * @returns {Promise<string>} SHA of provided path within repository.
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
   * Get blob for given sha.
   * @private
   *
   * @param sha SHA of item to get blob for.
   * @returns Response data for blob item from API.
   */
  private async getBlob(sha: string) {
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
  private async getDates(path: string) {
    const { data, headers } = await this.getCommits(path)

    const updated = data[0]
    let created = data[data.length - 1]

    const links = parseLinkHeader(headers.link)
    if (links && links.last?.page) {
      const { data } = await this.getCommits(path, parseInt(links.last.page))
      created = data.pop()!
    }

    return [created.commit.author?.date, updated.commit.author?.date]
  }

  /**
   * Arbitary method helper to get and process content.
   * Used in `getItemBySha`, `getItemByPath`, and `listItems`.
   * @private
   *
   * @param {GetContentOpts} options
   */
  private async getContent<F = FM>(options: GetContentOpts): Promise<FileListOject<F>> {
    const { getRaw, schema } = options

    const { content, encoding, sha, size, url, path } = await getRaw()

    const [created, updated] = await this.getDates(path)

    const decodedContent = decode(content!, encoding as BufferEncoding)
    const { data: fm, content: raw } = validateFrontmatter(decodedContent, schema)

    // generate additional metadata
    const toc = createToC(raw)
    const reading_time = calcReadTime(size)
    const { dir, name, ext } = p.posix.parse(path)

    const obj: FileListOject<F> = {
      title: toc[0]?.title || null,
      toc,
      sha,
      url,
      size,
      created,
      updated,
      full_path: path,
      reading_time,
      path: {
        dir,
        name,
        ext
      },
      frontmatter: fm as F,
      content: raw
    }

    return obj
  }

  /**
   * Get single content item from SHA value.
   * Intended to be used in conjunction with `listItems`.
   * @public
   *
   * @param {GetContentByShaOpt} options
   * @returns Content item
   */
  public async getItemBySha<F = FM>(options: GetContentByShaOpt): Promise<FileListOject<F>> {
    const { sha } = options

    const getRaw = async (): Promise<GetContentRes> => {
      const blobRes = await this.getBlob(sha)
      const { content, encoding, url, size } = blobRes

      return {
        content,
        encoding,
        url,
        size: size || 0,
        sha,
        // TODO: handle path properly. Is this method even needed?
        path: ''
      }
    }

    return this.getContent({ getRaw })
  }

  /**
   * Get single content item from path relative to project root.
   * Useful in one-off situations where the path of file is known and constant.
   * @public
   *
   * @param {GetContentByPathOpt} options
   * @returns Content item
   */
  public async getItemByPath<F = FM>(options: GetContentByPathOpt): Promise<FileListOject<F>> {
    const { path, schema = this.fmSchema } = options

    const getRaw = async (): Promise<GetContentRes> => {
      const res = await this.octoInstance.rest.repos.getContent({
        owner: this.settings.owner,
        repo: this.settings.repo,
        path: path,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })

      if (Array.isArray(res.data) || res.data.type !== 'file')
        throw new Error(`Expected single file response.`)

      const {
        data: { content, download_url, encoding, sha, size, url, path: p }
      } = res

      let rawContent = content
      if (!rawContent && download_url) rawContent = await fetch(download_url).then((r) => r.text())
      else if (!rawContent && !download_url)
        throw new Error('No raw content or download URL in response. Cannot proceed.')

      return {
        content: rawContent,
        path: p,
        sha,
        encoding,
        size,
        url
      }
    }

    return this.getContent<F>({ getRaw, schema })
  }

  /**
   * Get list of content items from repository via GitHub Trees API.
   * Will traverse directories recursively to get all items.
   * @public
   *
   * @param {ListFilesOptions} options Options for sourcing content from repository.
   * @returns List of content items with metadata attached.
   */
  public async listItems(options: ListFilesOptions | void) {
    const {
      extensions = ['.md'],
      path = this.settings.srcPath,
      recursive = false,
      includeContent = true,
      ascending = false,
      sortBy = 'created'
    } = options || {}

    // get sha of starting folder
    const sha = await this.getShaOfPath(path)

    // get entire folder structure
    const tree = await this.manualTreeTraverse(sha, extensions, recursive)

    // flatten rec tree to list of files
    const flat = flattenTree(tree, path)

    // generate list
    const finalList: FileListOject<FM>[] = await Promise.all(
      flat.map(async (item) => {
        const { sha, path, size } = item

        const getRaw = async (): Promise<GetContentRes> => {
          const data = await this.getBlob(sha)
          const { content, encoding, url } = data

          return {
            content,
            encoding,
            sha,
            size,
            url,
            path
          }
        }

        return this.getContent({ getRaw, schema: this.fmSchema }).then((o) => {
          if (!includeContent) delete o['content']
          return o
        })
      })
    )

    // sort list by dates
    finalList.sort((a, b) => {
      const aDate = a[sortBy] ? new Date(a[sortBy]!).getTime() : Number.NEGATIVE_INFINITY
      const bDate = b[sortBy] ? new Date(b[sortBy]!).getTime() : Number.NEGATIVE_INFINITY

      return (ascending ? 1 : -1) * (aDate - bDate)
    })
    return finalList
  }
}

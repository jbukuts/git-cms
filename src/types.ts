import type { Endpoints } from '@octokit/types'
import type { SchemaObject } from 'ajv'
import type { TocEntry } from './lib/toc'
import type { GET_TREE_REQ } from './constants'
import path from 'path'

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

/**
 * Options when instantiating instace of class
 */
export interface GitCMSSettings {
  /**
   * GitHub API Key
   *
   * @see https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
   */
  apiKey: string
  /**
   * Owner of the repo you're sourcing from
   *
   */
  owner: string
  /**
   * Repo name your're sourcing from
   */
  repo: string
  /**
   * Path to folder to start sourcing content
   */
  srcPath: string
  /**
   * Optional JSON schema to validate frontmatter data against
   */
  schema?: SchemaObject
}

export type GetTreeResData = Endpoints[typeof GET_TREE_REQ]['response']['data']

/**
 * Options when listing content from repository
 */
export interface ListFilesOptions {
  /**
   * file extensions to include in results
   */
  extensions?: ('.md' | '.mdx')[]
  /**
   * Starting path to begin traversal of file structure
   */
  path?: string
  /**
   * Whether to recursive through file structure
   */
  recursive?: boolean
  /**
   * Whether to append raw content to obj
   */
  includeContent?: boolean
  /**
   * Whether to sort dates by ascending or not
   */
  ascending?: boolean
  /**
   * Which dates to sort list by
   */
  sortBy?: 'updated' | 'created'
}

export interface TreeItem extends Required<GetTreeResData['tree'][0]> {
  children?: Record<string, TreeItem>
}

export type FileListItem = Required<Omit<GetTreeResData['tree'][0], 'mode' | 'type'>>

type PathObj = Pick<ReturnType<typeof path.posix.parse>, 'dir' | 'ext' | 'name'>

/**
 * Resulting item representing content from repository
 */
export interface FileListOject<FrontMatter> extends Omit<FileListItem, 'path'> {
  /**
   * Title of document. Sourced from first heading element.
   */
  title: string | null
  /**
   * Amount of time to read. Rough calculation based on file byte size.
   */
  reading_time: number
  /**
   * Creation date of item. Sourced from first commit.
   */
  created: string | undefined
  /**
   * Updated date of item. Sourced from last commit.
   */
  updated: string | undefined
  /**
   * Frontmatter data in document.
   */
  frontmatter: FrontMatter
  /**
   * Table of contents of document.
   */
  toc: TocEntry[]
  /**
   * Raw markup.
   */
  content?: string
  /**
   * Split items from path string.
   */
  path: PathObj
  /**
   * Full path string to item from root of repository.
   */
  full_path: string
}

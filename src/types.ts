import type { Endpoints } from '@octokit/types'
import type { SchemaObject } from 'ajv'
import type { TocEntry } from './lib/toc'
import type { GET_TREE_REQ } from './constants'

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

export type GetTreeData = Endpoints[typeof GET_TREE_REQ]['response']['data']

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
}

export interface TreeItem extends Required<GetTreeData['tree'][0]> {
  children?: Record<string, TreeItem>
}

export interface FileListItem extends Required<Omit<GetTreeData['tree'][0], 'mode' | 'type'>> {
  filename: string
}

/**
 * Resulting item representing content from repository
 */
export interface FileListOject<FrontMatter> extends FileListItem {
  title: string | null
  reading_time: number
  created: string | undefined
  updated: string | undefined
  frontmatter: FrontMatter
  toc: TocEntry[]
  getContent: () => Promise<string>
}

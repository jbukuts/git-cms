import type { FileListItem, TreeItem } from '../types'

/**
 * Helper to convert tree-like object structure into flat list of files
 * @param tree tree-like structure to flatten to array
 * @param pathPrefix recursive helper to prefix to prepend before each added item
 * @param list recursive helper containing list of all files
 * @returns {}
 */
export default function flattenTree(tree: TreeItem, pathPrefix = '', list: FileListItem[] = []) {
  for (const item of Object.values(tree.children || {})) {
    const { children, path, size, sha, url } = item
    const fullPath = `${pathPrefix}/${path}`

    if (children) {
      flattenTree(item, fullPath, list)
    } else {
      list.splice(0, 0, {
        path: fullPath,
        size,
        sha,
        url
      })
    }
  }

  return list
}

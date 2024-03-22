import type { List, Paragraph, Link } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toc as extractToc } from 'mdast-util-toc'
import { visit } from 'unist-util-visit'

export interface TocEntry {
  /**
   * Title of the entry
   */
  title: string
  /**
   * URL that can be used to reach
   * the content
   */
  url: string
  /**
   * Nested items
   */
  items: TocEntry[]
}

function parseParagraph(node: Paragraph): Omit<TocEntry, 'items'> {
  if (node.type !== 'paragraph') return { title: '', url: '' }
  const extraction = { title: '', url: '' }

  visit(node, 'link', (link: Link) => {
    extraction.url = link.url
  })

  visit(node, ['text', 'emphasis', 'strong', 'inlineCode'], (text) => {
    extraction.title += 'value' in text ? text.value : undefined
  })

  return extraction
}

function parse(tree?: List): TocEntry[] {
  if (!tree || tree?.type !== 'list') return []

  const layer = tree.children.flatMap((node) => node.children)
  const entries = layer.flatMap((node, index) => {
    if (node.type === 'paragraph')
      return [
        {
          ...parseParagraph(node),
          items: parse(layer[index + 1] as List) // Safe, next node can be either a list or a paragraph
        }
      ]

    return []
  })

  return entries
}

export default function createToC(raw: string) {
  const tree = fromMarkdown(raw)
  const tocTree = extractToc(tree)
  return parse(tocTree.map)
}

import matter from 'gray-matter'

/**
 * Heler to split path into array
 * @param path path string to split
 * @returns string array of input path
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((p) => !!p && p.length)
}

/**
 * Helper to calculate reading time from byte length
 * @param byteLength amount of bytes in a string
 * @returns time in minutes to read
 */
export function calcReadTime(byteLength: number) {
  const averageWordsPerMin = 200
  const averageWordLen = 5
  return Math.ceil(byteLength / averageWordLen / averageWordsPerMin)
}

export function extractFrontmatter(rawMarkdown: string) {
  const fm = matter(rawMarkdown)

  console.log(fm.data)
}

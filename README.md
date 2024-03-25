# git-cms

<p>
    <a href="https://www.npmjs.com/package/git-as-a-cms">
        <img src="https://img.shields.io/npm/v/git-as-a-cms">
    </a>
    <a href="https://github.com/jbukuts/git-cms/blob/main/LICENSE">
        <img src="https://img.shields.io/npm/l/git-as-a-cms">
    </a>
    <a href="https://www.npmjs.com/package/git-as-a-cms">
        <img src="https://img.shields.io/npm/unpacked-size/git-as-a-cms">
    </a>
</p>

Use a GitHub repository as a headless CMS to source Markdown content.

Built on top of the GitHub REST API using `octokit`.
 
## What is this?

This project makes it easier to source `md`/`mdx` from a GitHub repository so that it can be transformed and used with your page generation.

This allows you to separate your site code from your static content while still using GitHub all around.

Essentially it's just a fancy wrapper for various GitHub API calls to get you your content in a predictable and type-safe manner.

## When to use this?

Do you want to use GitHub as a CMS to store and source your content remotely from one place without the need to use or host another tool?

Then this may be of some use to you.

This tool is not designed to replace something like Sanity. It's more for people who like to have flexibility in how they edit their content and like to use GitHub normally.

## Installation

```bash
npm install git-as-a-cms
```

## API

Below are examples of using the exposed APIs.

### `new GitCMS()`

Creating an instance is easy:

```js
const gitCMS = new GitCMS({
  // your API key
  apiKey: 'your-key-here'
  // username of repo owner
  owner: 'octo',
  // name of the repo
  repo: 'whatever',
  // where to start sourcing content in the repo
  srcPath: '/path/to/souce/from'
})
```

If you want better type prediction you can also instantiate the class with a generic representing the shape of your frontmatter data. 

This can even be combined with the `schema` object you pass into the constructor via `from-schema-to-ts` like so:

```ts
import GitCMS from 'git-cms'
import { FromSchema } from 'json-schema-to-ts'

const schema = {
  type: 'object',
  properties: {
    desc: {
      type: 'string'
    }
  },
  required: ['desc']
} as const

type FrontMatter = FromSchema<typeof schema>

const gitCMS = new GitCMS<FrontMatter>({
  apiKey: 'your-key-here'
  owner: 'octo',
  repo: 'kit',
  srcPath: '/path/to/souce/from'
})
```

Now if any of the frontmatter data sourced from content doesn't conform to your schema's shape an error will be thrown when sourcing content. 

Also, when using the frontmatter data down the line you'll have access to information about its shape.

### `listItems()`

This function will return a list of all the content sourced from the repository. 

By default, the returned list will also include the raw markup content. If you'd like to disable this you can set `includeContent` to `false` and instead fetch content later via the `getItemBySha` or `getItemByPath` methods of the class with the returned values of each item.

A use case like that would look like so:

```ts
const contentList = await gitCMS.listItems({
  // content extensions. currently only supports md/mdx
  extensions: ['.md'],
  // optional path to source if different from constructor. overides `srcPath`
  path: '/test_docs'
  // whether to recurse through file structure
  recursive: true,
  // dont include content in each item
  includeContent: false
})

// get plaintext content for all items
for await (const item of contentList) {
  const { sha, frontmatter, full_path } = item 

  // will be typed by input schema generic
  console.log(frontmatter)

  // how to get content when not returned in list
  const rawContent: string = await gitCMS.getItemBySha({ sha })

  // or with other method
  const rawContentAgain: string = await gitCCMS.getItemByPath({ path: full_path })
  console.log(rawContent)
}
```

## Limitations

This tool is designed to be **READ ONLY** to your content with the default use of GitHub being the intended use case for updating content.

Depending on the amount of content you want to source you may run into [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28) set by the GitHub API.

Also, the content returned to you will be raw Markdown in its plaintext form. This keeps the response agnostic to your use case. For transforming content for rendering that will depend on your tech stack. 

Here's a list of common tools by framework:

- Next.js: `next-mdx-remote`
- SvelteKit: `mdsvex`

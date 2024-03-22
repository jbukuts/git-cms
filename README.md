# git-cms

Use a GitHub repository as a headless CMS to source Markdown content.

Built on top of the GitHub REST API using `octokit`.
 
## What is this?

This project makes it easier to source `md`/`mdx` from a GitHub repository so that it can be transformed and used with your page generation.

This allows you to seperate your site code from your static content while still using GitHub all around.

Essentially it's just a fancy wrapper for various GitHub API calls to get you your content in a predictable and type-safe manner.

## When to use this?

Do you want to use GitHub as a CMS to store and source your content remotely from one place without the need to use or host another tool?

Then this may be of some use for you.

This tool is not designed to replace something like Sanity. It's more for people who like to have flexibilty in how they edit their content and like to use GitHub normally.

## Limitations

This tool is designed to be **READ ONLY** to your content with the default use of GitHub being the intended use case for updating content.

Depending on the amount of content you want to source you may run into rate limits set by the GitHub API.

Also, the content returned to you will be raw Markdown in its plaintext form. This keeps the response agnostic to your use case. For transforming content for rendering that will depend on your tech stack. 

Here's a list of common tools by framework:

- Next.js: `next-mdx-remote`
- SvelteKit: `mdsvex`

## API

Below are examples of using the exposed APIs.

### `new GitCMS()` (contructor)

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

If you want better type prediction you can also instantiate the class with a JSON schema object to validate the shape of your frontmatter. Integrating `from-schema-to-ts` is also a good way to know the contents.

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
  repo: 'whatever',
  srcPath: '/path/to/souce/from'
})
```

Now if any of the frontmatter data sourced from content doesn't conform to your schema's shape an error will be thrown when sourcing content. 

Also, when using the frontmatter data down the line you'll have access to information about its shape.

### `listItems()`

This function will return a list of all the content sourced from the repository. To keep the reponse object small it will only contain metadata in each item. However, each item will have a function that when run grabs the plaintext content.

```ts
const contentList = await gitCMS.listItems({
  // content extensions. currently only supports md/mdx
  extensions: ['.md'],
  // optional path to source if different from constructor. overides `srcPath`
  path: 
  // whether to recurse through file structure
  recursive: true
})

// get plaintext content for all items
for await (const item of contentList) {
  // will be typed by input schema generic
  const { frontmatter } = item
  console.log(frontmatter)

  const rawContent = await item.getContent()
  console.log(rawContent)
}
```

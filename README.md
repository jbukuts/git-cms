# git-cms

Using a GitHub repository as a CMS.

Built on top of the `octokit`

## What is this?

This project makes it easier to source `md`/`mdx` from a GitHub repository so that it can be transformed and used with your page generation.

This allows you to seperate your front-end from your static content while still using GitHub all around.

Essentially it's just a fancy wrapper for various GitHub API calls to get you your content in a predictable manner.

## When to use this?

Do you want to use GitHub as a CMS to store and source your content remotely from one place without the need to use or host another tool?

Then this tool may be of some use for you.

This tool is not designed to replace something like Sanity. It's more for people who like to have flexibilty in how they edit their content and like to use GitHub normally.

## Limitations

This tool is designed to be **READ ONLY** to your content with the default use of GitHub being the intended use case for updating content.

Depending on the amount of content you want to source you may run into rate limits set by the GitHub API.

Currently, this project also only supports

This top-level package has been written in a agnostic manner so that it can be. Need to source multiple repos? Just spin off a new instance of the class to do so.

The content return it markdown in it's plaintext form. This keeps the response agnostic to your use case. There are extenions currently written to make ingesting this content .

But the top-level project is designed to be extendable and re-usable based the numerous use cases possible.

## API

Below are examples of using the APIs exposed by the class

### `new GitCMS()`

Creating an instance is easy:

```js
const gitCMS = new GitCMS({
  apiKey: 'your-key-here'
  owner: 'octo',
  repo: 'whatever',
  srcPath: '/path/to/souce/from'
})
```

If you want better type prediction you can also instantiate the class with a JSON schema object to validate the shape of your frontmatter. Integrating `from-schema-to-ts` is also a good way to know the contents

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

Now if any of the content sourced doesn't conform to your schema's shape an error will be thrown. Also when using the frontmatter data down the line you'll have access to information about its types via your IDE.

### `listFiles()`

### `options`

-

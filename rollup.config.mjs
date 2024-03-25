import { builtinModules } from 'node:module'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import { defineConfig } from 'rollup'
import { dts } from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'

import pkg from './package.json' assert { type: 'json' }

const external = [
  ...Object.keys(pkg.dependencies),
  ...builtinModules.flatMap((m) => [m, `node:${m}`]),
  'fsevents'
]

export default defineConfig([
  {
    input: ['src/index.ts'],
    output: {
      dir: 'dist',
      chunkFileNames: 'git-cms-[hash].js'
    },
    external,
    plugins: [json(), commonjs(), nodeResolve(), esbuild({ target: 'node18' })]
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      exports: 'named'
    },
    external,
    plugins: [
      dts({ respectExternal: false })
      // {
      //   name: 'flatten-declare-module',
      //   generateBundle: (_, bundle) => {
      //     for (const fileName in bundle) {
      //       const chunk = bundle[fileName]
      //       if (chunk.type === 'chunk') {
      //         chunk.code = chunk.code.replace(/\ndeclare module ['"].+['"] {([^]+?)\n}/g, '$1')
      //       }
      //     }
      //   }
      // }
    ]
  }
])

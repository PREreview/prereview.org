import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, pipe, Schema } from 'effect'
import { parse as parseHtml } from 'node-html-parser'
import path from 'path'
import { buttonKey, normalizeButtonUrl } from './cta-button.ts'

const GhostPost = Schema.Struct({
  slug: Schema.NonEmptyTrimmedString,
  html: Schema.String,
})

const GhostPosts = Schema.Array(Schema.partial(GhostPost))

interface ButtonRecord {
  text: string
  target: string
}

const inputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'all-posts.json')
const outputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-buttons.json')

void pipe(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const raw = yield* fs.readFileString(inputFile)
    const posts = yield* Schema.decodeUnknown(GhostPosts)(JSON.parse(raw))

    const valid = posts.filter((p): p is typeof GhostPost.Type => p.slug !== undefined && p.html !== undefined)

    const buttons = new Map<string, ButtonRecord>()

    for (const post of valid) {
      const root = parseHtml(post.html)
      for (const card of root.querySelectorAll('.kg-button-card')) {
        const link = card.querySelector('a')
        if (!link) continue

        const text = link.text.trim()
        if (text.length === 0) continue

        const href = link.getAttribute('href') ?? ''
        const target = normalizeButtonUrl(href)
        if (target === null) {
          console.log(`[warn] Skipping button with unusable url "${href}" (text: "${text}", post: ${post.slug})`)
          continue
        }
        if (target !== href) {
          console.log(`[info] Normalized button url "${href}" -> "${target}" (text: "${text}", post: ${post.slug})`)
        }

        const key = buttonKey(text, target)
        if (!buttons.has(key)) buttons.set(key, { text, target })
      }
    }

    const records = Array.from(buttons.values())

    yield* fs.writeFileString(outputFile, JSON.stringify(records, null, 2))
    console.log(`Wrote ${records.length} button records to ${outputFile}`)
  }),
  Effect.provide(NodeFileSystem.layer),
  Effect.runPromise,
)

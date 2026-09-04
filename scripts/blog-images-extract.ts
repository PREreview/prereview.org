import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, pipe, Schema } from 'effect'
import { parse as parseHtml } from 'node-html-parser'
import path from 'path'

const GhostPost = Schema.Struct({
  slug: Schema.NonEmptyTrimmedString,
  html: Schema.String,
})

const GhostPosts = Schema.Array(Schema.partial(GhostPost))

interface ImageRecord {
  slug: string
  src: string
  caption: string | null
}

const inputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'all-posts.json')
const outputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-images.json')

void pipe(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const raw = yield* fs.readFileString(inputFile)
    const posts = yield* Schema.decodeUnknown(GhostPosts)(JSON.parse(raw))

    const valid = posts.filter((p): p is typeof GhostPost.Type => p.slug !== undefined && p.html !== undefined)

    const images: Array<ImageRecord> = []

    for (const post of valid) {
      const root = parseHtml(post.html)
      for (const fig of root.querySelectorAll('figure')) {
        const imgs = fig.querySelectorAll('img')
        if (imgs.length !== 1) continue
        const [img] = imgs
        if (img === undefined) continue
        const src = img.getAttribute('src') ?? ''
        if (src.length === 0) continue
        const captionEl = fig.querySelector('figcaption')
        const caption = captionEl?.text.trim() ?? null
        images.push({ slug: post.slug, src, caption })
      }
    }

    yield* fs.writeFileString(outputFile, JSON.stringify(images, null, 2))
    console.log(`Wrote ${images.length} image records to ${outputFile}`)
  }),
  Effect.provide(NodeFileSystem.layer),
  Effect.runPromise,
)

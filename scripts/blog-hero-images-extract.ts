import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, pipe, Schema } from 'effect'
import path from 'path'

const GhostPost = Schema.Struct({
  title: Schema.NonEmptyTrimmedString,
  slug: Schema.NonEmptyTrimmedString,
  feature_image: Schema.NullOr(Schema.String),
  feature_image_alt: Schema.NullOr(Schema.String),
  feature_image_caption: Schema.NullOr(Schema.String),
})

const GhostPosts = Schema.Array(Schema.partial(GhostPost))

interface HeroImageRecord {
  slug: string
  title: string
  src: string
  alt: string | null
  captionHtml: string | null
}

const inputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'all-posts.json')
const outputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-hero-images.json')

void pipe(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const raw = yield* fs.readFileString(inputFile)
    const posts = yield* Schema.decodeUnknown(GhostPosts)(JSON.parse(raw))

    const valid = posts.filter(
      (p): p is typeof GhostPost.Type => p.title !== undefined && p.slug !== undefined && p.feature_image !== undefined,
    )

    const images: Array<HeroImageRecord> = []

    for (const post of valid) {
      if (post.feature_image === null) continue

      const altText = post.feature_image_alt?.trim() ?? ''
      images.push({
        slug: post.slug,
        title: post.title,
        src: post.feature_image,
        alt: altText.length > 0 ? altText : null,
        captionHtml: post.feature_image_caption ?? null,
      })
    }

    yield* fs.writeFileString(outputFile, JSON.stringify(images, null, 2))
    console.log(`Wrote ${images.length} hero image records to ${outputFile}`)
  }),
  Effect.provide(NodeFileSystem.layer),
  Effect.runPromise,
)

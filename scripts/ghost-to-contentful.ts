import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, Layer, Logger, pipe, Schema } from 'effect'
import path from 'path'

const GhostPost = Schema.Struct({
  title: Schema.NonEmptyTrimmedString,
  slug: Schema.NonEmptyTrimmedString,
})

const GhostPosts = Schema.Array(Schema.partial(GhostPost))

const ContentfulEntry = (post: typeof GhostPost.Type) => ({
  fields: {
    title: { 'en-US': post.title },
    slug: { 'en-US': post.slug },
  },
})

const outputDir = path.resolve(import.meta.dirname, '..', 'contentful-import')
const inputFile = path.resolve(import.meta.dirname, '..', 'all-posts.json')

void pipe(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    yield* fs.makeDirectory(outputDir, { recursive: true })

    const raw = yield* fs.readFileString(inputFile)
    const posts = yield* Schema.decodeUnknown(GhostPosts)(JSON.parse(raw))

    const valid = posts.filter((p): p is typeof GhostPost.Type => p.title !== undefined && p.slug !== undefined)

    yield* Effect.logInfo(`Writing ${valid.length} entries to ${outputDir}`)

    yield* Effect.forEach(
      valid,
      post =>
        fs.writeFileString(path.join(outputDir, `${post.slug}.json`), JSON.stringify(ContentfulEntry(post), null, 2)),
      { concurrency: 10 },
    )

    yield* Effect.logInfo('Done')
  }),
  Effect.provide(Layer.mergeAll(NodeFileSystem.layer, Logger.pretty)),
  Effect.runPromise,
)

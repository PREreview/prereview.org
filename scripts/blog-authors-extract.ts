import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, pipe, Schema } from 'effect'
import path from 'path'

const GhostAuthor = Schema.Struct({
  name: Schema.NonEmptyTrimmedString,
  slug: Schema.NonEmptyTrimmedString,
  profile_image: Schema.NullOr(Schema.String),
})

const GhostPost = Schema.Struct({
  slug: Schema.NonEmptyTrimmedString,
  authors: Schema.Array(Schema.partial(GhostAuthor)),
})

const GhostPosts = Schema.Array(Schema.partial(GhostPost))

interface AuthorRecord {
  slug: string
  name: string
  profileImageSrc: string | null
}

function normalizeImageSrc(src: string): string {
  return src.startsWith('//') ? `https:${src}` : src
}

const inputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'all-posts.json')
const outputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-authors.json')

void pipe(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const raw = yield* fs.readFileString(inputFile)
    const posts = yield* Schema.decodeUnknown(GhostPosts)(JSON.parse(raw))

    const authors = new Map<string, AuthorRecord>()

    for (const post of posts) {
      if (post.authors === undefined) continue
      for (const author of post.authors) {
        if (author.slug === undefined || author.name === undefined) continue
        if (authors.has(author.slug)) continue

        const rawProfileImage = author.profile_image ?? null
        const profileImageSrc = rawProfileImage !== null ? normalizeImageSrc(rawProfileImage) : null
        if (rawProfileImage !== null && profileImageSrc !== rawProfileImage) {
          console.log(`[info] Normalized author profile image url "${rawProfileImage}" -> "${profileImageSrc}"`)
        }
        authors.set(author.slug, { slug: author.slug, name: author.name, profileImageSrc })
      }
    }

    const records = Array.from(authors.values())

    yield* fs.writeFileString(outputFile, JSON.stringify(records, null, 2))
    console.log(`Wrote ${records.length} author records to ${outputFile}`)
  }),
  Effect.provide(NodeFileSystem.layer),
  Effect.runPromise,
)

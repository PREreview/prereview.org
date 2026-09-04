/* eslint-disable no-comments/disallowComments */
import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, pipe, Schema } from 'effect'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import path from 'path'
import { basename } from 'path'

const ImageRecord = Schema.Struct({
  slug: Schema.String,
  src: Schema.NonEmptyTrimmedString,
  caption: Schema.NullOr(Schema.String),
})

const ImageRecords = Schema.Array(ImageRecord)

const imagesDir = path.resolve(import.meta.dirname, '..', 'contentful-import', 'images')
const inputFile = path.resolve(import.meta.dirname, '..', 'blog-post-images.json')

function localName(src: string): string {
  try {
    return basename(new URL(src).pathname)
  } catch {
    return src.replace(/[^a-z0-9.]/gi, '_')
  }
}

void pipe(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    yield* fs.makeDirectory(imagesDir, { recursive: true })

    const raw = yield* fs.readFileString(inputFile)
    const records = yield* Schema.decodeUnknown(ImageRecords)(JSON.parse(raw))

    const unique = [...new Map(records.map(r => [r.src, r])).values()]
    console.log(`Downloading ${unique.length} unique images (${records.length} total references)...`)

    let downloaded = 0
    let skipped = 0
    let failed = 0

    yield* Effect.forEach(
      unique,
      ({ src }) =>
        Effect.gen(function* () {
          const dest = path.join(imagesDir, localName(src))
          if (yield* fs.exists(dest)) {
            skipped++
            return
          }
          const res = yield* Effect.tryPromise(() => fetch(src))
          if (!res.ok) {
            console.error(`  FAIL ${res.status} ${src}`)
            failed++
            return
          }
          yield* Effect.tryPromise(() =>
            pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(dest)),
          )
          downloaded++
          if (downloaded % 50 === 0) console.log(`  ${downloaded}/${unique.length} downloaded...`)
        }).pipe(
          Effect.catchAll(err =>
            Effect.sync(() => {
              console.error(`  ERROR ${src}: ${String(err)}`)
              failed++
            }),
          ),
        ),
      { concurrency: 5 },
    )

    console.log(`Done. downloaded=${downloaded} skipped=${skipped} failed=${failed}`)
  }),
  Effect.provide(NodeFileSystem.layer),
  Effect.runPromise,
)

import { NodeFileSystem } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { Effect, FileSystem, Layer } from 'effect'

export const layer = Layer.unwrap(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const file = yield* fs.makeTempFileScoped()

    return LibsqlClient.layer({ url: `file:${file}` })
  }),
).pipe(Layer.provide(NodeFileSystem.layer))

import { PGlite } from '@electric-sql/pglite'
import { PgClient } from '@effect/sql-pg'
import { Effect, Layer, Semaphore } from 'effect'
import type { SqlClient } from 'effect/sql'
import { Duplex } from 'node:stream'

const SslRequestCode = 80877103
const CancelRequestCode = 80877102
const ProtocolVersion3 = 196608
const TerminateMessageType = 0x58

// Speaks the Postgres wire protocol to an in-memory PGlite instance, so tests use the same `PgClient` as production.
const pgliteStream = (db: PGlite): Duplex => {
  let buffer = Buffer.alloc(0)
  let queue = Promise.resolve()

  const duplex = new Duplex({
    read() {
      // Data is pushed as PGlite responds.
    },
    write(chunk: Buffer, _encoding, callback) {
      buffer = Buffer.concat([buffer, chunk])

      const messages: Array<Buffer> = []

      while (buffer.length >= 5) {
        const first = buffer.readInt32BE(0)
        const second = buffer.length >= 8 ? buffer.readInt32BE(4) : undefined

        if (first === 8 && second === SslRequestCode) {
          buffer = buffer.subarray(8)
          duplex.push(Buffer.from('N'))
          continue
        }

        if (first === 16 && second === CancelRequestCode) {
          buffer = buffer.subarray(16)
          continue
        }

        const length = second === ProtocolVersion3 ? first : 1 + buffer.readInt32BE(1)

        if (buffer.length < length) {
          break
        }

        // PGlite is shared between clients, so it must not see a Terminate message.
        if (buffer[0] !== TerminateMessageType) {
          messages.push(buffer.subarray(0, length))
        }

        buffer = buffer.subarray(length)
      }

      queue = messages.reduce(
        (previous, message) =>
          previous.then(() =>
            db.execProtocolRawStream(new Uint8Array(message), {
              onRawData: data => {
                duplex.push(Buffer.from(data))
              },
            }),
          ),
        queue,
      )

      queue.then(
        () => callback(),
        (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
      )
    },
    final(callback) {
      duplex.push(null)
      callback()
    },
  })

  return duplex
}

// Creating PGlite is slow, so each worker shares one instance, and each client resets it and has exclusive use.
let shared: Promise<PGlite> | undefined
const lock = Semaphore.makeUnsafe(1)

const reset = async (db: PGlite) => {
  await db.exec('ROLLBACK')
  await db.exec('DISCARD ALL')
  await db.exec('DROP SCHEMA public CASCADE')
  await db.exec('CREATE SCHEMA public')
}

export const layer: Layer.Layer<PgClient.PgClient | SqlClient.SqlClient> = PgClient.layerFrom(
  Effect.gen(function* () {
    yield* Semaphore.takeScoped(lock, 1)

    const db = yield* Effect.promise(async () => {
      shared ??= PGlite.create()
      const db = await shared
      await reset(db)

      return db
    })

    return yield* PgClient.makeClient({ stream: () => pgliteStream(db) })
  }),
).pipe(Layer.orDie)

import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite-pgvector'
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

const createPGlite = () => PGlite.create({ extensions: { vector } })

// Creating PGlite is slow, but cloning one is relatively quick.
let template: Promise<PGlite> | undefined

export const makePGlite = async (): Promise<PGlite> => {
  template ??= createPGlite()

  return (await template).clone() as Promise<PGlite>
}

export const layerFor = (db: PGlite): Layer.Layer<PgClient.PgClient | SqlClient.SqlClient> =>
  PgClient.layerFrom(
    Effect.gen(function* () {
      // A previous client could have left a transaction or prepared statements behind.
      yield* Effect.promise(async () => {
        await db.exec('ROLLBACK')
        await db.exec('DISCARD ALL')
      })

      return yield* PgClient.makeClient({ stream: () => pgliteStream(db), username: 'postgres' })
    }),
  ).pipe(Layer.orDie)

// Even cloning is too slow for property-based tests, so each worker shares one instance, and each client resets it and has exclusive use.
let shared: Promise<PGlite> | undefined
const lock = Semaphore.makeUnsafe(1)

export const layer: Layer.Layer<PgClient.PgClient | SqlClient.SqlClient> = Layer.unwrap(
  Effect.gen(function* () {
    yield* Semaphore.takeScoped(lock, 1)

    const db = yield* Effect.promise(async () => {
      shared ??= createPGlite()
      const db = await shared
      await db.exec('DROP SCHEMA public CASCADE')
      await db.exec('CREATE SCHEMA public')

      return db
    })

    return layerFor(db)
  }),
)

import { PgClient } from '@effect/sql-pg'
import { PgliteClient } from '@effect/sql-pglite'
import { Context, Effect, Function, Layer, ManagedRuntime, Semaphore } from 'effect'
import type { SqlClient } from 'effect/sql'
import { Duplex } from 'node:stream'
import { afterAll } from './vitest.ts'

type PGlite = PgliteClient.PgliteClient['pglite']

const SslRequestCode = 80877103
const CancelRequestCode = 80877102
const ProtocolVersion3 = 196608
const TerminateMessageType = 0x58

const pgliteStream = (db: PGlite): Duplex => {
  let buffer = Buffer.alloc(0)
  let queue = Promise.resolve()

  const duplex = new Duplex({
    read: Function.constVoid,
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

const pglite = ManagedRuntime.make(PgliteClient.layer())

afterAll(() => pglite.dispose())

const lock = Semaphore.makeUnsafe(1)

export const layer: Layer.Layer<PgClient.PgClient | SqlClient.SqlClient> = Layer.unwrap(
  Effect.gen(function* () {
    yield* Semaphore.takeScoped(lock, 1)

    const db = Context.get(yield* pglite.contextEffect, PgliteClient.PgliteClient).pglite

    yield* Effect.promise(async () => {
      await db.exec('ROLLBACK')
      await db.exec('DISCARD ALL')
      await db.exec('DROP SCHEMA public CASCADE')
      await db.exec('CREATE SCHEMA public')
    })

    return PgClient.layerFrom(PgClient.makeClient({ stream: () => pgliteStream(db), username: 'postgres' }))
  }),
).pipe(Layer.orDie)

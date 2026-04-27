import { type Brand, Context, Effect, Layer, pipe, Schema } from 'effect'
import type { IO } from 'fp-ts/lib/IO.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as uuid from 'uuid'
import type { NonEmptyString } from './NonEmptyString.ts'

const UuidBrand: unique symbol = Symbol.for('Pseudonym')

export type Uuid = NonEmptyString & Brand.Brand<typeof UuidBrand>

export class GenerateUuid extends Context.Tag('GenerateUuid')<
  GenerateUuid,
  {
    v4: () => Effect.Effect<Uuid>
    v5: (value: string, namespace: Uuid) => Effect.Effect<Uuid>
  }
>() {}

export const layer: Layer.Layer<GenerateUuid> = Layer.succeed(GenerateUuid, {
  v4: () => Effect.sync(() => Uuid(uuid.v4())),
  v5: (value, namespace) => Effect.sync(() => Uuid(uuid.v5(value, namespace))),
})

export const UuidSchema: Schema.Schema<Uuid, string> = pipe(Schema.UUID, Schema.brand(UuidBrand)) as never

export const Uuid: (value: string) => Uuid = Schema.decodeSync(UuidSchema)

export interface GenerateUuidEnv {
  generateUuid: IO<Uuid>
}

export const { v4, v5 } = Effect.serviceFunctions(GenerateUuid)

export const generateUuidIO = pipe(
  RIO.ask<GenerateUuidEnv>(),
  RIO.chainIOK(({ generateUuid }) => generateUuid),
)

export const UuidC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      if (s.toLowerCase() === s && uuid.validate(s)) {
        return D.success(s as Uuid)
      }

      return D.failure(s, 'UUID')
    }),
  ),
  { encode: uuid => uuid.toLowerCase() },
)

import { type Brand, Context, Effect, Layer, pipe, Schema } from 'effect'
import type { IO } from 'fp-ts/lib/IO.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as uuid from 'uuid'
import type { NonEmptyString } from './NonEmptyString.ts'

export type Uuid = NonEmptyString & Brand.Brand<'Uuid'>

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

export const UuidSchema: Schema.Schema<Uuid, string> = pipe(Schema.UUID, Schema.brand('Uuid')) as never

export const Uuid: (value: string) => Uuid = Schema.decodeSync(UuidSchema)

export interface GenerateUuidEnv {
  generateUuid: IO<Uuid>
}

export const v4 = (...args: Parameters<(typeof GenerateUuid.Service)['v4']>) =>
  Effect.flatMap(GenerateUuid, service => service.v4(...args))

export const v5 = (...args: Parameters<(typeof GenerateUuid.Service)['v5']>) =>
  Effect.flatMap(GenerateUuid, service => service.v5(...args))

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

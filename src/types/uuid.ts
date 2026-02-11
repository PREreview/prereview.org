import { Context, Effect, Layer, pipe, Schema } from 'effect'
import type { IO } from 'fp-ts/lib/IO.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { v4 as _v4, isUuid, type Uuid } from 'uuid-ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'

export { Uuid } from 'uuid-ts'

export class GenerateUuid extends Context.Tag('GenerateUuid')<
  GenerateUuid,
  {
    v4: () => Effect.Effect<Uuid>
  }
>() {}

export const layer: Layer.Layer<GenerateUuid> = Layer.succeed(GenerateUuid, {
  v4: () => FptsToEffect.io(_v4()),
})

export const UuidSchema: Schema.Schema<Uuid, string> = pipe(
  Schema.String,
  Schema.filter(isUuid, { message: () => 'not a UUID' }),
)

export interface GenerateUuidEnv {
  generateUuid: IO<Uuid>
}

export const { v4 } = Effect.serviceFunctions(GenerateUuid)

export const generateUuidIO = pipe(
  RIO.ask<GenerateUuidEnv>(),
  RIO.chainIOK(({ generateUuid }) => generateUuid),
)

export const UuidC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      if (s.toLowerCase() === s) {
        return D.fromRefinement(isUuid, 'UUID').decode(s)
      }

      return D.failure(s, 'UUID')
    }),
  ),
  { encode: uuid => uuid.toLowerCase() },
)

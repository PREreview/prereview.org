import type { IO } from 'fp-ts/lib/IO.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { type Uuid, isUuid } from 'uuid-ts'

export interface GenerateUuidEnv {
  generateUuid: IO<Uuid>
}

export const generateUuid = pipe(
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

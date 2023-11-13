import type { IO } from 'fp-ts/IO'
import * as RIO from 'fp-ts/ReaderIO'
import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
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

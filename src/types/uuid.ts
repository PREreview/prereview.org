import type { IO } from 'fp-ts/IO'
import * as RIO from 'fp-ts/ReaderIO'
import { pipe } from 'fp-ts/function'
import type { Uuid } from 'uuid-ts'

export interface GenerateUuidEnv {
  generateUuid: IO<Uuid>
}

export const generateUuid = pipe(
  RIO.ask<GenerateUuidEnv>(),
  RIO.chainIOK(({ generateUuid }) => generateUuid),
)

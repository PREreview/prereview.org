import type { Json } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'

export interface AddToSessionEnv {
  readonly addToSession: (key: string, value: Json) => TE.TaskEither<'unavailable', void>
}

export interface PopFromSessionEnv {
  readonly popFromSession: (key: string) => TE.TaskEither<'unavailable', Json>
}

export const addToSession = (key: string, value: Json): RTE.ReaderTaskEither<AddToSessionEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ addToSession }) => addToSession(key, value)))

export const popFromSession = (key: string): RTE.ReaderTaskEither<PopFromSessionEnv, 'unavailable', Json> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ popFromSession }) => popFromSession(key)))

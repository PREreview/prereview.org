import { flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { match } from 'ts-pattern'
import { type NonEmptyString, NonEmptyStringC } from '../types/NonEmptyString.ts'
import type { OrcidId } from '../types/OrcidId.ts'

export interface Location {
  readonly value: NonEmptyString
  readonly visibility: 'public' | 'restricted'
}

export interface GetLocationEnv {
  getLocation: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', Location>
}

export const LocationC = C.struct({
  value: NonEmptyStringC,
  visibility: C.literal('public', 'restricted'),
}) satisfies C.Codec<unknown, unknown, Location>

export const getLocation = (
  orcid: OrcidId,
): RTE.ReaderTaskEither<GetLocationEnv, 'not-found' | 'unavailable', Location> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getLocation }) => getLocation(orcid)))

export const maybeGetLocation = flow(
  getLocation,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

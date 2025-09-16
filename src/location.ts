import { flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { match } from 'ts-pattern'
import { type NonEmptyString, NonEmptyStringC } from './types/NonEmptyString.js'
import type { OrcidId } from './types/OrcidId.js'

export interface Location {
  readonly value: NonEmptyString
  readonly visibility: 'public' | 'restricted'
}

export interface GetLocationEnv {
  getLocation: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', Location>
}

export interface EditLocationEnv extends GetLocationEnv {
  deleteLocation: (orcid: OrcidId) => TE.TaskEither<'unavailable', void>
  saveLocation: (orcid: OrcidId, location: Location) => TE.TaskEither<'unavailable', void>
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

export const deleteLocation = (orcid: OrcidId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ deleteLocation }: EditLocationEnv) => deleteLocation(orcid)))

export const saveLocation = (
  orcid: OrcidId,
  location: Location,
): RTE.ReaderTaskEither<EditLocationEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveLocation }) => saveLocation(orcid, location)))

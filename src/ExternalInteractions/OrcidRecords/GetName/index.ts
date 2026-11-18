import { Data, Effect, flow } from 'effect'
import { Orcid } from '../../../ExternalApis/index.ts'
import { GetNameFromOrcidPersonalDetails } from './GetNameFromOrcidPersonalDetails.ts'

export class NameIsNotAvailable extends Data.TaggedError('NameIsNotAvailable')<{
  cause?: unknown
}> {}

export const GetName = flow(
  Orcid.getPersonalDetails,
  Effect.map(GetNameFromOrcidPersonalDetails),
  Effect.catchTag('PersonalDetailsAreInaccessible', () => Effect.succeedNone),
  Effect.mapError(error => new NameIsNotAvailable({ cause: error })),
  Effect.withSpan('OrcidRecords.getName'),
)

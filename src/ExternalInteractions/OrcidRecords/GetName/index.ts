import { Data, Effect, flow } from 'effect'
import { Orcid } from '../../../ExternalApis/index.ts'
import { GetNameFromOrcidPersonalDetails } from './GetNameFromOrcidPersonalDetails.ts'

export class NameIsNotAvailable extends Data.TaggedError('NameIsNotAvailable')<{
  cause?: unknown
}> {}

export const GetName = flow(
  Orcid.getPersonalDetails,
  Effect.andThen(GetNameFromOrcidPersonalDetails),
  Effect.mapError(error => new NameIsNotAvailable({ cause: error })),
)

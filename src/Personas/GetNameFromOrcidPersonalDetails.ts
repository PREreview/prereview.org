import { Match, pipe } from 'effect'
import type { Orcid } from '../ExternalApis/index.js'
import { NonEmptyString } from '../types/index.js'

export const GetNameFromOrcidPersonalDetails = pipe(
  Match.type<Orcid.PersonalDetails>(),
  Match.withReturnType<NonEmptyString.NonEmptyString>(),
  Match.when(
    { name: { creditName: { value: Match.string } } },
    personalDetails => personalDetails.name.creditName.value,
  ),
  Match.when({ name: { givenNames: { value: Match.string }, familyName: { value: Match.string } } }, personalDetails =>
    NonEmptyString.NonEmptyString(`${personalDetails.name.givenNames.value} ${personalDetails.name.familyName.value}`),
  ),
  Match.when(
    { name: { givenNames: { value: Match.string } } },
    personalDetails => personalDetails.name.givenNames.value,
  ),
  Match.option,
)

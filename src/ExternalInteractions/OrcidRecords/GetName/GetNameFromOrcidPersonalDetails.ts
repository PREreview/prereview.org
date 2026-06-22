import { Match, pipe } from 'effect'
import type { Orcid } from '../../../ExternalApis/index.ts'
import { Name } from '../../../types/index.ts'

export const GetNameFromOrcidPersonalDetails = pipe(
  Match.type<Orcid.PersonalDetails>(),
  Match.withReturnType<Name.Name>(),
  Match.when(
    { name: { creditName: { value: Match.string } } },
    personalDetails => personalDetails.name.creditName.value,
  ),
  Match.when({ name: { givenNames: { value: Match.string }, familyName: { value: Match.string } } }, personalDetails =>
    Name.Name(`${personalDetails.name.givenNames.value} ${personalDetails.name.familyName.value}`),
  ),
  Match.when(
    { name: { givenNames: { value: Match.string } } },
    personalDetails => personalDetails.name.givenNames.value,
  ),
  Match.option,
)

import { Array, Option } from 'effect'
import type { OrcidId } from '../types/OrcidId.ts'
import type { ClubDetails, ClubName } from './Clubs.ts'

export type Input = OrcidId

export type Result = ReadonlyArray<ClubName>

export const GetClubsThatAPrereviewerLeads =
  (clubs: Array.NonEmptyReadonlyArray<ClubDetails>) =>
  (input: Input): Result =>
    Array.filterMap(clubs, club =>
      Array.contains(club.leads, input)
        ? Option.some({ id: club.id, language: club.name.language, name: club.name.text, slug: club.slug })
        : Option.none(),
    )

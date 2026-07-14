import { Array } from 'effect'
import type { OrcidId } from '../types/OrcidId.ts'
import type { ClubDetails } from './Clubs.ts'

export type Input = OrcidId

export type Result = boolean

export const IsPrereviewerAClubLead =
  (clubs: Array.NonEmptyReadonlyArray<ClubDetails>) =>
  (input: Input): Result =>
    Array.some(clubs, club => Array.contains(club.leads, input))

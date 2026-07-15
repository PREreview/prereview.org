import { Array, Either, Equal, Option } from 'effect'
import type { Slug } from '../types/Slug.ts'
import type { ClubDetails } from './Clubs.ts'
import { ClubNotFound } from './Errors.ts'

export type Input = Slug

export type Result = Either.Either<ClubDetails, ClubNotFound>

export const GetClubBySlug =
  (clubs: Array.NonEmptyReadonlyArray<ClubDetails>) =>
  (input: Input): Result =>
    Either.fromOption(
      Array.findFirst(clubs, club => {
        if (!Equal.equals(club.slug, input) && !Array.contains(club.formerSlugs ?? [], input)) {
          return Option.none()
        }

        return Option.some(club)
      }),
      () => new ClubNotFound(),
    )

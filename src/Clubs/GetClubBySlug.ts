import { Array, Either, Equal, Option } from 'effect'
import type { Slug } from '../types/Slug.ts'
import type { ClubDetails, ClubName } from './Clubs.ts'
import { ClubNotFound } from './Errors.ts'

export type Input = Slug

export type Result = Either.Either<ClubName, ClubNotFound>

export const GetClubBySlug =
  (clubs: Array.NonEmptyReadonlyArray<ClubDetails>) =>
  (input: Input): Result =>
    Either.fromOption(
      Array.findFirst(clubs, club => {
        if (!Equal.equals(club.slug, input)) {
          return Option.none()
        }

        return Option.some({ id: club.id, language: club.name.language, name: club.name.text })
      }),
      () => new ClubNotFound(),
    )

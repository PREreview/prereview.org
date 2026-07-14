import { Array, Either, Equal, Option } from 'effect'
import type { Name } from '../types/Name.ts'
import type { ClubDetails, ClubName } from './Clubs.ts'
import { ClubNotFound } from './Errors.ts'

export type Input = Name

export type Result = Either.Either<ClubName, ClubNotFound>

export const GetClubByName =
  (clubs: Array.NonEmptyReadonlyArray<ClubDetails>) =>
  (input: Input): Result =>
    Either.fromOption(
      Array.findFirst(clubs, club => {
        if (!Equal.equals(club.name.text, input) && !Array.contains(club.formerNames ?? [], input)) {
          return Option.none()
        }

        return Option.some({ id: club.id, language: club.name.language, name: club.name.text, slug: club.slug })
      }),
      () => new ClubNotFound(),
    )

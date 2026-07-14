import type { Array, Either } from 'effect'
import type { Name } from '../types/Name.ts'
import type { ClubDetails, ClubName } from './Clubs.ts'
import type { ClubNotFound } from './Errors.ts'

export type Input = Name

export type Result = Either.Either<ClubName, ClubNotFound>

export declare const GetClubByName: (clubs: Array.NonEmptyReadonlyArray<ClubDetails>) => (input: Input) => Result

import type { Either } from 'effect'
import type * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { ContactEmailAddress } from './ContactEmailAddress.ts'
import type { ContactEmailAddressIsNotFound } from './Errors.ts'

export type Input = OrcidId

export type Result = Either.Either<ContactEmailAddress, Error>

export type Error = ContactEmailAddressIsNotFound

export declare const GetContactEmailAddressUsingEvents: Queries.OnDemandQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>

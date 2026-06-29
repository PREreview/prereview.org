import type * as Commands from '../Commands.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type { ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'

export interface Input {
  readonly contactAddressId: Uuid
  readonly emailAddress: EmailAddress
  readonly orcidId: OrcidId
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified

type State = unknown

export declare const RecordContactAddress: Commands.Command<[Input], State, Error>

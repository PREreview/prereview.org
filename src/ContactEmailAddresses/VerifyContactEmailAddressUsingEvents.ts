import type * as Commands from '../Commands.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type {
  ContactEmailAddressHasAlreadyBeenVerified,
  ContactEmailAddressIsNotFound,
  VerificationTokenInvalid,
} from './Errors.ts'

export interface Input {
  orcid: OrcidId
  verificationToken: Uuid
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified | VerificationTokenInvalid | ContactEmailAddressIsNotFound

type State = unknown

export declare const VerifyContactEmailAddressUsingEvents: Commands.Command<
  'ContactAddressImported' | 'ContactAddressVerified',
  [Input],
  State,
  Error
>

import { Data } from 'effect'
import type * as Commands from '../Commands.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly contactAddressId: Uuid
  readonly emailAddress: EmailAddress
  readonly orcidId: OrcidId
  readonly verificationStatus: { status: 'unverified'; token: Uuid } | { status: 'verified' }
}

export class ContactAddressIdHasAlreadyBeenUsed extends Data.TaggedError('ContactAddressIdHasAlreadyBeenUsed') {}

export class DetailsDoNotMatchExistingImport extends Data.TaggedError('DetailsDoNotMatchExistingImport') {}

export type Error = ContactAddressIdHasAlreadyBeenUsed | DetailsDoNotMatchExistingImport

export type State = unknown

export declare const ImportContactAddress: Commands.Command<
  'ContactAddressImported' | 'ContactAddressVerified',
  [Input],
  State,
  Error
>

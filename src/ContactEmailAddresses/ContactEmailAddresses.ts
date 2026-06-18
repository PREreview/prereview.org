import { Context, type Effect } from 'effect'
import type {
  ContactEmailAddress,
  ContactEmailAddressIsNotFound,
  ContactEmailAddressIsUnavailable,
} from '../contact-email-address.ts'
import type { OrcidId } from '../types/OrcidId.ts'

export class ContactEmailAddresses extends Context.Tag('ContactEmailAddresses')<
  ContactEmailAddresses,
  {
    getContactEmailAddress: (
      orcid: OrcidId,
    ) => Effect.Effect<ContactEmailAddress, ContactEmailAddressIsNotFound | ContactEmailAddressIsUnavailable>
  }
>() {}

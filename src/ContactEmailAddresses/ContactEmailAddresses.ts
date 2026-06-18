import { Context, Layer, type Effect } from 'effect'
import {
  ContactEmailAddressIsUnavailable,
  type ContactEmailAddress,
  type ContactEmailAddressIsNotFound,
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

export const layer = Layer.succeed(ContactEmailAddresses, {
  getContactEmailAddress: () => new ContactEmailAddressIsUnavailable({ cause: 'not implemented' }),
})

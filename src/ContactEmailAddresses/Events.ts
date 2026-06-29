import { Schema } from 'effect'
import { SensitiveData } from '../SensitiveData.ts'
import { EmailAddressSchema } from '../types/EmailAddress.ts'
import { OrcidIdSchema } from '../types/OrcidId.ts'
import { InstantSchema } from '../types/Temporal.ts'
import { UuidSchema } from '../types/Uuid.ts'

export class ContactAddressImported extends Schema.TaggedClass<ContactAddressImported>()('ContactAddressImported', {
  contactAddressId: UuidSchema,
  emailAddress: SensitiveData(EmailAddressSchema),
  orcidId: OrcidIdSchema,
  verificationStatus: Schema.Literal('verified', 'unverified'),
}) {}

export class ContactAddressVerified extends Schema.TaggedClass<ContactAddressVerified>()('ContactAddressVerified', {
  contactAddressId: UuidSchema,
  orcidId: Schema.optional(OrcidIdSchema),
  verifiedAt: InstantSchema,
}) {}

export class ContactAddressRecorded extends Schema.TaggedClass<ContactAddressRecorded>()('ContactAddressRecorded', {
  contactAddressId: UuidSchema,
  emailAddress: SensitiveData(EmailAddressSchema),
  orcidId: OrcidIdSchema,
}) {}

export class AuthorInviteEmailAddressChosenAsContactAddress extends Schema.TaggedClass<AuthorInviteEmailAddressChosenAsContactAddress>()(
  'AuthorInviteEmailAddressChosenAsContactAddress',
  {
    emailAddress: SensitiveData(EmailAddressSchema),
    inviteId: UuidSchema,
    orcidId: OrcidIdSchema,
    chosenAt: InstantSchema,
  },
) {}

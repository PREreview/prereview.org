import { Schema } from 'effect'
import { SensitiveData } from '../SensitiveData.ts'
import { EmailAddressSchema } from '../types/EmailAddress.ts'
import { OrcidIdSchema } from '../types/OrcidId.ts'
import { UuidSchema } from '../types/Uuid.ts'

export class ContactAddressImported extends Schema.TaggedClass<ContactAddressImported>()('ContactAddressImported', {
  contactAddressId: UuidSchema,
  emailAddress: SensitiveData(EmailAddressSchema),
  orcidId: OrcidIdSchema,
  verificationStatus: Schema.Union(
    Schema.Struct({ status: Schema.tag('unverified'), token: UuidSchema }),
    Schema.Struct({ status: Schema.tag('verified') }),
  ),
}) {}

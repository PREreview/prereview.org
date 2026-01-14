import { Option, Schema } from 'effect'
import type { CoarNotify } from '../../ExternalApis/index.ts'
import { EmailAddress, OrcidId, SciProfilesId } from '../../types/index.ts'

export const ActorToRequester = (actor: CoarNotify.RequestReview['actor']) => {
  if (actor.type !== 'Person') {
    return { name: actor.name }
  }

  const emailAddress = Schema.decodeUnknownOption(EmailAddress.EmailAddressFromUrlSchema)(actor.id.href)

  const orcidId = Schema.decodeUnknownOption(OrcidId.OrcidIdFromUrlSchema)(actor.id.href)

  const sciProfilesId = Schema.decodeUnknownOption(SciProfilesId.SciProfilesIdFromUrlSchema)(actor.id.href)

  return {
    name: actor.name,
    emailAddress: Option.getOrUndefined(emailAddress),
    orcidId: Option.getOrUndefined(orcidId),
    sciProfilesId: Option.getOrUndefined(sciProfilesId),
  }
}

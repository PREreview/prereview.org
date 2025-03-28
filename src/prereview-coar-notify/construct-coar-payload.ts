import { toUrl } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import type { ReviewRequestPreprintId } from '../review-request.js'
import { profileMatch } from '../routes.js'
import { ProfileId } from '../types/index.js'
import type { Uuid } from '../types/uuid.js'
import type { User } from '../user.js'
import type { CoarReviewActionOfferPayload } from './coar-review-action-offer-payload.js'

interface PayloadInputs {
  coarNotifyUrl: URL
  persona: 'public' | 'pseudonym'
  preprint: ReviewRequestPreprintId
  user: User
  uuid: Uuid
}

export const constructPayload = ({ uuid, coarNotifyUrl, preprint, persona, user }: PayloadInputs) =>
  ({
    id: uuid,
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify'],
    type: ['Offer', 'coar-notify:ReviewAction'],
    origin: {
      id: coarNotifyUrl.href,
      inbox: new URL('/inbox', coarNotifyUrl).href,
      type: 'Service',
    },
    target: {
      id: coarNotifyUrl.href,
      inbox: new URL('/inbox', coarNotifyUrl).href,
      type: 'Service',
    },
    object: {
      id: preprint.value,
      'ietf:cite-as': toUrl(preprint.value).href,
    },
    actor: {
      id: `https://prereview.org${format(profileMatch.formatter, {
        profile: match(persona)
          .returnType<ProfileId.ProfileId>()
          .with('public', () => ProfileId.forOrcid(user.orcid))
          .with('pseudonym', () => ProfileId.forPseudonym(user.pseudonym))
          .exhaustive(),
      })}`,
      type: 'Person',
      name: match(persona)
        .with('public', () => user.name)
        .with('pseudonym', () => user.pseudonym)
        .exhaustive(),
    },
  }) satisfies CoarReviewActionOfferPayload

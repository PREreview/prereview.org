import { toUrl } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as RIO from 'fp-ts/ReaderIO'
import { pipe } from 'fp-ts/function'
import type { ReviewRequestPreprintId } from '../review-request'
import { profileMatch } from '../routes'
import { type GenerateUuidEnv, generateUuid } from '../types/uuid'
import type { User } from '../user'
import type { CoarReviewActionOfferPayload } from './coar-review-action-offer-payload'

export const constructCoarPayload = ({
  coarNotifyUrl,
  preprint,
  user,
}: {
  coarNotifyUrl: string
  preprint: ReviewRequestPreprintId
  user: User
}): RIO.ReaderIO<GenerateUuidEnv, CoarReviewActionOfferPayload> =>
  pipe(
    generateUuid,
    RIO.map(uuid => ({
      id: uuid,
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify'],
      type: ['Offer', 'coar-notify:ReviewAction'],
      origin: {
        id: coarNotifyUrl,
        inbox: `${coarNotifyUrl}/inbox`,
        type: 'Service',
      },
      target: {
        id: coarNotifyUrl,
        inbox: `${coarNotifyUrl}/inbox`,
        type: 'Service',
      },
      object: {
        id: preprint.value,
        'ietf:cite-as': toUrl(preprint.value).href,
      },
      actor: {
        id: `https://prereview.org${format(profileMatch.formatter, { profile: { type: 'orcid', value: user.orcid } })}`,
        type: 'Person',
        name: user.name,
      },
    })),
  )

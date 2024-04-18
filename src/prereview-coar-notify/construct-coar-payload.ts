import { toUrl } from 'doi-ts'
import * as RIO from 'fp-ts/ReaderIO'
import { pipe } from 'fp-ts/function'
import type { BiorxivPreprintId, ScieloPreprintId } from '../types/preprint-id'
import { type GenerateUuidEnv, generateUuid } from '../types/uuid'
import type { CoarReviewActionOfferPayload } from './coar-review-action-offer-payload'

export const constructCoarPayload = ({
  coarNotifyUrl,
  preprint,
}: {
  coarNotifyUrl: string
  preprint: BiorxivPreprintId | ScieloPreprintId
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
        id: 'https://prereview.org',
        type: 'Person',
        name: 'A PREreviewer',
      },
    })),
  )

import * as RIO from 'fp-ts/ReaderIO'
import { pipe } from 'fp-ts/function'
import { type GenerateUuidEnv, generateUuid } from '../types/uuid'
import type { CoarReviewActionOfferPayload } from './coar-review-action-offer-payload'

export const constructCoarPayload = ({
  coarNotifyUrl,
}: {
  coarNotifyUrl: string
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
        id: '10.1101/2024.02.07.578830',
        'ietf:cite-as': 'https://doi.org/10.1101/2024.02.07.578830',
      },
      actor: {
        id: 'https://prereview.org',
        type: 'Person',
        name: 'A PREreviewer',
      },
    })),
  )

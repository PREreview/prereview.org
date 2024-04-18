import type { CoarReviewActionOfferPayload } from '../../src/prereview-coar-notify/coar-review-action-offer-payload'
import * as fc from '../fc'

export * from '../fc'

export const coarReviewActionOfferPayload = (): fc.Arbitrary<CoarReviewActionOfferPayload> =>
  fc.record({
    id: fc.string(),
    '@context': fc.constant(['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify']),
    type: fc.constant(['Offer', 'coar-notify:ReviewAction']),
    origin: fc.record({
      id: fc.string(),
      inbox: fc.string(),
      type: fc.constant('Service'),
    }),
    target: fc.record({
      id: fc.string(),
      inbox: fc.string(),
      type: fc.constant('Service'),
    }),
    object: fc.record({
      id: fc.string(),
      'ietf:cite-as': fc.string(),
    }),
    actor: fc.record({
      id: fc.constant('https://prereview.org'),
      type: fc.constant('Person'),
      name: fc.constant('A PREreviewer'),
    }),
  })

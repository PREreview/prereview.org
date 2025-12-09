import type { CoarReviewActionOfferPayload } from '../../src/prereview-coar-notify/CoarReviewActionOfferPayload.ts'
import * as fc from '../fc.ts'

export * from '../fc.ts'

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
      id: fc.string(),
      type: fc.constant('Person'),
      name: fc.string(),
    }),
  })

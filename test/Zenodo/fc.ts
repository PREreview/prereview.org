import type { DepositMetadata } from '../../src/Zenodo/Deposition.js'
import type { ZenodoApi } from '../../src/Zenodo/ZenodoApi.js'
import * as fc from '../fc.js'

export * from '../fc.js'

export const depositMetadata = (): fc.Arbitrary<DepositMetadata> =>
  fc.record({
    creators: fc.tuple(fc.record({ name: fc.string() })),
    description: fc.html(),
    title: fc.string(),
    communities: fc.constant([{ identifier: 'prereview-reviews' }]),
    relatedIdentifiers: fc.tuple(
      fc.record({
        identifier: fc.doi(),
        relation: fc.constant('reviews'),
        resourceType: fc.constant('dataset'),
        scheme: fc.constant('doi'),
      }),
    ),
    uploadType: fc.constant('publication'),
    publicationType: fc.constant('peerreview'),
  })

export const zenodoApi = (): fc.Arbitrary<typeof ZenodoApi.Service> =>
  fc.record({
    key: fc.redacted(fc.string()),
    origin: fc.origin(),
  })

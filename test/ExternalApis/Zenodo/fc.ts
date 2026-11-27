import type { Zenodo } from '../../../src/ExternalApis/index.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const file = (): fc.Arbitrary<Zenodo.File> =>
  fc.record({
    name: fc.string(),
    content: fc.string(),
  })

export const depositMetadata = (): fc.Arbitrary<Zenodo.DepositMetadata> =>
  fc.record({
    creators: fc.tuple(fc.record({ name: fc.string() })),
    description: fc.html(),
    title: fc.plainText(),
    communities: fc.constant([{ identifier: 'prereview-reviews' }]),
    license: fc.constantFrom('cc-by-4.0', 'cc-zero'),
    relatedIdentifiers: fc.tuple(
      fc.record({
        identifier: fc.doi(),
        relation: fc.constant('reviews'),
        resourceType: fc.constant('dataset'),
        scheme: fc.constant('doi'),
      }),
      fc.record({
        identifier: fc.url(),
        relation: fc.constant('isIdenticalTo'),
        resourceType: fc.constant('publication-peerreview'),
        scheme: fc.constant('url'),
      }),
    ),
    uploadType: fc.constant('publication'),
    publicationType: fc.constant('peerreview'),
  })

export const newDraft = (): fc.Arbitrary<Zenodo.NewDraft> =>
  fc.record({
    access: fc.record({
      record: fc.constantFrom('public', 'restricted'),
      files: fc.constantFrom('public', 'restricted'),
    }),
    files: fc.record({ enabled: fc.boolean() }),
    metadata: fc.record({
      resource_type: fc.record({ id: fc.string() }),
      title: fc.string(),
      description: fc.string(),
    }),
  })

export const unsubmittedDeposition = (): fc.Arbitrary<Zenodo.UnsubmittedDeposition> =>
  fc.record({
    id: fc.integer(),
    links: fc.record({
      bucket: fc.url(),
      publish: fc.url(),
    }),
    metadata: fc
      .tuple(
        depositMetadata(),
        fc.record({
          doi: fc.doi(),
        }),
      )
      .map(([metadata, prereserveDoi]) => ({ ...metadata, prereserveDoi })),
    state: fc.constant('unsubmitted'),
    submitted: fc.constant(false),
  })

export const zenodoApi = (): fc.Arbitrary<typeof Zenodo.ZenodoApi.Service> =>
  fc.record({
    key: fc.redacted(fc.string()),
    origin: fc.origin(),
  })

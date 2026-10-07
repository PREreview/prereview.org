import { describe, expect, it } from '@effect/vitest'
import { Array, Effect, Redacted } from 'effect'
import { Zenodo } from '../../../src/ExternalApis/index.ts'
import * as _ from '../../../src/ExternalInteractions/ZenodoRecords/ConstructUrlsToInvalidatePrereview.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { PublicUrl } from '../../../src/public-url.ts'
import { Doi } from '../../../src/types/index.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'

describe('constructUrlsToInvalidatePrereview', () => {
  it.effect('constructs valid urls', () =>
    Effect.gen(function* () {
      const prereviewId = 12345
      const preprintId = new BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
      const user = {
        orcidId: OrcidId('0000-0002-1825-0097'),
        pseudonym: Pseudonym('Orange Panda'),
      }

      const expectedUrls = [
        'http://zenodo.test/api/records/12345',
        'http://zenodo.test/api/communities/prereview-reviews/records?q=metadata.related_identifiers.resource_type.id%3A%22publication-preprint%22+AND+related.identifier%3A%2210.1101%2F12345%22&size=100&sort=publication-desc&resource_type=publication%3A%3Apublication-peerreview&access_status=open',
        'http://zenodo.test/api/communities/prereview-reviews/records?q=%28metadata.related_identifiers.resource_type.id%3A%22publication-preprint%22+OR+%28metadata.related_identifiers.resource_type.id%3A%22dataset%22+AND+metadata.related_identifiers.identifier%3A%2Fhttp%3A%5C%2F%5C%2Fexample.com%5C%2Freviews%5C%2F.%2B%2F%29%29+AND+%28metadata.creators.person_or_org.identifiers.identifier%3A0000-0002-1825-0097+metadata.creators.person_or_org.name%3A%22Orange+Panda%22%29&size=100&sort=publication-desc&resource_type=publication%3A%3Apublication-peerreview&access_status=open',
      ]

      const results = yield* _.constructUrlsToInvalidatePrereview({ prereviewId, preprintId, user })

      expect(Array.map(results, result => result.href).toSorted()).toStrictEqual(expectedUrls.toSorted())
    }).pipe(
      Effect.provideService(Zenodo.ZenodoApi, { key: Redacted.make('key'), origin: new URL('http://zenodo.test') }),
      Effect.provideService(PublicUrl, new URL('http://example.com')),
    ),
  )
})

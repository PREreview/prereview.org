import { describe, expect, it } from '@jest/globals'
import { Array, Effect } from 'effect'
import { Orcid } from 'orcid-id-ts'
import * as Doi from '../../src/types/Doi.js'
import type { BiorxivPreprintId } from '../../src/types/preprint-id.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import { ZenodoOrigin } from '../../src/Zenodo/CommunityRecords.js'
import * as _ from '../../src/Zenodo/ConstructUrlsToInvalidatePrereview.js'
import * as EffectTest from '../EffectTest.js'

describe('constructUrlsToInvalidatePrereview', () => {
  it.failing('constructs valid urls', () =>
    Effect.gen(function* () {
      const prereviewId = 12345
      const preprintId = { _tag: 'biorxiv', value: Doi.Doi('10.1101/12345') } satisfies BiorxivPreprintId
      const user = {
        name: 'Josiah Carberry',
        orcid: Orcid('0000-0002-1825-0097'),
        pseudonym: 'Orange Panda' as Pseudonym,
      }

      const expectedUrls = [
        'http://zenodo.test/api/records/12345',
        'http://zenodo.test/api/communities/prereview-reviews/records?q=related.identifier%3A%2210.1101%2F12345%22&size=100&sort=publication-desc&resource_type=publication%3A%3Apublication-peerreview&access_status=open',
        'http://zenodo.test/api/communities/prereview-reviews/records?q=metadata.creators.person_or_org.identifiers.identifier%3A0000-0002-1825-0097+metadata.creators.person_or_org.name%3A%22Orange+Panda%22&size=100&sort=publication-desc&resource_type=publication%3A%3Apublication-peerreview&access_status=open',
      ]

      const results = yield* _.constructUrlsToInvalidatePrereview({ prereviewId, preprintId, user })

      expect(Array.map(results, result => result.href)).toStrictEqual(expectedUrls)
    }).pipe(Effect.provideService(ZenodoOrigin, new URL('http://zenodo.test')), EffectTest.run),
  )
})

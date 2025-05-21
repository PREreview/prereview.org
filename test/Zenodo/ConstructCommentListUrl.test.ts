import { describe, expect, it } from '@jest/globals'
import { Effect } from 'effect'
import { ZenodoOrigin } from '../../src/Zenodo/CommunityRecords.js'
import * as _ from '../../src/Zenodo/ConstructCommentListUrl.js'
import { Doi } from '../../src/types/index.js'
import * as EffectTest from '../EffectTest.js'

describe('ConstructCommentListUrl', () => {
  it('constructs a valid url', () =>
    Effect.gen(function* () {
      const prereviewDoi = Doi.Doi('10.1101/12345')
      const expectedUrl =
        'http://zenodo.test/api/communities/prereview-reviews/records?q=related.identifier%3A%2210.1101%2F12345%22+AND+related.relation%3A%22references%22&size=100&sort=publication-desc&resource_type=publication%3A%3Apublication-other&access_status=open'
      const result = yield* _.constructCommentListUrl(prereviewDoi)

      expect(result.href).toStrictEqual(expectedUrl)
    }).pipe(Effect.provideService(ZenodoOrigin, new URL('http://zenodo.test')), EffectTest.run))
})

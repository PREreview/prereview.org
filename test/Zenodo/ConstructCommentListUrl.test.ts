import { describe, expect, it } from '@jest/globals'
import { Effect } from 'effect'
import { ZenodoOrigin } from '../../src/Zenodo/CommunityRecords.js'
import * as _ from '../../src/Zenodo/ConstructCommentListUrl.js'
import * as Doi from '../../src/types/Doi.js'
import * as EffectTest from '../EffectTest.js'

describe('ConstructCommentListUrl', () => {
  it.failing('constructs a valid url', () =>
    Effect.gen(function* () {
      const prereviewDoi = Doi.Doi('10.1101/12345')
      const expectedUrl =
        'http://zenodo.test/api/communities/prereview-reviews/records?q=related.identifier:"10.1101/12345"&size=100&sort=publication-desc&resource_type=publication::publication-other&access_status=open'
      const result = yield* _.constructCommentListUrl(prereviewDoi)

      expect(result).toBe(expectedUrl)
    }).pipe(Effect.provideService(ZenodoOrigin, new URL('http://zenodo.test')), EffectTest.run),
  )
})

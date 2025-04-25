import { describe, expect, it } from '@jest/globals'
import { Array, Effect } from 'effect'
import { ZenodoOrigin } from '../../src/Zenodo/CommunityRecords.js'
import * as _ from '../../src/Zenodo/ConstructUrlsToInvalidatePrereview.js'
import * as EffectTest from '../EffectTest.js'

describe('constructUrlsToInvalidatePrereview', () => {
  it('constructs valid urls', () =>
    Effect.gen(function* () {
      const prereviewId = 12345

      const expectedUrls = ['http://zenodo.test/api/records/12345']

      const results = yield* _.constructUrlsToInvalidatePrereview(prereviewId)

      expect(Array.map(results, result => result.href)).toStrictEqual(expectedUrls)
    }).pipe(Effect.provideService(ZenodoOrigin, new URL('http://zenodo.test')), EffectTest.run))
})

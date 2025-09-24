import { describe, expect, it } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import { Zenodo } from '../../src/ExternalApis/index.ts'
import * as _ from '../../src/Zenodo/ConstructCommentListUrl.ts'
import { Doi } from '../../src/types/index.ts'
import * as EffectTest from '../EffectTest.ts'

describe('ConstructCommentListUrl', () => {
  it('constructs a valid url', () =>
    Effect.gen(function* () {
      const prereviewDoi = Doi.Doi('10.1101/12345')
      const expectedUrl =
        'http://zenodo.test/api/communities/prereview-reviews/records?q=related.identifier%3A%2210.1101%2F12345%22+AND+related.relation%3A%22references%22&size=100&sort=publication-desc&resource_type=publication%3A%3Apublication-other&access_status=open'
      const result = yield* _.constructCommentListUrl(prereviewDoi)

      expect(result.href).toStrictEqual(expectedUrl)
    }).pipe(
      Effect.provideService(Zenodo.ZenodoApi, { key: Redacted.make('key'), origin: new URL('http://zenodo.test') }),
      EffectTest.run,
    ))
})

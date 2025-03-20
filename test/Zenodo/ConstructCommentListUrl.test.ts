import { describe, expect, it } from '@jest/globals'
import * as _ from '../../src/Zenodo/ConstructCommentListUrl.js'
import * as Doi from '../../src/types/Doi.js'

describe('ConstructCommentListUrl', () => {
  it.failing('constructs a valid url', () => {
    const prereviewDoi = Doi.Doi('10.1101/12345')
    const expectedUrl =
      'origin/api/communities/prereview-reviews/records?q=related.identifier:"10.1101/12345"&size=100&sort=publication-desc&resource_type=publication::publication-other&access_status=open'
    const result = _.constructCommentListUrl(prereviewDoi)

    expect(result).toBe(expectedUrl)
  })
})

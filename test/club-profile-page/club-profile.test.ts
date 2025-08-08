import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { encode } from 'html-entities'
import * as StatusCodes from '../../src/StatusCodes.js'
import { getClubName } from '../../src/club-details.js'
import * as _ from '../../src/club-profile-page/index.js'
import { clubProfileMatch } from '../../src/routes.js'
import * as fc from '../fc.js'

describe('clubProfile', () => {
  test.prop([
    fc.clubId(),
    fc.array(
      fc.record({
        id: fc.integer(),
        reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
        published: fc.plainDate(),
        fields: fc.array(fc.fieldId()),
        subfields: fc.array(fc.subfieldId()),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.supportedLocale(),
  ])('when the data can be loaded', async (clubId, prereviews, locale) => {
    const getPrereviews = jest.fn<_.GetPrereviewsEnv['getPrereviews']>(_ => TE.right(prereviews))

    const actual = await _.clubProfile(clubId, locale)({ getPrereviews })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(clubProfileMatch.formatter, { id: clubId }),
      status: StatusCodes.OK,
      title: expect.plainTextContaining(getClubName(clubId)),
      main: expect.htmlContaining(encode(getClubName(clubId))),
      skipToLabel: 'main',
      js: [],
    })
    expect(getPrereviews).toHaveBeenCalledWith(clubId)
  })

  test.prop([fc.clubId(), fc.supportedLocale()])('when the PREreviews are unavailable', async (clubId, locale) => {
    const actual = await _.clubProfile(clubId, locale)({ getPrereviews: () => TE.left('unavailable') })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})

import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { getClubName } from '../src/club-details'
import * as _ from '../src/club-profile'
import { clubProfileMatch } from '../src/routes'
import * as fc from './fc'

describe('clubProfile', () => {
  test.prop([
    fc.clubId(),
    fc.array(
      fc.record({
        id: fc.integer(),
        reviewers: fc.nonEmptyArray(fc.string()),
        published: fc.plainDate(),
        preprint: fc.preprintTitle(),
      }),
    ),
  ])('when the data can be loaded', async (clubId, prereviews) => {
    const getPrereviews = jest.fn<_.GetPrereviewsEnv['getPrereviews']>(_ => TE.right(prereviews))

    const actual = await _.clubProfile(clubId)({ getPrereviews })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(clubProfileMatch.formatter, { id: clubId }),
      status: Status.OK,
      title: expect.stringContaining(getClubName(clubId)),
      main: expect.stringContaining(getClubName(clubId)),
      skipToLabel: 'main',
      js: [],
    })
    expect(getPrereviews).toHaveBeenCalledWith(clubId)
  })

  test.prop([fc.clubId()])('when the PREreviews are unavailable', async clubId => {
    const actual = await _.clubProfile(clubId)({ getPrereviews: () => TE.left('unavailable') })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })
})

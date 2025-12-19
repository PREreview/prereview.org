import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as Prereviewers from '../../../src/Prereviewers/index.ts'
import * as _ from '../../../src/Prereviewers/Queries/GetSubscribedKeywords.ts'
import { OrcidId } from '../../../src/types/index.ts'
import type { KeywordId } from '../../../src/types/Keyword.ts'

const prereviewerId = OrcidId.OrcidId('0000-0002-1825-0097')
const otherPrereviewerId = OrcidId.OrcidId('0000-0003-4921-6155')
const keywordId = '74912011484ac651e90e' satisfies KeywordId
const otherKeywordId = 'd76c73de6055a36be3d5' satisfies KeywordId
const prereviewerSubscribedToAKeyword = new Prereviewers.PrereviewerSubscribedToAKeyword({
  prereviewerId,
  keywordId,
})
const prereviewerSubscribedToOtherKeyword = new Prereviewers.PrereviewerSubscribedToAKeyword({
  prereviewerId,
  keywordId: otherKeywordId,
})
const otherPrereviewerSubscribedToAKeyword = new Prereviewers.PrereviewerSubscribedToAKeyword({
  prereviewerId: otherPrereviewerId,
  keywordId,
})

test.each<[string, _.Input, ReadonlyArray<Prereviewers.PrereviewerEvent>, _.Result]>([
  ['no events', { prereviewerId }, [], []],
  ['no subscribed events', { prereviewerId }, [otherPrereviewerSubscribedToAKeyword], []],
  ['one subscribed', { prereviewerId }, [prereviewerSubscribedToAKeyword], [keywordId]],
  [
    'multiple subscribes',
    { prereviewerId },
    [prereviewerSubscribedToAKeyword, prereviewerSubscribedToOtherKeyword],
    [keywordId, otherKeywordId],
  ],
  [
    'duplicate subscribes',
    { prereviewerId },
    [prereviewerSubscribedToAKeyword, prereviewerSubscribedToAKeyword],
    [keywordId],
  ],
])('query (%s)', (_name, input, events, expected) => {
  const actual = _.query(events, input)

  expect(actual).toStrictEqual(expected)
})

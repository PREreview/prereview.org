import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Equal, Option, Tuple } from 'effect'
import * as _ from '../../../src/Prereviewers/Commands/SubscribeToAKeyword.ts'
import * as Prereviewers from '../../../src/Prereviewers/index.ts'
import { OrcidId } from '../../../src/types/index.ts'
import type { KeywordId } from '../../../src/types/Keyword.ts'
import * as fc from '../../fc.ts'

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

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    prereviewerId: fc.orcidId(),
    keywordId: fc.keywordId(),
  })

describe('foldState', () => {
  test.prop(
    [
      command().chain(command =>
        fc.tuple(
          fc.array(
            fc
              .prereviewerEvent()
              .filter(
                event =>
                  !Equal.equals(event.prereviewerId, command.prereviewerId) ||
                  !Equal.equals(event.keywordId, command.keywordId),
              ),
          ),
          fc.constant(command),
        ),
      ),
    ],
    {
      examples: [
        [[[], { prereviewerId, keywordId }]], // no events
        [[[prereviewerSubscribedToOtherKeyword], { prereviewerId, keywordId }]], // for other keyword
        [[[otherPrereviewerSubscribedToAKeyword], { prereviewerId, keywordId }]], // for other PREreviewer
      ],
    },
  )('not yet subscribed', ([events, prereviewerId]) => {
    const state = _.foldState(events, prereviewerId)

    expect(state).toStrictEqual(new _.NotSubscribed())
  })

  test.prop(
    [
      fc.prereviewerSubscribedToAKeyword().map(event =>
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        Tuple.make(Array.make(event as Prereviewers.PrereviewerEvent), {
          prereviewerId: event.prereviewerId,
          keywordId: event.keywordId,
        }),
      ),
    ],
    {
      examples: [
        [[[prereviewerSubscribedToAKeyword], { prereviewerId, keywordId }]], // was subscribed
        [[[prereviewerSubscribedToAKeyword, prereviewerSubscribedToOtherKeyword], { prereviewerId, keywordId }]], // other keywords
        [[[prereviewerSubscribedToAKeyword, otherPrereviewerSubscribedToAKeyword], { prereviewerId, keywordId }]], // other PREreviewers
      ],
    },
  )('already subscribed', ([events, command]) => {
    const state = _.foldState(events, command)

    expect(state).toStrictEqual(new _.HasBeenSubscribed())
  })
})

describe('decide', () => {
  test.prop([command()])('has not been subscribed', command => {
    const result = _.decide(new _.NotSubscribed(), command)

    expect(result).toStrictEqual(
      Option.some(
        new Prereviewers.PrereviewerSubscribedToAKeyword({
          prereviewerId: command.prereviewerId,
          keywordId: command.keywordId,
        }),
      ),
    )
  })

  test.prop([command()])('has already been subscribed', command => {
    const result = _.decide(new _.HasBeenSubscribed(), command)

    expect(result).toStrictEqual(Option.none())
  })
})

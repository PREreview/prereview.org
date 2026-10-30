import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '../../../vitest.ts'
import { Either, Option } from 'effect'
import { NonEmptyString } from '../../../../src/types/index.ts'
import * as _ from '../../../../src/WebApp/ReviewADatasetFlow/UseOfAiPage/UseOfAiForm.ts'

const details = NonEmptyString.NonEmptyString('Some details')

describe('fromBody', () => {
  it.each<[string, UrlParams.Input, _.UseOfAiForm]>([
    [
      'empty',
      {},
      new _.InvalidForm({ generativeAiIdeas: Either.left(new _.Missing()), generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'yes',
      { generativeAiIdeas: 'yes' },
      new _.CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'yes with details',
      { generativeAiIdeas: 'yes', generativeAiIdeasDetails: details },
      new _.CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.some(details) }),
    ],
    [
      'yes with blank details',
      { generativeAiIdeas: 'yes', generativeAiIdeasDetails: ' \n ' },
      new _.CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'no',
      { generativeAiIdeas: 'no' },
      new _.CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'no with details',
      { generativeAiIdeas: 'no', generativeAiIdeasDetails: details },
      new _.CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'invalid answer',
      { generativeAiIdeas: 'maybe' },
      new _.InvalidForm({ generativeAiIdeas: Either.left(new _.Missing()), generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'missing answer with details',
      { generativeAiIdeasDetails: details },
      new _.InvalidForm({
        generativeAiIdeas: Either.left(new _.Missing()),
        generativeAiIdeasDetails: Option.some(details),
      }),
    ],
  ])('%s', (_name, input, expected) => {
    const body = UrlParams.fromInput(input)

    const actual = _.fromBody(body)

    expect(actual).toStrictEqual(expected)
  })
})

describe('fromAnswer', () => {
  it.each<[string, Parameters<typeof _.fromAnswer>[0], _.UseOfAiForm]>([
    ['not answered', { _tag: 'NotAnswered' }, new _.EmptyForm()],
    [
      'AI was used',
      { _tag: 'AiWasUsed', generativeAiIdeasDetails: Option.none() },
      new _.CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'AI was used with details',
      { _tag: 'AiWasUsed', generativeAiIdeasDetails: Option.some(details) },
      new _.CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.some(details) }),
    ],
    [
      'AI was not used',
      { _tag: 'AiWasNotUsed' },
      new _.CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
    ],
  ])('%s', (_name, answer, expected) => {
    const actual = _.fromAnswer(answer)

    expect(actual).toStrictEqual(expected)
  })
})

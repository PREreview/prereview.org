import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Either, Option } from 'effect'
import { NonEmptyString } from '../../../../src/types/NonEmptyString.ts'
import * as _ from '../../../../src/WebApp/ReviewAPreprintFlow/UseOfAiPage/UseOfAiForm.ts'

const details = NonEmptyString('Some details')

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
  it.each<[string, Option.Option<{ answer: 'yes' | 'no'; detail: Option.Option<NonEmptyString> }>, _.UseOfAiForm]>([
    ['empty', Option.none(), new _.EmptyForm()],
    [
      'yes',
      Option.some({ answer: 'yes', detail: Option.none() }),
      new _.CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'yes with details',
      Option.some({ answer: 'yes', detail: Option.some(details) }),
      new _.CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.some(details) }),
    ],
    [
      'no',
      Option.some({ answer: 'no', detail: Option.none() }),
      new _.CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
    ],
    [
      'no with details',
      Option.some({ answer: 'no', detail: Option.some(details) }),
      new _.CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
    ],
  ])('%s', (_name, answer, expected) => {
    const actual = _.fromAnswer(answer)

    expect(actual).toStrictEqual(expected)
  })
})

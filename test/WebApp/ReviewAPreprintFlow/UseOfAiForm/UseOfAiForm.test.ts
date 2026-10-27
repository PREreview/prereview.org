import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Either, Option } from 'effect'
import * as _ from '../../../../src/WebApp/ReviewAPreprintFlow/UseOfAiPage/UseOfAiForm.ts'

describe('fromBody', () => {
  it.each<[string, UrlParams.Input, _.UseOfAiForm]>([
    ['empty', {}, new _.InvalidForm({ generativeAiIdeas: Either.left(new _.Missing()) })],
    ['yes', { generativeAiIdeas: 'yes' }, new _.CompletedForm({ generativeAiIdeas: 'yes' })],
    ['no', { generativeAiIdeas: 'no' }, new _.CompletedForm({ generativeAiIdeas: 'no' })],
    [
      'invalid answer',
      { generativeAiIdeas: 'maybe' },
      new _.InvalidForm({ generativeAiIdeas: Either.left(new _.Missing()) }),
    ],
  ])('%s', (_name, input, expected) => {
    const body = UrlParams.fromInput(input)

    const actual = _.fromBody(body)

    expect(actual).toStrictEqual(expected)
  })
})

describe('fromAnswer', () => {
  it.each<[string, Option.Option<'yes' | 'no'>, _.UseOfAiForm]>([
    ['empty', Option.none(), new _.EmptyForm()],
    ['yes', Option.some('yes'), new _.CompletedForm({ generativeAiIdeas: 'yes' })],
    ['no', Option.some('no'), new _.CompletedForm({ generativeAiIdeas: 'no' })],
  ])('%s', (_name, answer, expected) => {
    const actual = _.fromAnswer(answer)

    expect(actual).toStrictEqual(expected)
  })
})

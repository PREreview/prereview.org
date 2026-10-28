import { expect, test } from '@effect/vitest'
import { Option } from 'effect'
import type * as DatasetReviews from '../../../../src/DatasetReviews/index.ts'
import { NonEmptyString } from '../../../../src/types/index.ts'
import * as _ from '../../../../src/WebApp/ReviewADatasetFlow/UseOfAiPage/UseOfAiForm.ts'

test.each<[string, DatasetReviews.UseOfAi, _.ValidForm]>([
  ['not answered', { _tag: 'NotAnswered' }, new _.EmptyForm()],
  [
    'AI was used',
    { _tag: 'AiWasUsed', generativeAiIdeasDetails: Option.none() },
    new _.CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.none() }),
  ],
  [
    'AI was used, with details',
    { _tag: 'AiWasUsed', generativeAiIdeasDetails: NonEmptyString.fromString('Some details') },
    new _.CompletedForm({
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: NonEmptyString.fromString('Some details'),
    }),
  ],
  [
    'AI was not used',
    { _tag: 'AiWasNotUsed' },
    new _.CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
  ],
])('fromAnswer (%s)', (_name, answer, expected) => {
  const actual = _.fromAnswer(answer)

  expect(actual).toStrictEqual(expected)
})

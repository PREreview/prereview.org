import { describe, expect, it } from '../../vitest.ts'
import { Array } from 'effect'
import { NextExpectedCommand, type Form } from '../../../src/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import * as _ from '../../../src/WebApp/ReviewAPreprintFlow/RouteForCommand.ts'

const preprintId = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

describe('RouteForCommand', () => {
  it.each<[string, Form, string]>([
    ['nothing answered', {}, '/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview/review-type'],
    [
      'already written',
      { alreadyWritten: 'yes' },
      '/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview/use-of-ai',
    ],
  ])('%s', (_name, form, expected) => {
    const actual = _.RouteForCommand(NextExpectedCommand(form)).href({ preprintId })

    expect(actual).toStrictEqual(expected)
  })

  it('has a distinct route for each command apart from listing authors', () => {
    const hrefs = Array.map(
      [
        'ChooseReviewType',
        'DeclareUseOfAi',
        'AnswerIfTheIntroductionMatches',
        'AnswerIfTheMethodsAreAppropriate',
        'AnswerIfTheResultsAreSupported',
        'AnswerIfTheDataPresentationIsWellSuited',
        'AnswerIfTheFindingsAndNextStepsAreClear',
        'AnswerIfThePreprintIsNovel',
        'AnswerIfTheLanguageNeedsEditing',
        'AnswerIfThePreprintShouldBeRead',
        'AnswerIfThePreprintIsReadyForAFullReview',
        'WriteReview',
        'ChoosePersona',
        'AnswerIfOthersNeedToBeListed',
        'DeclareCompetingInterests',
        'DeclareFollowingCodeOfConduct',
        'PublishPreprintReview',
      ] as const,
      command => _.RouteForCommand(command).href({ preprintId }),
    )

    expect(new Set(hrefs).size).toStrictEqual(hrefs.length)
  })
})

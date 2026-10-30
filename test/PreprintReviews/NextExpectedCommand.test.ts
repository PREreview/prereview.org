import { describe, expect, it } from '../vitest.ts'
import { Struct } from 'effect'
import { html } from '../../src/html.ts'
import type { Form } from '../../src/PreprintReviews/index.ts'
import * as _ from '../../src/PreprintReviews/NextExpectedCommand.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const freeformReview = {
  alreadyWritten: 'no',
  reviewType: 'freeform',
  review: html`<p>Some review</p>`,
} satisfies Form

const questionsReview = {
  alreadyWritten: 'no',
  reviewType: 'questions',
  introductionMatches: 'yes',
  methodsAppropriate: 'adequate',
  resultsSupported: 'well-supported',
  dataPresentation: 'highly-appropriate-clear',
  findingsNextSteps: 'adequately',
  novel: 'substantial',
  languageEditing: 'no',
  shouldRead: 'yes',
  readyFullReview: 'yes',
} satisfies Form

const details = {
  persona: 'public',
  moreAuthors: 'no',
  generativeAiIdeas: 'no',
  competingInterests: 'no',
  conduct: 'yes',
} satisfies Form

describe('NextExpectedCommand', () => {
  it.each<[string, Form, _.NextExpectedCommand]>([
    ['nothing answered', {}, 'ChooseReviewType'],
    ['already written', { alreadyWritten: 'yes' }, 'DeclareUseOfAi'],
    ['already written, declared use of AI', { alreadyWritten: 'yes', generativeAiIdeas: 'no' }, 'WriteReview'],
    ['questions', { alreadyWritten: 'no', reviewType: 'questions' }, 'AnswerIfTheIntroductionMatches'],
    ['questions, introduction', Struct.omit(questionsReview, 'methodsAppropriate'), 'AnswerIfTheMethodsAreAppropriate'],
    ['questions, methods', Struct.omit(questionsReview, 'resultsSupported'), 'AnswerIfTheResultsAreSupported'],
    ['questions, results', Struct.omit(questionsReview, 'dataPresentation'), 'AnswerIfTheDataPresentationIsWellSuited'],
    [
      'questions, data presentation',
      Struct.omit(questionsReview, 'findingsNextSteps'),
      'AnswerIfTheFindingsAndNextStepsAreClear',
    ],
    ['questions, findings', Struct.omit(questionsReview, 'novel'), 'AnswerIfThePreprintIsNovel'],
    ['questions, novel', Struct.omit(questionsReview, 'languageEditing'), 'AnswerIfTheLanguageNeedsEditing'],
    ['questions, language', Struct.omit(questionsReview, 'shouldRead'), 'AnswerIfThePreprintShouldBeRead'],
    [
      'questions, should read',
      Struct.omit(questionsReview, 'readyFullReview'),
      'AnswerIfThePreprintIsReadyForAFullReview',
    ],
    ['questions, all answered', questionsReview, 'ChoosePersona'],
    ['freeform', { alreadyWritten: 'no', reviewType: 'freeform' }, 'WriteReview'],
    ['freeform, written', freeformReview, 'ChoosePersona'],
    ['persona', { ...freeformReview, persona: 'public' }, 'AnswerIfOthersNeedToBeListed'],
    ['more authors', { ...freeformReview, persona: 'public', moreAuthors: 'yes' }, 'AddOtherAuthors'],
    [
      'more authors, listed',
      {
        ...freeformReview,
        persona: 'public',
        moreAuthors: 'yes',
        otherAuthors: [],
      },
      'DeclareUseOfAi',
    ],
    ['more authors, private', { ...freeformReview, persona: 'public', moreAuthors: 'yes-private' }, 'DeclareUseOfAi'],
    ['no more authors', { ...freeformReview, persona: 'public', moreAuthors: 'no' }, 'DeclareUseOfAi'],
    ['use of AI', Struct.omit({ ...freeformReview, ...details }, 'competingInterests'), 'DeclareCompetingInterests'],
    ['competing interests', Struct.omit({ ...freeformReview, ...details }, 'conduct'), 'DeclareFollowingCodeOfConduct'],
    ['everything', { ...freeformReview, ...details }, 'PublishPreprintReview'],
    [
      'everything, with a club',
      { ...freeformReview, ...details, club: Uuid('13e21570-0d1a-47f0-b378-b8c20776496a') },
      'PublishPreprintReview',
    ],
  ])('%s', (_name, form, expected) => {
    expect(_.NextExpectedCommand(form)).toStrictEqual(expected)
  })
})

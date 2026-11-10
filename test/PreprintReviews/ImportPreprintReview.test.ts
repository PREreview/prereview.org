import { expect, test } from '../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Result, Option } from 'effect'
import * as _ from '../../src/PreprintReviews/ImportPreprintReview.ts'
import * as Events from '../../src/Events.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { Name } from '../../src/types/Name.ts'
import { BiorxivOrMedrxivPreprintId, BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { html } from '../../src/html.ts'

const input = {
  authors: [
    { _tag: 'PublicPersona', name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') },
  ],
  otherAuthors: 0,
  doi: Doi('10.5281/zenodo.12345'),
  id: 12345,
  license: 'CC-BY-4.0',
  published: Temporal.Now.instant(),
  preprint: new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/abcde') }),
  live: false,
  useOfAi: { _tag: 'No' },
  competingInterests: { _tag: 'No' },
  language: 'en',
  content: { _tag: 'FreeText', text: html`<p>Hello</p>` },
} satisfies _.Input

const inputWithDifferentClub = {
  ...input,
  club: Uuid('793fb45f-c562-483a-a779-f0d0cfa6cb76'),
} satisfies _.Input

const inputWithDeterminatePreprintId = {
  ...input,
  preprint: new BiorxivPreprintId({ value: Doi('10.1101/abcde') }),
} satisfies _.Input

const inputWithDifferentAuthorList = {
  ...input,
  authors: [
    { _tag: 'PublicPersona', name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') },
    { _tag: 'PseudonymPersona', orcidId: OrcidId('0000-0002-6109-0367') },
  ],
} satisfies _.Input

const inputWithDifferentAddendum = {
  ...input,
  addendum: html`<p>PS: foo</p>`,
} satisfies _.Input

const inputWithNewInstances = {
  ...input,
  authors: [
    { _tag: 'PublicPersona', name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') },
  ],
  published: Temporal.Instant.fromEpochNanoseconds(input.published.epochNanoseconds),
  preprint: new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/abcde') }),
  content: { _tag: 'FreeText', text: html`<p>Hello</p>` },
} satisfies _.Input

const inputWithDifferentPublishedInstant = {
  ...input,
  published: input.published.add({ seconds: 1 }),
} satisfies _.Input

const inputWithPublishedDate = {
  ...input,
  published: Temporal.PlainDate.from('2026-11-10'),
} satisfies _.Input

const inputWithDifferentId = {
  ...input,
  id: 67890,
} satisfies _.Input

const inputWithDifferentFreeText = {
  ...input,
  content: { _tag: 'FreeText', text: html`<p>Goodbye</p>` },
} satisfies _.Input

const inputWithStructuredContent = {
  ...input,
  content: {
    _tag: 'Structured',
    introductionMatches: { answer: 'yes', comment: Option.none() },
    methodsAppropriate: { answer: 'highly-appropriate', comment: Option.none() },
    conclusionsSupported: { answer: 'highly-supported', comment: Option.none() },
    dataPresentation: { answer: 'highly-appropriate-and-clear', comment: Option.none() },
    findingsNextSteps: { answer: 'very-clearly', comment: Option.none() },
    advancingKnowledge: { answer: 'highly', comment: Option.none() },
    languageEditing: { answer: 'no', comment: Option.none() },
    wouldRecommend: { answer: 'yes', comment: Option.none() },
    readyForAttention: { answer: 'yes-as-is', comment: Option.none() },
  },
} satisfies _.Input

const inputWithDifferentPreprint = {
  ...input,
  preprint: new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/fghij') }),
} satisfies _.Input

const imported = new Events.PreprintReviewImported(input)

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Result.Result<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Result.succeedSome(imported)],
  [
    'input with determinate ID stored with indeterminate ID',
    [],
    inputWithDeterminatePreprintId,
    Result.succeedSome(imported),
  ],
  ['already import with same data', [imported], input, Result.succeedNone],
  [
    'already imported with different club',
    [imported],
    inputWithDifferentClub,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'club' })),
  ],
  [
    'already imported with different author list',
    [imported],
    inputWithDifferentAuthorList,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'authors' })),
  ],
  [
    'already imported with different addendum',
    [imported],
    inputWithDifferentAddendum,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'addendum' })),
  ],
  ['already imported with indeterminate preprint ID', [imported], inputWithDeterminatePreprintId, Result.succeedNone],
  ['already imported with same data in new instances', [imported], inputWithNewInstances, Result.succeedNone],
  [
    'already imported with different published instant',
    [imported],
    inputWithDifferentPublishedInstant,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'published' })),
  ],
  [
    'already imported with published instant, now a date',
    [imported],
    inputWithPublishedDate,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'published' })),
  ],
  [
    'already imported with published date, now an instant',
    [new Events.PreprintReviewImported(inputWithPublishedDate)],
    input,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'published' })),
  ],
  [
    'another review imported',
    [new Events.PreprintReviewImported(inputWithDifferentId)],
    input,
    Result.succeedSome(imported),
  ],
  [
    'already imported with different free text',
    [imported],
    inputWithDifferentFreeText,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'content' })),
  ],
  [
    'already imported with free text, now structured',
    [imported],
    inputWithStructuredContent,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'content' })),
  ],
  [
    'already imported with a club, now without',
    [new Events.PreprintReviewImported(inputWithDifferentClub)],
    input,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'club' })),
  ],
  [
    'already imported with an addendum, now without',
    [new Events.PreprintReviewImported(inputWithDifferentAddendum)],
    input,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'addendum' })),
  ],
  [
    'already imported with different preprint',
    [imported],
    inputWithDifferentPreprint,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'preprint' })),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ImportPreprintReview

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})

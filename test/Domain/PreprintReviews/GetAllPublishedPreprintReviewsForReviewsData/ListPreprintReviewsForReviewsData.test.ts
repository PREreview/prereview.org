import { expect, test } from '../../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/Domain/PreprintReviews/GetAllPublishedPreprintReviewsForReviewsData/ListPreprintReviewsForReviewsData.ts'
import * as Events from '../../../../src/Events.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'

const preprintReviewImported = ({
  id,
  published,
  authors = [{ _tag: 'PublicPersona', name: Option.none(), orcidId: OrcidId.OrcidId('0000-0002-1825-0097') }],
  club,
  content = { _tag: 'Full', text: html`<p>Hello</p>` },
  language = 'en',
  live = false,
  topics = [],
}: {
  id: number
  published: Temporal.Instant | Temporal.PlainDate
  authors?: Events.PreprintReviewImported['authors']
  club?: Uuid.Uuid
  content?: Events.PreprintReviewImported['content']
  language?: Events.PreprintReviewImported['language']
  live?: boolean
  topics?: Events.PreprintReviewImported['topics']
}) =>
  new Events.PreprintReviewImported({
    authors,
    otherAuthors: 0,
    doi: Doi.Doi(`10.5281/zenodo.${id}`),
    id,
    license: 'CC-BY-4.0',
    published,
    preprint: new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi(`10.1101/${id}`) }),
    live,
    useOfAi: { _tag: 'No' },
    competingInterests: { _tag: 'No' },
    language,
    content,
    topics,
    ...(club !== undefined ? { club } : {}),
  })

const expected = ({
  id,
  published,
  authors = [{ orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' }],
  club,
  language = 'en',
  live = false,
  structured = false,
  topics = [],
}: {
  id: number
  published: Temporal.Instant | Temporal.PlainDate
  authors?: _.PreprintReviewForReviewsData['authors']
  club?: Uuid.Uuid
  language?: _.PreprintReviewForReviewsData['language']
  live?: boolean
  structured?: boolean
  topics?: _.PreprintReviewForReviewsData['topics']
}): _.PreprintReviewForReviewsData => ({
  authors,
  club,
  doi: Doi.Doi(`10.5281/zenodo.${id}`),
  id,
  language,
  live,
  preprint: new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi(`10.1101/${id}`) }),
  published,
  structured,
  topics,
})

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], []],
  [
    'all preprint reviews, newest first',
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
      preprintReviewImported({ id: 2, published: Temporal.PlainDate.from('2026-11-03') }),
      preprintReviewImported({ id: 3, published: Temporal.Instant.from('2026-11-02T09:00:00Z') }),
    ],
    [
      expected({ id: 2, published: Temporal.PlainDate.from('2026-11-03') }),
      expected({ id: 3, published: Temporal.Instant.from('2026-11-02T09:00:00Z') }),
      expected({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
    ],
  ],
  [
    'with details of the review',
    [
      preprintReviewImported({
        id: 1,
        published: Temporal.PlainDate.from('2026-11-01'),
        club: Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753'),
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
        language: 'pt',
        live: true,
        topics: ['11251', '10002'],
      }),
    ],
    [
      expected({
        id: 1,
        published: Temporal.PlainDate.from('2026-11-01'),
        club: Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753'),
        language: 'pt',
        live: true,
        structured: true,
        topics: ['11251', '10002'],
      }),
    ],
  ],
  [
    'with authors in either persona, but not unknown authors',
    [
      preprintReviewImported({
        id: 1,
        published: Temporal.PlainDate.from('2026-11-01'),
        authors: [
          { _tag: 'PseudonymPersona', orcidId: OrcidId.OrcidId('0000-0002-6109-0367') },
          { _tag: 'Unknown', name: Option.none() },
          { _tag: 'PublicPersona', name: Option.none(), orcidId: OrcidId.OrcidId('0000-0002-1825-0097') },
        ],
      }),
    ],
    [
      expected({
        id: 1,
        published: Temporal.PlainDate.from('2026-11-01'),
        authors: [
          { orcidId: OrcidId.OrcidId('0000-0002-6109-0367'), persona: 'pseudonym' },
          { orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' },
        ],
      }),
    ],
  ],
  [
    'with authors who accepted an invite',
    [
      preprintReviewImported({ id: 1, published: Temporal.PlainDate.from('2026-11-01') }),
      new Events.AuthorChoicesForAReviewImported({
        reviewId: 1,
        orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
        persona: 'pseudonym',
        confirmedAt: Temporal.Instant.from('2026-11-02T09:00:00Z'),
      }),
    ],
    [
      expected({
        id: 1,
        published: Temporal.PlainDate.from('2026-11-01'),
        authors: [
          { orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' },
          { orcidId: OrcidId.OrcidId('0000-0002-6109-0367'), persona: 'pseudonym' },
        ],
      }),
    ],
  ],
  [
    'ignores authors who accepted an invite before the import, as the import already includes them',
    [
      new Events.AuthorChoicesForAReviewImported({
        reviewId: 1,
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
        persona: 'public',
        confirmedAt: Temporal.Instant.from('2026-10-31T09:00:00Z'),
      }),
      preprintReviewImported({ id: 1, published: Temporal.PlainDate.from('2026-11-01') }),
    ],
    [expected({ id: 1, published: Temporal.PlainDate.from('2026-11-01') })],
  ],
  [
    'ignores dataset reviews',
    [
      new Events.DatasetReviewWasPublished({
        datasetReviewId: Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753'),
        publicationDate: Temporal.Instant.from('2026-11-04T09:00:00Z'),
      }),
    ],
    [],
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListPreprintReviewsForReviewsData(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state)

  expect(actual).toStrictEqual(Result.succeed(expected))
})

test('leaves out removed preprint reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListPreprintReviewsForReviewsData(id => id === 1)

  const state = updateStateWithEvents(initialState, [
    preprintReviewImported({ id: 1, published: Temporal.PlainDate.from('2026-11-01') }),
    preprintReviewImported({ id: 2, published: Temporal.PlainDate.from('2026-11-02') }),
  ])

  const actual = query(state)

  expect(actual).toStrictEqual(Result.succeed([expected({ id: 2, published: Temporal.PlainDate.from('2026-11-02') })]))
})

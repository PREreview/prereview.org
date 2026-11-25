import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import * as _ from '../../../../src/Domain/PreprintReviews/GetAllPublishedPreprintReviewsForSciety/ListPreprintReviewsForSciety.ts'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'
import { expect, test } from '../../../vitest.ts'

const preprintReviewImported = ({
  id,
  published,
  authors = [{ _tag: 'PublicPersona', name: Option.none(), orcidId: OrcidId.OrcidId('0000-0002-1825-0097') }],
}: {
  id: number
  published: Temporal.Instant | Temporal.PlainDate
  authors?: Events.PreprintReviewImported['authors']
}) =>
  new Events.PreprintReviewImported({
    authors,
    otherAuthors: 0,
    doi: Doi.Doi(`10.5281/zenodo.${id}`),
    id,
    license: 'CC-BY-4.0',
    published,
    preprint: new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi(`10.1101/${id}`) }),
    live: false,
    useOfAi: { _tag: 'No' },
    competingInterests: { _tag: 'No' },
    language: 'en',
    content: { _tag: 'Full', text: html`<p>Hello</p>` },
    topics: [],
  })

const expected = ({
  id,
  published,
  authors = [{ orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' }],
}: {
  id: number
  published: Temporal.Instant | Temporal.PlainDate
  authors?: _.PreprintReviewForSciety['authors']
}): _.PreprintReviewForSciety => ({
  authors,
  doi: Doi.Doi(`10.5281/zenodo.${id}`),
  id,
  preprint: new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi(`10.1101/${id}`) }),
  published,
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
  const { initialState, updateStateWithEvents, query } = _.ListPreprintReviewsForSciety(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state)

  expect(actual).toStrictEqual(Result.succeed(expected))
})

test('leaves out removed preprint reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListPreprintReviewsForSciety(id => id === 1)

  const state = updateStateWithEvents(initialState, [
    preprintReviewImported({ id: 1, published: Temporal.PlainDate.from('2026-11-01') }),
    preprintReviewImported({ id: 2, published: Temporal.PlainDate.from('2026-11-02') }),
  ])

  const actual = query(state)

  expect(actual).toStrictEqual(Result.succeed([expected({ id: 2, published: Temporal.PlainDate.from('2026-11-02') })]))
})

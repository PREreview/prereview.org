import { Temporal } from '@js-temporal/polyfill'
import { Effect, Layer } from 'effect'
import { ClubNotFound, Clubs } from '../../../../src/Domain/Clubs/index.ts'
import * as _ from '../../../../src/Domain/PreprintReviews/GetPublishedPreprintReview/Enrich.ts'
import type { PublishedPreprintReviewDetails } from '../../../../src/Domain/PreprintReviews/GetPublishedPreprintReview/Query.ts'
import { PublishedPreprintReview } from '../../../../src/Domain/PreprintReviews/GetPublishedPreprintReview/Types.ts'
import {
  BiorxivOrMedrxivPreprintId,
  PreprintIsNotFound,
  PreprintIsUnavailable,
  Preprints,
} from '../../../../src/Domain/Preprints/index.ts'
import { Prereviewers, UnableToGetPersona } from '../../../../src/Domain/Prereviewers/index.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'
import * as fc from '../../../fc.ts'
import { expect, it, vi } from '../../../vitest.ts'

const details = {
  authors: { named: [{ orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' }], anonymous: 1 },
  competingInterests: { _tag: 'No' },
  content: { _tag: 'Full', text: html`<p>Hello</p>` },
  doi: Doi.Doi('10.5281/zenodo.12345'),
  id: 12345,
  language: 'en',
  license: 'CC-BY-4.0',
  live: false,
  preprintId: new BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/abcde') }),
  published: Temporal.Instant.from('2026-11-10T14:00:00Z'),
  topics: ['11251', '12030'],
  useOfAi: { _tag: 'No' },
} satisfies PublishedPreprintReviewDetails

const withPseudonymAuthor = {
  ...details,
  authors: { named: [{ orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'pseudonym' }], anonymous: 1 },
} satisfies PublishedPreprintReviewDetails

const inAClub = { ...details, clubId: Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753') }

it.effect.prop(
  'with a public author',
  [fc.preprint(), fc.publicPersona(), fc.boolean()],
  ([preprint, persona, requested]) =>
    Effect.gen(function* () {
      const wasAReviewRequested = vi.fn(() => Effect.succeed(requested))

      const actual = yield* _.Enrich(wasAReviewRequested)(details)

      expect(actual).toStrictEqual(
        new PublishedPreprintReview({
          authors: { named: [persona], anonymous: 1 },
          club: undefined,
          competingInterests: details.competingInterests,
          content: details.content,
          doi: details.doi,
          id: details.id,
          language: details.language,
          license: details.license,
          live: details.live,
          preprint: {
            id: preprint.id,
            language: preprint.title.language,
            title: preprint.title.text,
            url: preprint.url,
          },
          published: details.published,
          requested,
          topics: details.topics,
          useOfAi: details.useOfAi,
        }),
      )
      expect(wasAReviewRequested).toHaveBeenCalledWith({
        preprintId: details.preprintId,
        published: details.published,
      })
    }).pipe(
      Effect.provide([
        Layer.mock(Clubs, {}),
        Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }),
        Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
      ]),
    ),
)

it.effect.prop('with a pseudonym author', [fc.preprint(), fc.pseudonymPersona()], ([preprint, persona]) =>
  Effect.gen(function* () {
    const actual = yield* _.Enrich(() => Effect.succeed(false))(withPseudonymAuthor)

    expect(actual.authors).toStrictEqual({ named: [persona], anonymous: 1 })
  }).pipe(
    Effect.provide([
      Layer.mock(Clubs, {}),
      Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }),
      Layer.mock(Prereviewers, { getPseudonymPersona: () => Effect.succeed(persona) }),
    ]),
  ),
)

it.effect.prop('in a club', [fc.preprint(), fc.publicPersona(), fc.clubName()], ([preprint, persona, clubName]) =>
  Effect.gen(function* () {
    const actual = yield* _.Enrich(() => Effect.succeed(false))(inAClub)

    expect(actual.club).toStrictEqual(clubName)
    expect(actual).not.toHaveProperty('clubId')
    expect(actual).not.toHaveProperty('preprintId')
  }).pipe(
    Effect.provide([
      Layer.mock(Clubs, { getClubName: () => Effect.succeed(clubName) }),
      Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }),
      Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
    ]),
  ),
)

it.effect.prop(
  "when the preprint can't be found",
  [fc.publicPersona(), fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({}))],
  ([persona, error]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.flip(_.Enrich(() => Effect.succeed(false))(details))

      expect(actual).toStrictEqual(error)
    }).pipe(
      Effect.provide([
        Layer.mock(Clubs, {}),
        Layer.mock(Preprints, { getPreprint: () => error }),
        Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
      ]),
    ),
)

it.effect.prop("when an author's persona can't be found", [fc.preprint()], ([preprint]) =>
  Effect.gen(function* () {
    const actual = yield* Effect.flip(_.Enrich(() => Effect.succeed(false))(details))

    expect(actual).toStrictEqual(new UnableToGetPersona({}))
  }).pipe(
    Effect.provide([
      Layer.mock(Clubs, {}),
      Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }),
      Layer.mock(Prereviewers, { getPublicPersona: () => new UnableToGetPersona({}) }),
    ]),
  ),
)

it.effect.prop("when the club can't be found", [fc.preprint(), fc.publicPersona()], ([preprint, persona]) =>
  Effect.gen(function* () {
    const actual = yield* Effect.flip(_.Enrich(() => Effect.succeed(false))(inAClub))

    expect(actual).toStrictEqual(new ClubNotFound())
  }).pipe(
    Effect.provide([
      Layer.mock(Clubs, { getClubName: () => new ClubNotFound() }),
      Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }),
      Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
    ]),
  ),
)

import { expect, it } from '../../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Effect, Layer, Option } from 'effect'
import * as _ from '../../../../src/Domain/Comments/GetPublishedCommentsForAPrereview/Enrich.ts'
import type { PublishedComment } from '../../../../src/Domain/Comments/GetPublishedCommentsForAPrereview/ListPublishedComments.ts'
import { Prereviewers, UnableToGetPersona } from '../../../../src/Domain/Prereviewers/index.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'
import * as fc from '../../../fc.ts'

const comment = {
  authorId: OrcidId.OrcidId('0000-0002-1825-0097'),
  comment: html`<p>This is a comment.</p>`,
  commentId: Uuid.Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8'),
  competingInterests: Option.none(),
  doi: Doi.Doi('10.5281/zenodo.10779311'),
  id: 10779311,
  license: 'CC-BY-4.0',
  persona: 'public',
  publishedAt: Temporal.Instant.from('2026-11-01T09:00:00Z'),
} satisfies PublishedComment

it.effect.prop('with a public author', [fc.publicPersona()], ([persona]) =>
  Effect.gen(function* () {
    const actual = yield* _.Enrich(comment)

    expect(actual).toStrictEqual({
      author: persona,
      comment: comment.comment,
      commentId: comment.commentId,
      competingInterests: comment.competingInterests,
      doi: comment.doi,
      id: comment.id,
      license: comment.license,
      publishedAt: comment.publishedAt,
    })
  }).pipe(Effect.provide(Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }))),
)

it.effect.prop('with a pseudonym author', [fc.pseudonymPersona()], ([persona]) =>
  Effect.gen(function* () {
    const actual = yield* _.Enrich({ ...comment, persona: 'pseudonym' })

    expect(actual).toMatchObject({ author: persona })
  }).pipe(Effect.provide(Layer.mock(Prereviewers, { getPseudonymPersona: () => Effect.succeed(persona) }))),
)

it.effect('when the author is unavailable', () =>
  Effect.gen(function* () {
    const actual = yield* Effect.flip(_.Enrich(comment))

    expect(actual).toStrictEqual(new UnableToGetPersona({}))
  }).pipe(
    Effect.provide(Layer.mock(Prereviewers, { getPublicPersona: () => Effect.fail(new UnableToGetPersona({})) })),
  ),
)

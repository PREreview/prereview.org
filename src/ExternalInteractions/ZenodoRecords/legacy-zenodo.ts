import { Array, Function, Match, Option, String, flow, identity, pipe } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as L from 'logger-fp-ts'
import type { URL } from 'node:url'
import { P, match } from 'ts-pattern'
import {
  type DepositMetadata,
  type EmptyDeposition,
  type InProgressDeposition,
  type Record,
  type ZenodoAuthenticatedEnv,
  createEmptyDeposition,
  depositionIsSubmitted,
  getDeposition,
  publishDeposition,
  unlockDeposition,
  updateDeposition,
  uploadFile,
} from 'zenodo-ts'
import type { ClubName } from '../../Domain/Clubs/index.ts'
import type { NewPrereview } from '../../Domain/PreprintReviews/index.ts'
import type * as PreprintReview from '../../Domain/PreprintReviews/Prereview.ts' // oxlint-disable-line module-boundaries/use-index
import type { IndeterminatePreprintId, PreprintId } from '../../Domain/Preprints/index.ts'
import type * as Prereviewers from '../../Domain/Prereviewers/index.ts'
import { plainText } from '../../html.ts'
import { type PublicUrlEnv, toUrl } from '../../public-url.ts'
import { FptsToEffect } from '../../RefactoringUtilities/index.ts'
import * as Routes from '../../routes.ts'
import { type Doi, isDoi } from '../../types/Doi.ts'
import { Name } from '../../types/Name.ts'
import { OrcidId } from '../../types/OrcidId.ts'

export interface GetPreprintSubjectsEnv {
  getPreprintSubjects: (preprint: PreprintId) => T.Task<ReadonlyArray<{ id: URL; name: Name }>>
}

export interface IsReviewRequestedEnv {
  isReviewRequested: (preprint: PreprintId) => TE.TaskEither<'unavailable', boolean>
}

const getPreprintSubjects = (
  preprint: PreprintId,
): RT.ReaderTask<GetPreprintSubjectsEnv, ReadonlyArray<{ id: URL; name: Name }>> =>
  R.asks(({ getPreprintSubjects }) => getPreprintSubjects(preprint))

const isReviewRequested = (preprint: PreprintId): RTE.ReaderTaskEither<IsReviewRequestedEnv, 'unavailable', boolean> =>
  R.asks(({ isReviewRequested }) => isReviewRequested(preprint))

export const addAuthorToRecordOnZenodo = (
  id: number,
  persona: Prereviewers.Persona,
): RTE.ReaderTaskEither<ZenodoAuthenticatedEnv, 'unavailable', void> =>
  pipe(
    getDeposition(id),
    RTE.filterOrElseW(depositionIsSubmitted, () => 'not published' as const),
    RTE.chainW(unlockDeposition),
    RTE.chainW(deposition =>
      updateDeposition(
        {
          ...deposition.metadata,
          creators: pipe(getAuthors(deposition), ({ named, anonymous }) =>
            pipe(
              named,
              Array.append(
                Match.valueTags(persona, {
                  PublicPersona: persona => ({ name: persona.displayName, orcid: persona.orcidId }),
                  PseudonymPersona: persona => ({ name: persona.pseudonym }),
                }),
              ),
              Array.appendAll(
                match(anonymous)
                  .with(P.number.gt(2), anonymous => [{ name: `${anonymous - 1} other authors` }])
                  .with(2, () => [{ name: '1 other author' }])
                  .otherwise(() => []),
              ),
            ),
          ),
        },
        deposition,
      ),
    ),
    RTE.chainW(publishDeposition),
    RTE.bimap(() => 'unavailable', Function.constVoid),
  )

export const createRecordOnZenodo: (
  newPrereview: Omit<NewPrereview, 'club'> & { club: Option.Option<ClubName> },
) => RTE.ReaderTaskEither<
  PublicUrlEnv & ZenodoAuthenticatedEnv & GetPreprintSubjectsEnv & IsReviewRequestedEnv & L.LoggerEnv,
  'unavailable',
  [Doi, number]
> = newPrereview =>
  pipe(
    createEmptyDeposition(),
    RTE.bindTo('deposition'),
    RTE.apSW('subjects', RTE.rightReaderTask(getPreprintSubjects(newPrereview.preprint.id))),
    RTE.apSW('requested', isReviewRequested(newPrereview.preprint.id)),
    RTE.bindW(
      'metadata',
      RTE.fromReaderK(({ subjects, deposition, requested }) =>
        createDepositMetadata(deposition, newPrereview, subjects, requested),
      ),
    ),
    RTE.chainW(({ deposition, metadata }) => updateDeposition(metadata, deposition)),
    RTE.chainFirstW(
      uploadFile({
        name: 'review.html',
        content: newPrereview.review.toString(),
      }),
    ),
    RTE.chainW(publishDeposition),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(
        flow(
          error => ({
            error: match(error)
              .with(P.instanceOf(Error), error => error.message)
              .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
              .with({ _tag: P.string }, D.draw)
              .with(P.string, identity)
              .exhaustive(),
          }),
          L.errorP('Unable to create record on Zenodo'),
        ),
      ),
    ),
    RTE.bimap(
      () => 'unavailable',
      deposition => [deposition.metadata.doi, deposition.id],
    ),
  )

function createDepositMetadata(
  deposition: EmptyDeposition,
  newPrereview: Omit<NewPrereview, 'club'> & { club: Option.Option<ClubName> },
  subjects: ReadonlyArray<{ id: URL; name: Name }>,
  requested: boolean,
) {
  return pipe(
    toUrl(Routes.Review, { id: deposition.id }),
    R.map(
      url =>
        ({
          upload_type: 'publication',
          publication_type: 'peerreview',
          title: plainText`${newPrereview.structured ? 'Structured ' : ''}PREreview of “${
            newPrereview.preprint.title
          }”`.toString(),
          creators: pipe(
            Array.of(
              Match.valueTags(newPrereview.persona, {
                PublicPersona: persona => ({ name: persona.displayName, orcid: persona.orcidId }),
                PseudonymPersona: persona => ({ name: persona.pseudonym }),
              }),
            ),
            Array.appendAll(
              match(newPrereview.otherAuthors.length)
                .with(P.number.gt(1), anonymous => [{ name: `${anonymous} other authors` }])
                .with(1, () => [{ name: '1 other author' }])
                .otherwise(() => []),
            ),
          ),
          contributors: Option.match(newPrereview.club, {
            onSome: club => [{ name: club.name, type: 'ResearchGroup' }],
            onNone: () => undefined,
          }),
          language: Option.getOrUndefined(newPrereview.language),
          description: `<p><strong>This Zenodo record is a permanently preserved version of a ${
            newPrereview.structured ? 'Structured ' : ''
          }PREreview. You can view the complete PREreview at <a href="${url.href}">${url.href}</a>.</strong></p>

${newPrereview.review.toString()}`,
          license: match(newPrereview.license)
            .with('CC-BY-4.0', () => 'cc-by-4.0')
            .with('CC0-1.0', () => 'cc-zero')
            .exhaustive(),
          communities: [{ identifier: 'prereview-reviews' }],
          keywords: pipe(
            [
              requested ? 'Requested PREreview' : undefined,
              newPrereview.structured ? 'Structured PREreview' : undefined,
            ],
            Array.filter(String.isString),
            Array.match({ onEmpty: () => undefined, onNonEmpty: value => [...value] }),
          ),
          related_identifiers: [
            {
              ...toExternalIdentifier(newPrereview.preprint.id),
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
            {
              identifier: url.href,
              relation: 'isIdenticalTo',
              resource_type: 'publication-peerreview',
              scheme: 'url',
            },
          ],
          subjects: pipe(
            [...subjects],
            Array.match({
              onEmpty: () => undefined,
              onNonEmpty: Array.map(({ id, name }) => ({ term: name, identifier: id.href, scheme: 'url' })),
            }),
          ),
        }) satisfies DepositMetadata,
    ),
  )
}

export function toExternalIdentifier(preprint: IndeterminatePreprintId) {
  return match(preprint)
    .with({ _tag: 'PhilsciPreprintId' }, preprint => ({
      scheme: 'url',
      identifier: `https://philsci-archive.pitt.edu/${preprint.value}/`,
    }))
    .with({ value: P.when(isDoi) }, preprint => ({
      scheme: 'doi',
      identifier: preprint.value,
    }))
    .exhaustive()
}

function getAuthors(record: Record | InProgressDeposition): PreprintReview.Prereview['authors'] {
  const authors = Array.map(FptsToEffect.array(record.metadata.creators), ({ name, orcid }) => ({
    name: Name(name),
    orcid: orcid ? OrcidId(orcid) : undefined,
  }))

  const [named, last] = Array.unappend(authors)

  if (!Array.isReadonlyArrayNonEmpty(named)) {
    return { named: authors, anonymous: 0 }
  }

  const anonymous = pipe(
    Option.fromNullishOr(/^([1-9][0-9]*) other authors?$/.exec(last.name)),
    Option.flatMap(Array.get(1)),
    Option.match({
      onNone: () => 0,
      onSome: number => parseInt(number, 10),
    }),
  )

  return match(anonymous)
    .with(P.number.positive(), anonymous => ({ named, anonymous }))
    .otherwise(() => ({ named: authors, anonymous: 0 }))
}

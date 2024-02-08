import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { type CanInviteAuthorsEnv, canInviteAuthors } from '../../feature-flags'
import { missingE } from '../../form'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { NonEmptyString } from '../../types/string'
import type { User } from '../../user'
import { type FormStoreEnv, getForm } from '../form'
import { removeAuthorForm } from './remove-author-form'

export const writeReviewRemoveAuthor = ({
  body,
  id,
  method,
  number,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  number: number
  user?: User
}): RT.ReaderTask<
  CanInviteAuthorsEnv & FormStoreEnv & GetPreprintTitleEnv,
  PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS(
            'user',
            pipe(
              RTE.fromNullable('no-session' as const)(user),
              RTE.chainFirstW(
                flow(
                  RTE.fromReaderK(canInviteAuthors),
                  RTE.filterOrElse(
                    (canInviteAuthors): canInviteAuthors is true => canInviteAuthors,
                    () => 'not-found' as const,
                  ),
                ),
              ),
            ),
          ),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.let('number', () => number),
          RTE.bindW(
            'form',
            flow(
              ({ preprint, user }) => getForm(user.orcid, preprint.id),
              RTE.filterOrElseW(
                form => form.moreAuthors === 'yes',
                () => 'not-found' as const,
              ),
            ),
          ),
          RTE.bindW(
            'author',
            RTE.fromOptionK(() => 'no-author' as const)(
              flow(
                O.fromNullableK(({ form }) => form.otherAuthors),
                O.chain(RA.lookup(number - 1)),
              ),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with('no-author', () =>
                  RedirectResponse({ location: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }) }),
                )
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('not-found', () => pageNotFound)
                .with('form-unavailable', () => havingProblemsPage)
                .exhaustive(),
            state =>
              match(state)
                .with({ method: 'POST' }, handleRemoveAuthorForm)
                .otherwise(state => removeAuthorForm({ ...state, form: { removeAuthor: E.right(undefined) } })),
          ),
        ),
    ),
  )

const handleRemoveAuthorForm = ({
  author,
  body,
  number,
  preprint,
}: {
  author: { name: NonEmptyString }
  body: unknown
  number: number
  preprint: PreprintTitle
}) =>
  pipe(
    E.Do,
    E.let('removeAuthor', () => pipe(RemoveAuthorFieldD.decode(body), E.mapLeft(missingE))),
    E.chain(fields =>
      pipe(
        E.Do,
        E.apS('removeAuthor', fields.removeAuthor),
        E.mapLeft(() => fields),
      ),
    ),
    E.matchW(
      error => removeAuthorForm({ author: author, form: error, number, preprint }),
      () => havingProblemsPage,
    ),
  )

const RemoveAuthorFieldD = pipe(
  D.struct({
    removeAuthor: D.literal('yes', 'no'),
  }),
  D.map(get('removeAuthor')),
)

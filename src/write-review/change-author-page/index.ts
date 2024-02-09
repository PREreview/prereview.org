import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { User } from '../../user'
import { type FormStoreEnv, getForm } from '../form'
import { changeAuthorForm } from './change-author-form'

export const writeReviewChangeAuthor = ({
  id,
  method,
  number,
  user,
}: {
  id: IndeterminatePreprintId
  method: string
  number: number
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
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
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
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
                .with({ method: 'POST' }, () => havingProblemsPage)
                .otherwise(state =>
                  changeAuthorForm({
                    ...state,
                    form: { name: E.right(state.author.name), emailAddress: E.right(state.author.emailAddress) },
                  }),
                ),
          ),
        ),
    ),
  )

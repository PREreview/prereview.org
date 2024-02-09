import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { missingE } from '../../form'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { NonEmptyString } from '../../types/string'
import type { User } from '../../user'
import { type Form, type FormStoreEnv, getForm, saveForm, updateForm } from '../form'
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
          RTE.matchEW(
            error =>
              RT.of(
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
              ),
            state =>
              match(state)
                .with({ method: 'POST' }, handleRemoveAuthorForm)
                .otherwise(state => RT.of(removeAuthorForm({ ...state, form: { removeAuthor: E.right(undefined) } }))),
          ),
        ),
    ),
  )

const handleRemoveAuthorForm = ({
  author,
  body,
  form,
  number,
  preprint,
  user,
}: {
  author: { name: NonEmptyString }
  body: unknown
  form: Form
  number: number
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.Do,
    RTE.let('removeAuthor', () => pipe(RemoveAuthorFieldD.decode(body), E.mapLeft(missingE))),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('removeAuthor', fields.removeAuthor),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.chainW(({ removeAuthor }) =>
      match(removeAuthor)
        .with('yes', () =>
          pipe(
            RTE.Do,
            RTE.apS(
              'otherAuthors',
              RTE.fromOption(() => 'form-unavailable' as const)(RA.deleteAt(number - 1)(form.otherAuthors ?? [])),
            ),
            RTE.map(updateForm(form)),
            RTE.chainFirst(saveForm(user.orcid, preprint.id)),
          ),
        )
        .with('no', () => RTE.of(form))
        .exhaustive(),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage)
          .with({ removeAuthor: P.any }, error => removeAuthorForm({ author, form: error, number, preprint }))
          .exhaustive(),
      () => RedirectResponse({ location: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }) }),
    ),
  )

const RemoveAuthorFieldD = pipe(
  D.struct({
    removeAuthor: D.literal('yes', 'no'),
  }),
  D.map(get('removeAuthor')),
)

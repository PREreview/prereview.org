import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import * as D from 'io-ts/lib/Decoder.js'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { missingE } from '../../form.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { DefaultLocale, type SupportedLocale } from '../../locales/index.js'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint.js'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { NonEmptyString } from '../../types/string.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, saveForm, updateForm } from '../form.js'
import { removeAuthorForm } from './remove-author-form.js'

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
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound)
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage)
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
          RTE.apS('locale', RTE.of(DefaultLocale)),
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
  locale,
}: {
  author: { name: NonEmptyString }
  body: unknown
  form: Form
  number: number
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
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
          .with({ removeAuthor: P.any }, error => removeAuthorForm({ author, form: error, number, preprint, locale }))
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

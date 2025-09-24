import { Array, Match, Option, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { missingE } from '../../form.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.ts'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.ts'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import type { User } from '../../user.ts'
import { type Form, type FormStoreEnv, getForm, saveForm, updateForm } from '../form.ts'
import { removeAuthorForm } from './remove-author-form.ts'

export const writeReviewRemoveAuthor = ({
  body,
  id,
  locale,
  method,
  number,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  number: number
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.let('number', () => number),
          RTE.apS('locale', RTE.of(locale)),
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
                Option.liftNullable(({ form }) => form.otherAuthors),
                Option.flatMap(Array.get(number - 1)),
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
                  .with('not-found', () => pageNotFound(locale))
                  .with('form-unavailable', () => havingProblemsPage(locale))
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
              RTE.fromOption(() => 'form-unavailable' as const)(
                Array.removeOption(form.otherAuthors ?? [], number - 1),
              ),
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
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ removeAuthor: P.any }, error => removeAuthorForm({ author, form: error, number, preprint, locale }))
          .exhaustive(),
      () => RedirectResponse({ location: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }) }),
    ),
  )

const RemoveAuthorFieldD = pipe(
  D.struct({
    removeAuthor: D.literal('yes', 'no'),
  }),
  D.map(Struct.get('removeAuthor')),
)

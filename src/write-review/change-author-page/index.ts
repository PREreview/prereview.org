import { Array, Match, Option, String, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { getInput, invalidE, missingE } from '../../form.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint.js'
import type { IndeterminatePreprintId } from '../../Preprints/index.js'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes.js'
import { EmailAddressC } from '../../types/EmailAddress.js'
import { type NonEmptyString, NonEmptyStringC } from '../../types/NonEmptyString.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, saveForm, updateForm } from '../form.js'
import { changeAuthorForm } from './change-author-form.js'

export const writeReviewChangeAuthor = ({
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
          RTE.apS('locale', RTE.of(locale)),
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
                .with({ method: 'POST' }, handleChangeAuthorForm)
                .otherwise(state =>
                  RT.of(
                    changeAuthorForm({
                      ...state,
                      form: {
                        name: E.right(state.author.name),
                        emailAddress: E.right(state.author.emailAddress),
                      },
                    }),
                  ),
                ),
          ),
        ),
    ),
  )

const handleChangeAuthorForm = ({
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
    RTE.let('name', () => pipe(NameFieldD.decode(body), E.mapLeft(missingE))),
    RTE.let('emailAddress', () =>
      pipe(
        EmailAddressFieldD.decode(body),
        E.mapLeft(error =>
          match(getInput('emailAddress')(error))
            .with(P.union(P.when(Option.isNone), { value: '' }), () => missingE())
            .with({ value: P.select() }, invalidE)
            .exhaustive(),
        ),
      ),
    ),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('name', fields.name),
        E.apS('emailAddress', fields.emailAddress),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.chainW(author =>
      pipe(
        RTE.Do,
        RTE.apS(
          'otherAuthors',
          RTE.fromOption(() => 'form-unavailable' as const)(
            Array.replaceOption(form.otherAuthors ?? [], number - 1, author),
          ),
        ),
        RTE.map(updateForm(form)),
        RTE.chainFirst(saveForm(user.orcid, preprint.id)),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ name: P.any }, error => changeAuthorForm({ author, form: error, number, preprint, locale }))
          .exhaustive(),
      () => RedirectResponse({ location: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }) }),
    ),
  )

const NameFieldD = pipe(D.struct({ name: NonEmptyStringC }), D.map(Struct.get('name')))

const EmailAddressFieldD = pipe(
  D.struct({ emailAddress: pipe(D.string, D.map(String.trim), D.compose(EmailAddressC)) }),
  D.map(Struct.get('emailAddress')),
)

import { Option, String, Struct, pipe } from 'effect'
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
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes.js'
import { EmailAddressC } from '../../types/email-address.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import { type NonEmptyString, NonEmptyStringC } from '../../types/string.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, saveForm, updateForm } from '../form.js'
import { addAuthorForm } from './add-author-form.js'
import { addMultipleAuthorsForm } from './add-multiple-authors.js'
import { parseAuthors } from './parse-authors.js'

export const writeReviewAddAuthor = ({
  body,
  canAddMultipleAuthors,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  canAddMultipleAuthors: boolean
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound(locale))
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage(locale))
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.let('canAddMultipleAuthors', () => canAddMultipleAuthors),
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.bindW('form', ({ preprint, user }) => getForm(user.orcid, preprint.id)),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .with(
                  { form: { moreAuthors: 'yes' }, canAddMultipleAuthors: true, method: 'POST' },
                  handleAddMultipleAuthorsForm,
                )
                .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, handleAddAuthorForm)
                .with({ form: { moreAuthors: 'yes' }, canAddMultipleAuthors: true }, ({ form, preprint, locale }) =>
                  RT.of(
                    addMultipleAuthorsForm({
                      form: { authors: E.right(undefined) },
                      preprint,
                      otherAuthors: (form.otherAuthors ?? []).length > 0,
                      locale,
                    }),
                  ),
                )
                .with({ form: { moreAuthors: 'yes' } }, ({ form, preprint, locale }) =>
                  RT.of(
                    addAuthorForm({
                      form: {
                        name: E.right(undefined),
                        emailAddress: E.right(undefined),
                      },
                      preprint,
                      otherAuthors: (form.otherAuthors ?? []).length > 0,
                      locale,
                    }),
                  ),
                )
                .otherwise(({ locale }) => RT.of(pageNotFound(locale))),
          ),
        ),
    ),
  )

const handleAddMultipleAuthorsForm = ({
  body,
  form,
  locale,
  preprint,
}: {
  body: unknown
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) =>
  pipe(
    RTE.Do,
    RTE.let('authors', () =>
      pipe(
        AuthorsFieldD.decode(body),
        E.mapLeft(error =>
          match(getInput('emailAddress')(error))
            .with(P.union(P.when(Option.isNone), { value: '' }), () => missingE())
            .with({ value: P.select() }, invalidE)
            .exhaustive(),
        ),
        E.chainW(
          E.liftOption(
            (authors: NonEmptyString) =>
              pipe(
                parseAuthors(authors),
                Option.map(parsed => ({ authors, parsed })),
              ),
            invalidE,
          ),
        ),
      ),
    ),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('authors', fields.authors),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.mapLeft(fields => ({
      ...fields,
      authors: pipe(
        fields.authors,
        E.map(({ authors }) => authors),
      ),
    })),
    RTE.matchW(
      error =>
        match(error)
          .with({ authors: P.any }, error =>
            addMultipleAuthorsForm({
              form: error,
              preprint,
              otherAuthors: (form.otherAuthors ?? []).length > 0,
              locale,
            }),
          )
          .exhaustive(),
      () => havingProblemsPage(locale),
    ),
  )

const AuthorsFieldD = pipe(D.struct({ authors: NonEmptyStringC }), D.map(Struct.get('authors')))

const handleAddAuthorForm = ({
  body,
  form,
  locale,
  preprint,
  user,
}: {
  body: unknown
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
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
    RTE.map(author => ({ otherAuthors: [...(form.otherAuthors ?? []), author] })),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ name: P.any }, error =>
            addAuthorForm({
              form: error,
              preprint,
              otherAuthors: (form.otherAuthors ?? []).length > 0,
              locale,
            }),
          )
          .exhaustive(),
      () => RedirectResponse({ location: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }) }),
    ),
  )

const NameFieldD = pipe(D.struct({ name: NonEmptyStringC }), D.map(Struct.get('name')))

const EmailAddressFieldD = pipe(
  D.struct({ emailAddress: pipe(D.string, D.map(String.trim), D.compose(EmailAddressC)) }),
  D.map(Struct.get('emailAddress')),
)

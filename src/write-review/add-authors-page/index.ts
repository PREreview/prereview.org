import { flow, Option, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import { mustDeclareUseOfAi, type MustDeclareUseOfAiEnv } from '../../feature-flags.js'
import { missingE } from '../../form.js'
import * as FptsToEffect from '../../FptsToEffect.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { DefaultLocale, type SupportedLocale } from '../../locales/index.js'
import { getPreprintTitle, type GetPreprintTitleEnv, type PreprintTitle } from '../../preprint.js'
import { type LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorMatch, writeReviewMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch } from '../form.js'
import { addAuthorsForm } from './add-authors-form.js'

export const writeReviewAddAuthors = ({
  body,
  id,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  user?: User
}): RT.ReaderTask<
  FormStoreEnv & GetPreprintTitleEnv & MustDeclareUseOfAiEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
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
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.apS('locale', RTE.of(DefaultLocale)),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.apSW('mustDeclareUseOfAi', RTE.fromReader(mustDeclareUseOfAi)),
          RTE.bindW('form', ({ preprint, user }) => getForm(user.orcid, preprint.id)),
          RTE.let(
            'authors',
            flow(
              Option.liftNullable(({ form }) => form.otherAuthors),
              Option.flatMap(FptsToEffect.optionK(RNEA.fromReadonlyArray)),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', () => havingProblemsPage)
                .exhaustive(),
            state =>
              match(state)
                .with({ form: { moreAuthors: 'yes' }, authors: { _tag: 'None' } }, () =>
                  RedirectResponse({ location: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }) }),
                )
                .with({ form: { moreAuthors: 'yes' }, authors: { _tag: 'Some' }, method: 'POST' }, handleAddAuthorsForm)
                .with({ form: { moreAuthors: 'yes' }, authors: { _tag: 'Some' } }, state =>
                  addAuthorsForm({
                    ...state,
                    authors: state.authors.value,
                    form: { anotherAuthor: E.right(undefined) },
                    locale: state.locale,
                  }),
                )
                .otherwise(() => pageNotFound),
          ),
        ),
    ),
  )

const handleAddAuthorsForm = ({
  authors,
  body,
  form,
  preprint,
  locale,
  mustDeclareUseOfAi,
}: {
  authors: Option.Some<RNEA.ReadonlyNonEmptyArray<NonNullable<Form['otherAuthors']>[number]>>
  body: unknown
  form: Form
  preprint: PreprintTitle
  locale: SupportedLocale
  mustDeclareUseOfAi: boolean
}) =>
  pipe(
    E.Do,
    E.let('anotherAuthor', () => pipe(AnotherAuthorFieldD.decode(body), E.mapLeft(missingE))),
    E.chain(fields =>
      pipe(
        E.Do,
        E.apS('anotherAuthor', fields.anotherAuthor),
        E.mapLeft(() => fields),
      ),
    ),
    E.matchW(
      error => addAuthorsForm({ authors: authors.value, form: error, preprint, locale }),
      state =>
        match(state)
          .with({ anotherAuthor: 'yes' }, () =>
            RedirectResponse({ location: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }) }),
          )
          .with({ anotherAuthor: 'no' }, () =>
            RedirectResponse({
              location: format(nextFormMatch(form, mustDeclareUseOfAi).formatter, { id: preprint.id }),
            }),
          )
          .exhaustive(),
    ),
  )

const AnotherAuthorFieldD = pipe(
  D.struct({
    anotherAuthor: D.literal('yes', 'no'),
  }),
  D.map(Struct.get('anotherAuthor')),
)

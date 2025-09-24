import { Match, Struct, pipe } from 'effect'
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
import type { User } from '../../user.ts'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.ts'
import { authorsForm } from './authors-form.ts'

export const writeReviewAuthors = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<GetPreprintTitleEnv & FormStoreEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
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
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.matchE(
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
                .with({ method: 'POST' }, handleAuthorsForm)
                .otherwise(state => RT.of(showAuthorsForm(state))),
          ),
        ),
    ),
  )

const showAuthorsForm = ({
  form,
  preprint,
  locale,
}: {
  form: Form
  preprint: PreprintTitle
  locale: SupportedLocale
}) =>
  authorsForm(
    preprint,
    { moreAuthors: E.right(form.moreAuthors), moreAuthorsApproved: E.right(form.moreAuthorsApproved) },
    locale,
  )

const handleAuthorsForm = ({
  body,
  form,
  preprint,
  user,
  locale,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RTE.Do,
    RTE.let('moreAuthors', () => pipe(MoreAuthorsFieldD.decode(body), E.mapLeft(missingE))),
    RTE.let('moreAuthorsApproved', ({ moreAuthors }) =>
      match(moreAuthors)
        .with({ right: 'yes' }, () => pipe(MoreAuthorsApprovedFieldD.decode(body), E.mapLeft(missingE)))
        .otherwise(() => E.right(undefined)),
    ),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('moreAuthors', fields.moreAuthors),
        E.apS('moreAuthorsApproved', fields.moreAuthorsApproved),
        E.let('otherAuthors', () => form.otherAuthors ?? []),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ moreAuthors: P.any }, form => authorsForm(preprint, form, locale))
          .exhaustive(),
      form =>
        match(form)
          .with({ moreAuthors: 'yes' }, () =>
            RedirectResponse({ location: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }) }),
          )
          .otherwise(form =>
            RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
          ),
    ),
  )

const MoreAuthorsFieldD = pipe(
  D.struct({
    moreAuthors: D.literal('yes', 'yes-private', 'no'),
  }),
  D.map(Struct.get('moreAuthors')),
)

const MoreAuthorsApprovedFieldD = pipe(
  D.struct({
    moreAuthorsApproved: D.literal('yes'),
  }),
  D.map(Struct.get('moreAuthorsApproved')),
)

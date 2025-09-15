import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import markdownIt from 'markdown-it'
import { P, match } from 'ts-pattern'
import { invalidE, missingE } from '../../form.js'
import { type Html, sanitizeHtml } from '../../html.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.js'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.js'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewMatch, writeReviewReviewTypeMatch } from '../../routes.js'
import { NonEmptyStringC } from '../../types/NonEmptyString.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.js'
import { pasteReviewForm } from './paste-review-form.js'
import { template } from './template.js'
import { turndown } from './turndown.js'
import { writeReviewForm } from './write-review-form.js'

export const writeReviewReview = ({
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
}): RT.ReaderTask<GetPreprintTitleEnv & FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse> =>
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
          RTE.let('preprint', () => preprint),
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('body', () => body),
          RTE.let('method', () => method),
          RTE.let('locale', () => locale),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .returnType<RT.ReaderTask<FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse>>()
                .with(
                  {
                    form: P.union(
                      { alreadyWritten: P.optional(undefined) },
                      { alreadyWritten: 'no', reviewType: 'questions' },
                    ),
                  },
                  () =>
                    RT.of(
                      RedirectResponse({ location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }) }),
                    ),
                )
                .with({ method: 'POST', form: { alreadyWritten: 'yes' } }, handlePasteReviewForm)
                .with({ method: 'POST', form: { alreadyWritten: 'no' } }, handleWriteReviewForm)
                .with({ form: { alreadyWritten: 'yes' } }, state => RT.of(showPasteReviewForm(state)))
                .with({ form: { alreadyWritten: 'no' } }, state => RT.of(showWriteReviewForm(state)))
                .exhaustive(),
          ),
        ),
    ),
  )

const showWriteReviewForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => writeReviewForm(preprint, { review: E.right(form.review) }, locale)

const showPasteReviewForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => pasteReviewForm(preprint, { review: E.right(form.review) }, locale)

const handleWriteReviewForm = ({
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
    RTE.right({
      review: pipe(
        ReviewFieldD.decode(body),
        E.mapLeft(missingE),
        E.filterOrElseW(isSameMarkdownAs(template(locale)), flow(String, invalidE)),
      ),
    }),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('review', fields.review),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ review: P.any }, form => writeReviewForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const handlePasteReviewForm = ({
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
    RTE.fromEither(
      pipe(
        ReviewFieldD.decode(body),
        E.mapLeft(missingE),
        E.bimap(
          review => ({ review: E.left(review) }),
          review => ({ review }),
        ),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ review: P.any }, form => pasteReviewForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const ReviewFieldD = pipe(
  D.struct({
    review: NonEmptyStringC,
  }),
  D.map(({ review }) => sanitizeHtml(markdownIt({ html: true }).render(review))),
)

function isSameMarkdownAs(reference: string) {
  return (input: Html) => {
    return (
      turndown.turndown(input.toString()).replaceAll(/\s+/g, ' ') !==
      turndown.turndown(reference.replaceAll(/\s+/g, ' '))
    )
  }
}

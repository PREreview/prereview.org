import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import markdownIt from 'markdown-it'
import { P, match } from 'ts-pattern'
import { invalidE, missingE } from '../../form'
import { type Html, sanitizeHtml } from '../../html'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { writeReviewMatch, writeReviewReviewTypeMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import { NonEmptyStringC } from '../../types/string'
import type { User } from '../../user'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form'
import { pasteReviewForm } from './paste-review-form'
import { template } from './template'
import { turndown } from './turndown'
import { writeReviewForm } from './write-review-form'

export const writeReviewReview = ({
  body,
  id,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  user?: User
}): RT.ReaderTask<GetPreprintTitleEnv & FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse> =>
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
          RTE.let('preprint', () => preprint),
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('body', () => body),
          RTE.let('method', () => method),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage)
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

const showWriteReviewForm = ({ form, preprint }: { form: Form; preprint: PreprintTitle }) =>
  writeReviewForm(preprint, { review: E.right(form.review) })

const showPasteReviewForm = ({ form, preprint }: { form: Form; preprint: PreprintTitle }) =>
  pasteReviewForm(preprint, { review: E.right(form.review) })

const handleWriteReviewForm = ({
  body,
  form,
  preprint,
  user,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.right({
      review: pipe(
        ReviewFieldD.decode(body),
        E.mapLeft(missingE),
        E.filterOrElseW(isSameMarkdownAs(template), flow(String, invalidE)),
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
          .with('form-unavailable', () => havingProblemsPage)
          .with({ review: P.any }, form => writeReviewForm(preprint, form))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const handlePasteReviewForm = ({
  body,
  form,
  preprint,
  user,
}: {
  body: unknown
  form: Form
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
          .with('form-unavailable', () => havingProblemsPage)
          .with({ review: P.any }, form => pasteReviewForm(preprint, form))
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
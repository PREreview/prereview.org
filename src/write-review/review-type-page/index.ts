import { Match, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { missingE } from '../../form.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type GetPreprintEnv, getPreprint } from '../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.ts'
import { writeReviewMatch, writeReviewReviewTypeMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { type Form, type FormStoreEnv, createForm, getForm, nextFormMatch, saveForm, updateForm } from '../form.ts'
import { ownPreprintPage } from '../own-preprint-page.ts'
import { ensureUserIsNotAnAuthor } from '../user-is-author.ts'
import { reviewTypeForm } from './review-type-form.ts'

export const writeReviewReviewType = ({
  askAiReviewEarly = false,
  body,
  id,
  locale,
  method,
  user,
}: {
  askAiReviewEarly?: boolean
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  GetPreprintEnv & FormStoreEnv,
  PageResponse | StreamlinePageResponse | RedirectResponse | LogInResponse
> =>
  pipe(
    getPreprint(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let(
            'preprint',
            () =>
              ({
                id: preprint.id,
                title: preprint.title.text,
                language: preprint.title.language,
              }) satisfies PreprintTitle,
          ),
          RTE.apS(
            'user',
            pipe(RTE.fromNullable('no-session' as const)(user), RTE.chainEitherKW(ensureUserIsNotAnAuthor(preprint))),
          ),
          RTE.bindW(
            'form',
            flow(
              ({ user }) => getForm(user.orcid, preprint.id),
              RTE.orElse(() => RTE.of(createForm())),
            ),
          ),
          RTE.let('body', () => body),
          RTE.let('method', () => method),
          RTE.let('locale', () => locale),
          RTE.let('askAiReviewEarly', () => askAiReviewEarly),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with({ type: 'is-author' }, () =>
                    ownPreprintPage(preprint.id, writeReviewReviewTypeMatch.formatter, locale),
                  )
                  .with('no-session', () =>
                    LogInResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with(P.instanceOf(Error), () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .returnType<RT.ReaderTask<FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse>>()
                .with({ method: 'POST' }, handleReviewTypeForm)
                .otherwise(state => RT.of(showReviewTypeForm(state))),
          ),
        ),
    ),
  )

const showReviewTypeForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) =>
  reviewTypeForm(
    preprint,
    { reviewType: E.right(form.alreadyWritten === 'yes' ? 'already-written' : form.reviewType) },
    locale,
  )

const handleReviewTypeForm = ({
  askAiReviewEarly,
  body,
  form,
  locale,
  preprint,
  user,
}: {
  askAiReviewEarly: boolean
  body: unknown
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.right({ reviewType: pipe(ReviewTypeFieldD.decode(body), E.mapLeft(missingE)) }),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('reviewType', fields.reviewType),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(
      flow(
        fields =>
          match(fields.reviewType)
            .returnType<Form>()
            .with('questions', reviewType => ({ alreadyWritten: 'no', reviewType }))
            .with('freeform', reviewType => ({ alreadyWritten: 'no', reviewType }))
            .with('already-written', () => ({ alreadyWritten: 'yes', reviewType: undefined }))
            .exhaustive(),
        updateForm(form),
      ),
    ),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ reviewType: P.any }, form => reviewTypeForm(preprint, form, locale))
          .exhaustive(),
      form =>
        RedirectResponse({ location: format(nextFormMatch(form, askAiReviewEarly).formatter, { id: preprint.id }) }),
    ),
  )

const ReviewTypeFieldD = pipe(
  D.struct({
    reviewType: D.literal('questions', 'freeform', 'already-written'),
  }),
  D.map(Struct.get('reviewType')),
)

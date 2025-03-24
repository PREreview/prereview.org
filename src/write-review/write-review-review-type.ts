import { Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form.js'
import { html, plainText, rawHtml } from '../html.js'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { type GetPreprintEnv, type PreprintTitle, getPreprint } from '../preprint.js'
import { LogInResponse, type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response.js'
import { preprintReviewsMatch, writeReviewMatch, writeReviewReviewTypeMatch } from '../routes.js'
import { errorPrefix, errorSummary } from '../shared-translation-elements.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import type { User } from '../user.js'
import { type Form, type FormStoreEnv, createForm, getForm, nextFormMatch, saveForm, updateForm } from './form.js'
import { ownPreprintPage } from './own-preprint-page.js'
import { prereviewOfSuffix } from './shared-elements.js'
import { ensureUserIsNotAnAuthor } from './user-is-author.js'

export const writeReviewReviewType = ({
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
}): RT.ReaderTask<
  GetPreprintEnv & FormStoreEnv,
  PageResponse | StreamlinePageResponse | RedirectResponse | LogInResponse
> =>
  pipe(
    getPreprint(id),
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
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const ReviewTypeFieldD = pipe(
  D.struct({
    reviewType: D.literal('questions', 'freeform', 'already-written'),
  }),
  D.map(Struct.get('reviewType')),
)

interface ReviewTypeForm {
  readonly reviewType: E.Either<MissingE, 'questions' | 'freeform' | 'already-written' | undefined>
}

function reviewTypeForm(preprint: PreprintTitle, form: ReviewTypeForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: pipe(
      t('howWouldYouLikeToStart')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${t('backToPreprint')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.reviewType) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(E.isLeft(form.reviewType) ? 'aria-invalid="true" aria-errormessage="review-type-error"' : '')}
          >
            <legend>
              <h1>${t('howWouldYouLikeToStart')()}</h1>
            </legend>

            ${E.isLeft(form.reviewType)
              ? html`
                  <div class="error-message" id="review-type-error">
                    <span class="visually-hidden">${t('error')()}:</span>
                    ${match(form.reviewType.left)
                      .with({ _tag: 'MissingE' }, () => t('selectHowToStart')())
                      .exhaustive()}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="reviewType"
                    id="review-type-questions"
                    type="radio"
                    value="questions"
                    aria-describedby="review-type-tip-questions"
                    ${match(form.reviewType)
                      .with({ right: 'questions' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${t('withPrompts')()}</span>
                </label>
                <p id="review-type-tip-questions" role="note">${t('weWillAskQuestions')()}</p>
              </li>
              <li>
                <label>
                  <input
                    name="reviewType"
                    type="radio"
                    value="freeform"
                    aria-describedby="review-type-tip-freeform"
                    ${match(form.reviewType)
                      .with({ right: 'freeform' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${t('withTemplate')()}</span>
                </label>
                <p id="review-type-tip-freeform" role="note">${t('weWillTemplate')()}</p>
              </li>
              <li>
                <span>${t('or')()}</span>
                <label>
                  <input
                    name="reviewType"
                    type="radio"
                    value="already-written"
                    ${match(form.reviewType)
                      .with({ right: 'already-written' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${t('alreadyWritten')()}</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${t('continueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
    js: error ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: ReviewTypeForm) =>
  E.isLeft(form.reviewType)
    ? html`
        <li>
          <a href="#review-type-questions">
            ${match(form.reviewType.left)
              .with({ _tag: 'MissingE' }, () => translate(locale, 'write-review', 'selectHowToStart')())
              .exhaustive()}
          </a>
        </li>
      `
    : html``

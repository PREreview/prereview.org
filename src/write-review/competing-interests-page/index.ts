import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { identity, pipe } from 'fp-ts/lib/function.js'
import { StatusCodes } from 'http-status-codes'
import * as D from 'io-ts/lib/Decoder.js'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { DefaultLocale, type SupportedLocale, translate } from '../../locales/index.js'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint.js'
import { type PageResponse, RedirectResponse, StreamlinePageResponse } from '../../response.js'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewMatch,
} from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import { type NonEmptyString, NonEmptyStringC } from '../../types/string.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.js'
import { backNav, errorPrefix, errorSummary, saveAndContinueButton } from '../shared-elements.js'

export const writeReviewCompetingInterests = ({
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
          RTE.let('locale', () => DefaultLocale),
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
                .with({ method: 'POST' }, handleCompetingInterestsForm)
                .otherwise(state => RT.of(showCompetingInterestsForm(state))),
          ),
        ),
    ),
  )

const showCompetingInterestsForm = ({
  form,
  preprint,
  locale,
}: {
  form: Form
  preprint: PreprintTitle
  locale: SupportedLocale
}) =>
  competingInterestsForm(
    preprint,
    {
      competingInterests: E.right(form.competingInterests),
      competingInterestsDetails: E.right(form.competingInterestsDetails),
    },
    locale,
    form.moreAuthors,
  )

const showCompetingInterestsErrorForm =
  (preprint: PreprintTitle, moreAuthors: Form['moreAuthors'], locale: SupportedLocale) =>
  (form: CompetingInterestsForm) =>
    competingInterestsForm(preprint, form, locale, moreAuthors)

const handleCompetingInterestsForm = ({
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
    RTE.let('competingInterests', () => pipe(CompetingInterestsFieldD.decode(body), E.mapLeft(missingE))),
    RTE.let('competingInterestsDetails', ({ competingInterests }) =>
      match(competingInterests)
        .with({ right: 'yes' }, () => pipe(CompetingInterestsDetailsFieldD.decode(body), E.mapLeft(missingE)))
        .otherwise(() => E.right(undefined)),
    ),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('competingInterests', fields.competingInterests),
        E.apSW('competingInterestsDetails', fields.competingInterestsDetails),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage)
          .with({ competingInterests: P.any }, showCompetingInterestsErrorForm(preprint, form.moreAuthors, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const CompetingInterestsFieldD = pipe(
  D.struct({ competingInterests: D.literal('yes', 'no') }),
  D.map(get('competingInterests')),
)

const CompetingInterestsDetailsFieldD = pipe(
  D.struct({ competingInterestsDetails: NonEmptyStringC }),
  D.map(get('competingInterestsDetails')),
)

interface CompetingInterestsForm {
  readonly competingInterests: E.Either<MissingE, 'yes' | 'no' | undefined>
  readonly competingInterestsDetails: E.Either<MissingE, NonEmptyString | undefined>
}

function competingInterestsForm(
  preprint: PreprintTitle,
  form: CompetingInterestsForm,
  locale: SupportedLocale,
  moreAuthors?: 'yes' | 'yes-private' | 'no',
) {
  const error = hasAnError(form)
  const otherAuthors = moreAuthors !== 'no'
  const backMatch = moreAuthors === 'yes' ? writeReviewAddAuthorsMatch : writeReviewAuthorsMatch
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('write-review', 'competingInterestsTitle')({ otherAuthors, preprintTitle: preprint.title.toString() }),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(backMatch.formatter, { id: preprint.id })),
    main: html`
      <form
        method="post"
        action="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error ? pipe(form, toErrorItems(locale, otherAuthors), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.competingInterests) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              aria-describedby="competing-interests-tip"
              ${rawHtml(
                E.isLeft(form.competingInterests)
                  ? 'aria-invalid="true" aria-errormessage="competing-interests-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('write-review', 'doYouHaveCompetingInterests')({ otherAuthors })}</h1>
              </legend>

              <p id="competing-interests-tip" role="note">${t('write-review', 'whatIsCompetingInterest')()}</p>

              <details>
                <summary><span>${t('write-review', 'examples')()}</span></summary>

                <div>
                  <ul>
                    <li>${t('write-review', 'conflictAuthorOfPreprint')()}</li>
                    <li>${t('write-review', 'conflictPersonalRelationship')()}</li>
                    <li>${t('write-review', 'conflictRivalOfAuthor')()}</li>
                    <li>${t('write-review', 'conflictRecentlyWorkedTogether')()}</li>
                    <li>${t('write-review', 'conflictCollaborateWithAuthor')()}</li>
                    <li>${t('write-review', 'conflictPublishedTogether')()}</li>
                    <li>${t('write-review', 'conflictHoldGrantTogether')()}</li>
                  </ul>
                </div>
              </details>

              ${E.isLeft(form.competingInterests)
                ? html`
                    <div class="error-message" id="competing-interests-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.competingInterests.left)
                        .with({ _tag: 'MissingE' }, () =>
                          t('write-review', 'selectYesIfCompetingInterest')({ otherAuthors }),
                        )
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="competingInterests"
                      id="competing-interests-no"
                      type="radio"
                      value="no"
                      ${match(form.competingInterests)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('write-review', 'no')()}</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="competingInterests"
                      type="radio"
                      value="yes"
                      aria-controls="competing-interests-details-control"
                      ${match(form.competingInterests)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes</span>
                  </label>
                  <div class="conditional" id="competing-interests-details-control">
                    <div ${rawHtml(E.isLeft(form.competingInterestsDetails) ? 'class="error"' : '')}>
                      <label for="competing-interests-details" class="textarea"
                        >${t('write-review', 'whatAreThey')()}</label
                      >

                      ${E.isLeft(form.competingInterestsDetails)
                        ? html`
                            <div class="error-message" id="competing-interests-details-error">
                              <span class="visually-hidden">Error:</span>
                              ${match(form.competingInterestsDetails.left)
                                .with({ _tag: 'MissingE' }, () =>
                                  t('write-review', 'competingInterestDetails')({ otherAuthors }),
                                )
                                .exhaustive()}
                            </div>
                          `
                        : ''}

                      <textarea
                        name="competingInterestsDetails"
                        id="competing-interests-details"
                        rows="5"
                        ${rawHtml(
                          E.isLeft(form.competingInterestsDetails)
                            ? 'aria-invalid="true" aria-errormessage="competing-interests-details-error"'
                            : '',
                        )}
                      >
${match(form.competingInterestsDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: error ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
  })
}

const toErrorItems = (locale: SupportedLocale, otherAuthors: boolean) => (form: CompetingInterestsForm) => html`
  ${E.isLeft(form.competingInterests)
    ? html`
        <li>
          <a href="#competing-interests-no">
            ${match(form.competingInterests.left)
              .with({ _tag: 'MissingE' }, () =>
                translate(locale, 'write-review', 'selectYesIfCompetingInterest')({ otherAuthors }),
              )
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
  ${E.isLeft(form.competingInterestsDetails)
    ? html`
        <li>
          <a href="#competing-interests-details">
            ${match(form.competingInterestsDetails.left)
              .with({ _tag: 'MissingE' }, () =>
                translate(locale, 'write-review', 'competingInterestDetails')({ otherAuthors }),
              )
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`

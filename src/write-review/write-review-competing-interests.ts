import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as I from 'fp-ts/lib/Identity.js'
import { flow, identity, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form.js'
import { html, plainText, rawHtml, sendHtml } from '../html.js'
import { DefaultLocale, type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewMatch,
} from '../routes.js'
import { type NonEmptyString, NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { backNav, errorPrefix, errorSummary, saveAndContinueButton } from './shared-elements.js'

export const writeReviewCompetingInterests = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.apS('locale', RM.of(DefaultLocale)),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleCompetingInterestsForm).otherwise(showCompetingInterestsForm),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showCompetingInterestsForm = flow(
  RM.fromReaderK(
    ({ form, preprint, user, locale }: { form: Form; preprint: PreprintTitle; user: User; locale: SupportedLocale }) =>
      competingInterestsForm(
        preprint,
        {
          competingInterests: E.right(form.competingInterests),
          competingInterestsDetails: E.right(form.competingInterestsDetails),
        },
        user,
        locale,
        form.moreAuthors,
      ),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCompetingInterestsErrorForm = (
  preprint: PreprintTitle,
  user: User,
  moreAuthors: Form['moreAuthors'],
  locale: SupportedLocale,
) =>
  flow(
    RM.fromReaderK((form: CompetingInterestsForm) => competingInterestsForm(preprint, form, user, locale, moreAuthors)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleCompetingInterestsForm = ({
  form,
  preprint,
  user,
  locale,
}: {
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RM.decodeBody(E.right),
    RM.map(body =>
      pipe(
        I.Do,
        I.let('competingInterests', () => pipe(CompetingInterestsFieldD.decode(body), E.mapLeft(missingE))),
        I.let('competingInterestsDetails', ({ competingInterests }) =>
          match(competingInterests)
            .with({ right: 'yes' }, () => pipe(CompetingInterestsDetailsFieldD.decode(body), E.mapLeft(missingE)))
            .otherwise(() => E.right(undefined)),
        ),
      ),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('competingInterests', fields.competingInterests),
        E.apSW('competingInterestsDetails', fields.competingInterestsDetails),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ competingInterests: P.any }, showCompetingInterestsErrorForm(preprint, user, form.moreAuthors, locale))
        .exhaustive(),
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
  user: User,
  locale: SupportedLocale,
  moreAuthors?: 'yes' | 'yes-private' | 'no',
) {
  const error = hasAnError(form)
  const otherAuthors = moreAuthors !== 'no'
  const backMatch = moreAuthors === 'yes' ? writeReviewAddAuthorsMatch : writeReviewAuthorsMatch
  const t = translate(locale)

  return templatePage({
    title: pipe(
      t('write-review', 'competingInterestsTitle')({ otherAuthors, preprintTitle: preprint.title.toString() }),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>${backNav(locale, format(backMatch.formatter, { id: preprint.id }))}</nav>

      <main id="form">
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
                      <li>${t('write-review', 'exampleAuthorOfPreprint')()}</li>
                      <li>${t('write-review', 'examplePersonalRelationship')()}</li>
                      <li>${t('write-review', 'exampleRivalOfAuthor')()}</li>
                      <li>${t('write-review', 'exampleRecentlyWorkedTogether')()}</li>
                      <li>${t('write-review', 'exampleCollaborateWithAuthor')()}</li>
                      <li>${t('write-review', 'examplePublishedTogether')()}</li>
                      <li>${t('write-review', 'exampleHoldGrandTogether')()}</li>
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
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
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

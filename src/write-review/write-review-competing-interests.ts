import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as I from 'fp-ts/Identity'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { writeReviewAuthorsMatch, writeReviewCompetingInterestsMatch, writeReviewMatch } from '../routes'
import { type NonEmptyString, NonEmptyStringC } from '../types/string'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewCompetingInterests = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
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
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    competingInterestsForm(
      preprint,
      {
        competingInterests: E.right(form.competingInterests),
        competingInterestsDetails: E.right(form.competingInterestsDetails),
      },
      user,
      form.moreAuthors !== 'no',
    ),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCompetingInterestsErrorForm = (preprint: PreprintTitle, user: User, otherAuthors: boolean) =>
  flow(
    RM.fromReaderK((form: CompetingInterestsForm) => competingInterestsForm(preprint, form, user, otherAuthors)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleCompetingInterestsForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
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
        .with({ competingInterests: P.any }, showCompetingInterestsErrorForm(preprint, user, form.moreAuthors !== 'no'))
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
  otherAuthors: boolean,
) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Do you${
      otherAuthors ? ', or any of the other authors,' : ''
    } have any competing interests? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.competingInterests)
                      ? html`
                          <li>
                            <a href="#competing-interests-no">
                              ${match(form.competingInterests.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () =>
                                    `Select yes if you${
                                      otherAuthors ? ', or any of the other authors,' : ''
                                    } have any competing interests`,
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
                                .with(
                                  { _tag: 'MissingE' },
                                  () => `Enter details of ${otherAuthors ? 'the' : 'your'} competing interests`,
                                )
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

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
                  <h1>Do you${otherAuthors ? ', or any of the other authors,' : ''} have any competing interests?</h1>
                </legend>

                <p id="competing-interests-tip" role="note">
                  A competing interest is anything that could interfere with the objective of a PREreview.
                </p>

                <details>
                  <summary><span>Examples</span></summary>

                  <div>
                    <ul>
                      <li>You are the author of the preprint.</li>
                      <li>You have a personal relationship with the author.</li>
                      <li>You are a rival or competitor of the author.</li>
                      <li>You have recently worked with the author.</li>
                      <li>You collaborate with the author.</li>
                      <li>You have published with the author in the last five years.</li>
                      <li>You hold a grant with the author.</li>
                    </ul>
                  </div>
                </details>

                ${E.isLeft(form.competingInterests)
                  ? html`
                      <div class="error-message" id="competing-interests-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.competingInterests.left)
                          .with(
                            { _tag: 'MissingE' },
                            () =>
                              `Select yes if you${
                                otherAuthors ? ', or any of the other authors,' : ''
                              } have any competing interests`,
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
                      <span>No</span>
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
                        <label for="competing-interests-details" class="textarea">What are they?</label>

                        ${E.isLeft(form.competingInterestsDetails)
                          ? html`
                              <div class="error-message" id="competing-interests-details-error">
                                <span class="visually-hidden">Error:</span>
                                ${match(form.competingInterestsDetails.left)
                                  .with(
                                    { _tag: 'MissingE' },
                                    () => `Enter details of ${otherAuthors ? 'the' : 'your'} competing interests`,
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

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

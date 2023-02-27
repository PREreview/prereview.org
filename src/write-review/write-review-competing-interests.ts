import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as I from 'fp-ts/Identity'
import { Reader } from 'fp-ts/Reader'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { writeReviewAuthorsMatch, writeReviewCompetingInterestsMatch, writeReviewMatch } from '../routes'
import { NonEmptyString, NonEmptyStringC } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewCompetingInterests = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.doi)),
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
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
          )
          .with('form-unavailable', 'session-unavailable', () => serviceUnavailable)
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
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    competingInterestsForm(preprint, {
      competingInterests: E.right(form.competingInterests),
      competingInterestsDetails: E.right(form.competingInterestsDetails),
    }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCompetingInterestsErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: CompetingInterestsForm) => competingInterestsForm(preprint, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleCompetingInterestsForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
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
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.doi)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ competingInterests: P.any }, showCompetingInterestsErrorForm(preprint))
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

type CompetingInterestsForm = {
  readonly competingInterests: E.Either<MissingE, 'yes' | 'no' | undefined>
  readonly competingInterestsDetails: E.Either<MissingE, NonEmptyString | undefined>
}

function competingInterestsForm(preprint: Preprint, form: CompetingInterestsForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Do you have any competing interests? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewCompetingInterestsMatch.formatter, { doi: preprint.doi })}"
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
                                .with({ _tag: 'MissingE' }, () => 'Select yes if you have any competing interests')
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
                                .with({ _tag: 'MissingE' }, () => 'Enter details of your competing interests')
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
                  <h1>Do you have any competing interests?</h1>
                </legend>

                <div id="competing-interests-tip" role="note">
                  A competing interest is anything that could interfere with the objective of a PREreview.
                </div>

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
                          .with({ _tag: 'MissingE' }, () => 'Select yes if you have any competing interests')
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
                                  .with({ _tag: 'MissingE' }, () => 'Enter details of your competing interests')
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
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

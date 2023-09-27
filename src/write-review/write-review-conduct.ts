import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  codeOfConductMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewConduct = flow(
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
        match(state).with({ method: 'POST' }, handleCodeOfConductForm).otherwise(showCodeOfConductForm),
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

const showCodeOfConductForm = flow(
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    codeOfConductForm(preprint, { conduct: E.right(form.conduct) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCodeOfConductErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: CodeOfConductForm) => codeOfConductForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleCodeOfConductForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(body => E.right({ conduct: pipe(ConductFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('conduct', fields.conduct),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ conduct: P.any }, showCodeOfConductErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const ConductFieldD = pipe(
  D.struct({
    conduct: D.literal('yes'),
  }),
  D.map(get('conduct')),
)

interface CodeOfConductForm {
  readonly conduct: E.Either<MissingE, 'yes' | undefined>
}

function codeOfConductForm(preprint: PreprintTitle, form: CodeOfConductForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Code of Conduct – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.conduct)
                      ? html`
                          <li>
                            <a href="#conduct-yes">
                              ${match(form.conduct.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => html`Confirm that you are following the Code&nbsp;of&nbsp;Conduct`,
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

          <div ${rawHtml(E.isLeft(form.conduct) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              aria-describedby="conduct-tip"
              ${rawHtml(E.isLeft(form.conduct) ? 'aria-invalid="true" aria-errormessage="conduct-error"' : '')}
            >
              <legend>
                <h1>Code of Conduct</h1>
              </legend>

              <p id="conduct-tip" role="note">
                As a member of our community, we expect you to abide by the
                <a href="${format(codeOfConductMatch.formatter, {})}">PREreview Code&nbsp;of&nbsp;Conduct</a>.
              </p>

              <details>
                <summary><span>Examples of expected behaviors</span></summary>

                <div>
                  <ul>
                    <li>Using welcoming and inclusive language.</li>
                    <li>Providing feedback that is constructive, i.e. useful, to the receiver.</li>
                    <li>Being respectful of differing viewpoints and experiences.</li>
                    <li>Gracefully accepting constructive criticism.</li>
                    <li>Focusing on what is best for the community.</li>
                    <li>Showing empathy towards other community members.</li>
                  </ul>
                </div>
              </details>

              <details>
                <summary><span>Examples of unacceptable behaviors</span></summary>

                <div>
                  <ul>
                    <li>Trolling, insulting or derogatory comments, and personal or political attacks.</li>
                    <li>Providing unconstructive or disruptive feedback on PREreview.</li>
                    <li>Public or private harassment.</li>
                    <li>
                      Publishing others’ confidential information, such as a physical or electronic address, without
                      explicit permission.
                    </li>
                    <li>Use of sexualized language or imagery and unwelcome sexual attention or advances.</li>
                    <li>Other conduct which could reasonably be considered inappropriate in a professional setting.</li>
                  </ul>
                </div>
              </details>

              ${E.isLeft(form.conduct)
                ? html`
                    <div class="error-message" id="conduct-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.conduct.left)
                        .with(
                          { _tag: 'MissingE' },
                          () => html`Confirm that you are following the Code&nbsp;of&nbsp;Conduct`,
                        )
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <label>
                <input
                  name="conduct"
                  id="conduct-yes"
                  type="checkbox"
                  value="yes"
                  ${match(form.conduct)
                    .with({ right: 'yes' }, () => 'checked')
                    .otherwise(() => '')}
                />
                <span>I’m following the Code&nbsp;of&nbsp;Conduct</span>
              </label>
            </fieldset>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

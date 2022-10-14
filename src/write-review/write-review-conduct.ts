import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { writeReviewCompetingInterestsMatch, writeReviewConductMatch, writeReviewMatch } from '../routes'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewConduct = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleCodeOfConductForm).otherwise(showCodeOfConductForm),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
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
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    codeOfConductForm(preprint, { conduct: E.right(form.conduct) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCodeOfConductErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: CodeOfConductForm) => codeOfConductForm(preprint, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleCodeOfConductForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
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
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
    RM.orElseW(showCodeOfConductErrorForm(preprint)),
  )

const ConductFieldD = pipe(
  D.struct({
    conduct: D.literal('yes'),
  }),
  D.map(get('conduct')),
)

type CodeOfConductForm = {
  readonly conduct: E.Either<MissingE, 'yes' | undefined>
}

function codeOfConductForm(preprint: Preprint, form: CodeOfConductForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Code of Conduct – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewCompetingInterestsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewConductMatch.formatter, { doi: preprint.doi })}" novalidate>
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

              <div id="conduct-tip" role="note">
                As a member of our community, we expect you to abide by the
                <a href="https://content.prereview.org/coc/">PREreview Code&nbsp;of&nbsp;Conduct</a>.
              </div>

              <details>
                <summary>Examples of expected behaviors</summary>

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
                <summary>Examples of unacceptable behaviors</summary>

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
                    .with(E.right('yes' as const), () => 'checked')
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
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

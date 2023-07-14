import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { type CanRapidReviewEnv, canRapidReview } from '../feature-flags'
import { html, plainText, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewAlreadyWrittenMatch,
  writeReviewIntroductionMatchesMatch,
  writeReviewMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { getForm, redirectToNextForm } from './form'

export const writeReviewIntroductionMatches = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.bindW(
        'canRapidReview',
        flow(
          fromReaderK(({ user }) => canRapidReview(user)),
          RM.filterOrElse(
            canRapidReview => canRapidReview,
            () => 'not-found' as const,
          ),
        ),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .returnType<
            RM.ReaderMiddleware<CanRapidReviewEnv & FathomEnv & PhaseEnv, StatusOpen, ResponseEnded, never, void>
          >()
          .with(
            { form: { alreadyWritten: P.optional('yes') } },
            fromMiddlewareK(() => seeOther(format(writeReviewAlreadyWrittenMatch.formatter, { id: preprint.id }))),
          )
          .with(
            { form: { reviewType: P.optional('freeform') } },
            fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST' }, ({ form, user }) => redirectToNextForm(preprint.id)(form, user))
          .otherwise(showIntroductionMatchesForm),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('not-found', () => notFound)
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

const showIntroductionMatchesForm = flow(
  fromReaderK(({ preprint, user }: { preprint: PreprintTitle; user: User }) => introductionMatchesForm(preprint, user)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

function introductionMatchesForm(preprint: PreprintTitle, user: User) {
  return page({
    title: plainText`Does the introduction explain the objective and match the rest of the preprint?
 – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          <fieldset role="group">
            <legend>
              <h1>Does the introduction explain the objective and match the rest of the preprint?</h1>
            </legend>

            <ol>
              <li>
                <label>
                  <input
                    name="introduction-matches"
                    type="radio"
                    value="yes"
                    aria-describedby="introduction-matches-tip-yes"
                  />
                  <span>Yes</span>
                </label>
                <p id="introduction-matches-tip-yes" role="note">
                  The aim is clearly explained, and it matches up with what follows.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="introduction-matches"
                    type="radio"
                    value="partly"
                    aria-describedby="introduction-matches-tip-partly"
                  />
                  <span>Partly</span>
                </label>
                <p id="introduction-matches-tip-partly" role="note">
                  The introduction either doesn’t adequately explain the aim of the research, or the rest of the
                  preprint doesn’t match up with the introduction.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="introduction-matches"
                    type="radio"
                    value="no"
                    aria-describedby="introduction-matches-tip-no"
                  />
                  <span>No</span>
                </label>
                <p id="introduction-matches-tip-no" role="note">
                  The introduction doesn’t explain the aim of the research or match up with what follows.
                </p>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input name="introduction-matches" type="radio" value="skip" />
                  <span>I don’t know</span>
                </label>
              </li>
            </ol>
          </fieldset>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
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

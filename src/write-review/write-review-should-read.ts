import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import { type MissingE, missingE } from '../form'
import { hasAnError } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewLanguageEditingMatch,
  writeReviewMatch,
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewShouldRead = flow(
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
          .with(
            { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
            fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST' }, handleShouldReadForm)
          .otherwise(showShouldReadForm),
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

const showShouldReadForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    shouldReadForm(preprint, { shouldRead: E.right(form.shouldRead) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showShouldReadErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: ShouldReadForm) => shouldReadForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleShouldReadForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(body => E.right({ shouldRead: pipe(ShouldReadFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('shouldRead', fields.shouldRead),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ shouldRead: P.any }, showShouldReadErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const ShouldReadFieldD = pipe(
  D.struct({
    shouldRead: D.literal('no', 'yes-but', 'yes'),
  }),
  D.map(get('shouldRead')),
)

type ShouldReadForm = {
  readonly shouldRead: E.Either<MissingE, 'no' | 'yes-but' | 'yes' | undefined>
}

function shouldReadForm(preprint: PreprintTitle, form: ShouldReadForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Should others read this preprint? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.shouldRead)
                      ? html`
                          <li>
                            <a href="#should-read-yes">
                              ${match(form.shouldRead.left)
                                .with({ _tag: 'MissingE' }, () => 'Select yes if others should read this preprint')
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.shouldRead) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(E.isLeft(form.shouldRead) ? 'aria-invalid="true" aria-errormessage="should-read-error"' : '')}
            >
              <legend>
                <h1>Should others read this preprint?</h1>
              </legend>

              ${E.isLeft(form.shouldRead)
                ? html`
                    <div class="error-message" id="should-read-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.shouldRead.left)
                        .with({ _tag: 'MissingE' }, () => 'Select yes if others should read this preprint')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="shouldRead"
                      id="should-read-yes"
                      type="radio"
                      value="yes"
                      ${match(form.shouldRead)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes, it’s of high quality</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="shouldRead"
                      type="radio"
                      value="yes-but"
                      ${match(form.shouldRead)
                        .with({ right: 'yes-but' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes, but it needs to be improved</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="shouldRead"
                      type="radio"
                      value="no"
                      ${match(form.shouldRead)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>No, it’s of low quality or is majorly flawed</span>
                  </label>
                </li>
              </ol>
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

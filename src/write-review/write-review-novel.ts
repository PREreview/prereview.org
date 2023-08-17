import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import { type FieldDecoders, type Fields, type ValidFields, decodeFields, hasAnError, requiredDecoder } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewFindingsNextStepsMatch,
  writeReviewMatch,
  writeReviewNovelMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewNovel = flow(
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
          .with({ method: 'POST' }, handleNovelForm)
          .otherwise(showNovelForm),
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

const showNovelForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    novelForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showNovelErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: NovelForm) => novelForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleNovelForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(novelFields)),
    RM.map(updateFormWithFields(form)),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ novel: P.any }, showNovelErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const novelFields = {
  novel: requiredDecoder(D.literal('no', 'limited', 'some', 'substantial', 'highly', 'skip')),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof novelFields>> = {
  encode: fields => ({
    novel: fields.novel,
  }),
}

const FormToFieldsE: Encoder<NovelForm, Form> = {
  encode: form => ({
    novel: E.right(form.novel),
  }),
}

type NovelForm = Fields<typeof novelFields>

function novelForm(preprint: PreprintTitle, form: NovelForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Are the findings novel?
 – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.novel)
                      ? html`
                          <li>
                            <a href="#novel-no">
                              ${match(form.novel.left)
                                .with({ _tag: 'MissingE' }, () => 'Select if the findings are novel')
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.novel) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(E.isLeft(form.novel) ? 'aria-invalid="true" aria-errormessage="novel-error"' : '')}
            >
              <legend>
                <h1>Are the findings novel?</h1>
              </legend>

              ${E.isLeft(form.novel)
                ? html`
                    <div class="error-message" id="novel-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.novel.left)
                        .with({ _tag: 'MissingE' }, () => 'Select if the findings are novel')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="novel"
                      id="novel-no"
                      type="radio"
                      value="no"
                      aria-describedby="novel-tip-no"
                      ${match(form.novel)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Not at all</span>
                  </label>
                  <p id="novel-tip-no" role="note">
                    They lack novelty and fail to introduce new insights or advance the existing knowledge in the field.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="limited"
                      aria-describedby="novel-tip-limited"
                      ${match(form.novel)
                        .with({ right: 'limited' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Limited novelty</span>
                  </label>
                  <p id="novel-tip-limited" role="note">
                    They offer only marginal advancements compared to previous research and provide limited new
                    perspectives or ideas.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="some"
                      aria-describedby="novel-tip-some"
                      ${match(form.novel)
                        .with({ right: 'some' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Some novelty</span>
                  </label>
                  <p id="novel-tip-some" role="note">
                    They present a moderate level of novelty, introducing a few new aspects or perspectives that
                    contribute to the existing body of knowledge.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="substantial"
                      aria-describedby="novel-tip-substantial"
                      ${match(form.novel)
                        .with({ right: 'substantial' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Substantial novelty</span>
                  </label>
                  <p id="novel-tip-substantial" role="note">
                    They exhibit significant novelty and contribute noteworthy advancements or novel insights compared
                    to prior research.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="highly"
                      aria-describedby="novel-tip-highly"
                      ${match(form.novel)
                        .with({ right: 'highly' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Highly novel</span>
                  </label>
                  <p id="novel-tip-highly" role="note">
                    They are highly innovative, representing groundbreaking contributions that substantially advance the
                    understanding of the subject matter or introduce entirely new concepts.
                  </p>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="skip"
                      ${match(form.novel)
                        .with({ right: 'skip' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>I don’t know</span>
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

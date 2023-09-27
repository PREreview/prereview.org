import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import { P, match } from 'ts-pattern'
import {
  type FieldDecoders,
  type Fields,
  type ValidFields,
  decodeFields,
  hasAnError,
  optionalDecoder,
  requiredDecoder,
} from '../form'
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
import { NonEmptyStringC } from '../string'
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
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with(
            { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
            RM.fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST' }, handleShouldReadForm)
          .otherwise(showShouldReadForm),
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

const showShouldReadForm = flow(
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    shouldReadForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showShouldReadErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: ShouldReadForm) => shouldReadForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleShouldReadForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(shouldReadFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ shouldRead: P.any }, showShouldReadErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const shouldReadFields = {
  shouldRead: requiredDecoder(D.literal('no', 'yes-but', 'yes')),
  shouldReadNoDetails: optionalDecoder(NonEmptyStringC),
  shouldReadYesButDetails: optionalDecoder(NonEmptyStringC),
  shouldReadYesDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof shouldReadFields>> = {
  encode: fields => ({
    shouldRead: fields.shouldRead,
    shouldReadDetails: {
      no: fields.shouldReadNoDetails,
      'yes-but': fields.shouldReadYesButDetails,
      yes: fields.shouldReadYesDetails,
    },
  }),
}

const FormToFieldsE: Encoder<ShouldReadForm, Form> = {
  encode: form => ({
    shouldRead: E.right(form.shouldRead),
    shouldReadNoDetails: E.right(form.shouldReadDetails?.no),
    shouldReadYesButDetails: E.right(form.shouldReadDetails?.['yes-but']),
    shouldReadYesDetails: E.right(form.shouldReadDetails?.yes),
  }),
}

type ShouldReadForm = Fields<typeof shouldReadFields>

function shouldReadForm(preprint: PreprintTitle, form: ShouldReadForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Would you recommend this preprint to others? – PREreview of “${
      preprint.title
    }”`,
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
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select yes if you would recommend this preprint to others',
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

          <div ${rawHtml(E.isLeft(form.shouldRead) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(E.isLeft(form.shouldRead) ? 'aria-invalid="true" aria-errormessage="should-read-error"' : '')}
              >
                <legend>
                  <h1>Would you recommend this preprint to others?</h1>
                </legend>

                ${E.isLeft(form.shouldRead)
                  ? html`
                      <div class="error-message" id="should-read-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.shouldRead.left)
                          .with({ _tag: 'MissingE' }, () => 'Select yes if you would recommend this preprint to others')
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
                        aria-controls="should-read-yes-control"
                        ${match(form.shouldRead)
                          .with({ right: 'yes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Yes, it’s of high quality</span>
                    </label>
                    <div class="conditional" id="should-read-yes-control">
                      <div>
                        <label for="should-read-yes-details" class="textarea"
                          >How is it of high quality? (optional)</label
                        >

                        <textarea name="shouldReadYesDetails" id="should-read-yes-details" rows="5">
${match(form.shouldReadYesDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="shouldRead"
                        type="radio"
                        value="yes-but"
                        aria-controls="should-read-yes-but-control"
                        ${match(form.shouldRead)
                          .with({ right: 'yes-but' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Yes, but it needs to be improved</span>
                    </label>
                    <div class="conditional" id="should-read-yes-but-control">
                      <div>
                        <label for="should-read-yes-but-details" class="textarea"
                          >What needs to be improved? (optional)</label
                        >

                        <textarea name="shouldReadYesButDetails" id="should-read-yes-but-details" rows="5">
${match(form.shouldReadYesButDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="shouldRead"
                        type="radio"
                        value="no"
                        aria-controls="should-read-no-control"
                        ${match(form.shouldRead)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>No, it’s of low quality or is majorly flawed</span>
                    </label>
                    <div class="conditional" id="should-read-no-control">
                      <div>
                        <label for="should-read-no-details" class="textarea"
                          >Why wouldn’t you recommend it? (optional)</label
                        >

                        <textarea name="shouldReadNoDetails" id="should-read-no-details" rows="5">
${match(form.shouldReadNoDetails)
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

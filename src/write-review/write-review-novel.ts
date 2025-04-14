import { flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import { P, match } from 'ts-pattern'
import {
  type FieldDecoders,
  type Fields,
  type ValidFields,
  decodeFields,
  hasAnError,
  optionalDecoder,
  requiredDecoder,
} from '../form.js'
import { html, plainText, rawHtml, sendHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  writeReviewFindingsNextStepsMatch,
  writeReviewMatch,
  writeReviewNovelMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewNovel = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.apSW(
        'locale',
        RM.asks((env: { locale: SupportedLocale }) => env.locale),
      ),
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
          .with({ method: 'POST' }, handleNovelForm)
          .otherwise(showNovelForm),
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
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showNovelForm = flow(
  RM.fromReaderK(
    ({ form, locale, preprint, user }: { form: Form; locale: SupportedLocale; preprint: PreprintTitle; user: User }) =>
      novelForm(preprint, FormToFieldsE.encode(form), user, locale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showNovelErrorForm = (preprint: PreprintTitle, user: User, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: NovelForm) => novelForm(preprint, form, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleNovelForm = ({
  form,
  locale,
  preprint,
  user,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.decodeBody(decodeFields(novelFields)),
    RM.map(updateFormWithFields(form)),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ novel: P.any }, showNovelErrorForm(preprint, user, locale))
        .exhaustive(),
    ),
  )

const novelFields = {
  novel: requiredDecoder(D.literal('no', 'limited', 'some', 'substantial', 'highly', 'skip')),
  novelNoDetails: optionalDecoder(NonEmptyStringC),
  novelLimitedDetails: optionalDecoder(NonEmptyStringC),
  novelSomeDetails: optionalDecoder(NonEmptyStringC),
  novelSubstantialDetails: optionalDecoder(NonEmptyStringC),
  novelHighlyDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof novelFields>> = {
  encode: fields => ({
    novel: fields.novel,
    novelDetails: {
      no: fields.novelNoDetails,
      limited: fields.novelLimitedDetails,
      some: fields.novelSomeDetails,
      substantial: fields.novelSubstantialDetails,
      highly: fields.novelHighlyDetails,
    },
  }),
}

const FormToFieldsE: Encoder<NovelForm, Form> = {
  encode: form => ({
    novel: E.right(form.novel),
    novelNoDetails: E.right(form.novelDetails?.no),
    novelLimitedDetails: E.right(form.novelDetails?.limited),
    novelSomeDetails: E.right(form.novelDetails?.some),
    novelSubstantialDetails: E.right(form.novelDetails?.substantial),
    novelHighlyDetails: E.right(form.novelDetails?.highly),
  }),
}

type NovelForm = Fields<typeof novelFields>

function novelForm(preprint: PreprintTitle, form: NovelForm, user: User, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return templatePage({
    title: pipe(
      t('advanceKnowledge')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>
        <a href="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}" class="back"
          ><span>${t('backNav')()}</span></a
        >
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${t('thereIsAProblem')()}</h2>
                  <ul>
                    ${E.isLeft(form.novel)
                      ? html`
                          <li>
                            <a href="#novel-highly">
                              ${match(form.novel.left)
                                .with({ _tag: 'MissingE' }, () => t('selectAdvanceKnowledge')())
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
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(E.isLeft(form.novel) ? 'aria-invalid="true" aria-errormessage="novel-error"' : '')}
              >
                <legend>
                  <h1>${t('advanceKnowledge')()}</h1>
                </legend>

                ${E.isLeft(form.novel)
                  ? html`
                      <div class="error-message" id="novel-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.novel.left)
                          .with({ _tag: 'MissingE' }, () => t('selectAdvanceKnowledge')())
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="novel"
                        id="novel-highly"
                        type="radio"
                        value="highly"
                        aria-describedby="novel-tip-highly"
                        aria-controls="novel-highly-control"
                        ${match(form.novel)
                          .with({ right: 'highly' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('advanceKnowledgeHighlyLikely')()}</span>
                    </label>
                    <p id="novel-tip-highly" role="note">${t('advanceKnowledgeHighlyLikelyTip')()}</p>
                    <div class="conditional" id="novel-highly-control">
                      <div>
                        <label for="novel-highly-details" class="textarea"
                          >${t('advanceKnowledgeHighlyLikelyWhy')()}</label
                        >

                        <textarea name="novelHighlyDetails" id="novel-highly-details" rows="5">
${match(form.novelHighlyDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="novel"
                        type="radio"
                        value="substantial"
                        aria-describedby="novel-tip-substantial"
                        aria-controls="novel-substantial-control"
                        ${match(form.novel)
                          .with({ right: 'substantial' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('advanceKnowledgeSomewhatLikely')()}</span>
                    </label>
                    <p id="novel-tip-substantial" role="note">${t('advanceKnowledgeSomewhatLikelyTip')()}</p>
                    <div class="conditional" id="novel-substantial-control">
                      <div>
                        <label for="novel-substantial-details" class="textarea"
                          >${t('advanceKnowledgeSomewhatLikelyWhy')()}</label
                        >

                        <textarea name="novelSubstantialDetails" id="novel-substantial-details" rows="5">
${match(form.novelSubstantialDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="novel"
                        type="radio"
                        value="some"
                        aria-describedby="novel-tip-some"
                        aria-controls="novel-some-control"
                        ${match(form.novel)
                          .with({ right: 'some' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('advanceKnowledgeModeratelyLikely')()}</span>
                    </label>
                    <p id="novel-tip-some" role="note">${t('advanceKnowledgeModeratelyLikelyTip')()}</p>
                    <div class="conditional" id="novel-some-control">
                      <div>
                        <label for="novel-some-details" class="textarea"
                          >${t('advanceKnowledgeModeratelyLikelyWhy')()}</label
                        >

                        <textarea name="novelSomeDetails" id="novel-some-details" rows="5">
${match(form.novelSomeDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="novel"
                        type="radio"
                        value="limited"
                        aria-describedby="novel-tip-limited"
                        aria-controls="novel-limited-control"
                        ${match(form.novel)
                          .with({ right: 'limited' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('advanceKnowledgeNotLikely')()}</span>
                    </label>
                    <p id="novel-tip-limited" role="note">${t('advanceKnowledgeNotLikelyTip')()}</p>
                    <div class="conditional" id="novel-limited-control">
                      <div>
                        <label for="novel-limited-details" class="textarea"
                          >${t('advanceKnowledgeNotLikelyWhy')()}</label
                        >

                        <textarea name="novelLimitedDetails" id="novel-limited-details" rows="5">
${match(form.novelLimitedDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="novel"
                        type="radio"
                        value="no"
                        aria-describedby="novel-tip-no"
                        aria-controls="novel-no-control"
                        ${match(form.novel)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('advanceKnowledgeNotAtAllLikely')()}</span>
                    </label>
                    <p id="novel-tip-no" role="note">${t('advanceKnowledgeNotAtAllLikelyTip')()}</p>
                    <div class="conditional" id="novel-no-control">
                      <div>
                        <label for="novel-no-details" class="textarea"
                          >${t('advanceKnowledgeNotAtAllLikelyWhy')()}</label
                        >

                        <textarea name="novelNoDetails" id="novel-no-details" rows="5">
${match(form.novelNoDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <span>${t('or')()}</span>
                    <label>
                      <input
                        name="novel"
                        type="radio"
                        value="skip"
                        ${match(form.novel)
                          .with({ right: 'skip' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('iDoNotKnow')()}</span>
                    </label>
                  </li>
                </ol>
              </fieldset>
            </conditional-inputs>
          </div>

          <button>${t('saveAndContinueButton')()}</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    locale,
    user,
  })
}

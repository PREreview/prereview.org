import { Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { NonEmptyString, Uuid } from '../../types/index.js'
import type { User } from '../../user.js'

export const CheckPage = ({
  competingInterests,
  feedback,
  feedbackId,
  locale,
  persona,
  user,
}: {
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  feedback: Html
  feedbackId: Uuid.Uuid
  locale: SupportedLocale
  persona: 'public' | 'pseudonym'
  user: User
}) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-feedback-flow', 'checkTitle')()),
    nav: html` <a href="${Routes.WriteFeedbackCodeOfConduct.href({ feedbackId })}" class="back"
      >${translate(locale, 'write-feedback-flow', 'back')()}</a
    >`,
    main: html`
      <single-use-form>
        <form method="post" action="${Routes.WriteFeedbackCheck.href({ feedbackId })}" novalidate>
          <h1>${translate(locale, 'write-feedback-flow', 'checkTitle')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${translate(locale, 'write-feedback-flow', 'checkYourDetailsHeading')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>${translate(locale, 'write-feedback-flow', 'publishedNameHeading')()}</dt>
                <dd>
                  ${pipe(
                    Match.value(persona),
                    Match.when(
                      'public',
                      () =>
                        html` <a
                          href="${format(Routes.profileMatch.formatter, {
                            profile: { type: 'orcid', value: user.orcid },
                          })}"
                          class="orcid"
                          >${user.name}</a
                        >`,
                    ),
                    Match.when(
                      'pseudonym',
                      () =>
                        html` <a
                          href="${format(Routes.profileMatch.formatter, {
                            profile: { type: 'pseudonym', value: user.pseudonym },
                          })}"
                          >${user.pseudonym}</a
                        >`,
                    ),
                    Match.exhaustive,
                  )}
                </dd>
                <dd>
                  <a href="${Routes.WriteFeedbackChoosePersona.href({ feedbackId })}"
                    >${rawHtml(
                      translate(
                        locale,
                        'write-feedback-flow',
                        'changeName',
                      )({ visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                    )}</a
                  >
                </dd>
              </div>
              <div>
                <dt>${translate(locale, 'write-feedback-flow', 'competingInterestsHeading')()}</dt>
                <dd>
                  ${Option.getOrElse(competingInterests, () =>
                    translate(locale, 'write-feedback-flow', 'noCompetingInterests')(),
                  )}
                </dd>
                <dd>
                  <a href="${Routes.WriteFeedbackCompetingInterests.href({ feedbackId })}"
                    >${rawHtml(
                      translate(
                        locale,
                        'write-feedback-flow',
                        'changeCompetingInterests',
                      )({ visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                    )}</a
                  >
                </dd>
              </div>
            </dl>
          </div>
          <div class="summary-card">
            <div>
              <h2 id="feedback-label">${translate(locale, 'write-feedback-flow', 'checkYourFeedbackHeading')()}</h2>

              <a href="${Routes.WriteFeedbackEnterFeedback.href({ feedbackId })}"
                >${rawHtml(
                  translate(
                    locale,
                    'write-feedback-flow',
                    'changeFeedback',
                  )({ visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                )}</a
              >
            </div>

            <div aria-labelledby="feedback-label" role="region" tabindex="0">${fixHeadingLevels(2, feedback)}</div>
          </div>

          <h2>${translate(locale, 'write-feedback-flow', 'nowPublishHeading')()}</h2>

          <p>
            ${rawHtml(
              translate(
                locale,
                'write-feedback-flow',
                'nowPublishMessage',
              )({
                license: text => html`<a href="https://creativecommons.org/licenses/by/4.0/">${text}</a>`.toString(),
              }),
            )}
          </p>

          <button>${translate(locale, 'write-feedback-flow', 'publishButton')()}</button>
        </form>
      </single-use-form>
    `,
    canonical: Routes.WriteFeedbackCheck.href({ feedbackId }),
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })

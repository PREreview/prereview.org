import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { templatePage } from '../../page.js'
import type { PreprintTitle } from '../../preprint.js'
import { preprintReviewsMatch } from '../../routes.js'
import { isScietyPreprint, scietyUrl } from '../../sciety.js'
import type { User } from '../../user.js'
import type { PublishedReview } from '../published-review.js'

export const publishedPage = ({
  review: { doi, form },
  preprint,
  url,
  user,
  locale,
}: {
  review: PublishedReview
  preprint: PreprintTitle
  url: URL
  user: User
  locale: SupportedLocale
}) => {
  const t = translate(locale)
  const opensInNewTab = t('write-review', 'opensInNewTab')()
  const communitySlackLink = html`<a href="https://bit.ly/PREreview-Slack" target="_blank" rel="noopener noreferrer"
    >${t('write-review', 'communitySlack')()}<span class="visually-hidden"> (${opensInNewTab})</span></a
  >`.toString()
  const scietyLink = html`<a href="https://sciety.org/" target="_blank" rel="noopener noreferrer"
    >Sciety<span class="visually-hidden"> (${opensInNewTab})</span></a
  >`.toString()
  const mailtoHelp = html`<a href="mailto:help@prereview.org" target="_blank" rel="noopener noreferrer"
    >help@prereview.org<span class="visually-hidden"> (${opensInNewTab})</span></a
  >`.toString()

  return templatePage({
    title: plainText(t('write-review', 'prereviewPublishedTitle')()),
    content: html`
      <main id="main-content">
        <div class="panel">
          <h1>${t('write-review', 'prereviewPublishedTitle')()}</h1>

          <div>
            ${t('write-review', 'yourDoi')()} <br />
            <strong class="doi" translate="no">${doi}</strong>
          </div>
        </div>

        <h2>${t('write-review', 'whatHappensNext')()}</h2>

        <p>
          ${rawHtml(
            t(
              'write-review',
              'whereYouCanSeeYourPrereview',
            )({ communitySlackLink, scietyLink, isScietyPreprint: isScietyPreprint(preprint.id) }),
          )}
        </p>

        ${form.moreAuthors === 'yes' && form.otherAuthors.length === 0
          ? html`
              <div class="inset">
                <p>${t('write-review', 'letUsKnowAuthorDetails')({ mailtoHelp })}</p>
              </div>
            `
          : form.moreAuthors === 'yes' && form.otherAuthors.length > 0
            ? html`<p>${t('write-review', 'sentEmailsToAuthors')()}</p> `
            : ''}

        <h2>${t('write-review', 'shareYourReview')()}</h2>

        <p>${t('write-review', 'letCommunityKnow')()}</p>

        <div class="button-group" role="group">
          <a
            href="https://twitter.com/intent/tweet/?${new URLSearchParams({
              text: plainText`I’ve just published a review of “${preprint.title}”`.toString(),
              hashtags: 'PreprintReview',
              via: 'PREreview_',
              url: url.href,
            }).toString()}"
            target="_blank"
            rel="noopener noreferrer"
            class="twitter"
            >${t('write-review', 'writeATweet')()}<span class="visually-hidden"> (${opensInNewTab})</span></a
          >
          <a
            href="https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({
              url: url.href,
            }).toString()}"
            target="_blank"
            rel="noopener noreferrer"
            class="linked-in"
            >${t('write-review', 'shareOnLinkedin')()}<span class="visually-hidden"> (${opensInNewTab})</span></a
          >
          ${isScietyPreprint(preprint.id)
            ? html` <a href="${scietyUrl(preprint.id).href}" target="_blank" rel="noopener noreferrer" class="sciety"
                >${t('write-review', 'listOnSciety')()}<span class="visually-hidden"> (${opensInNewTab})</span></a
              >`
            : ''}
        </div>

        <h2>${t('write-review', 'howItWent')()}</h2>

        <p>
          ${rawHtml(
            t(
              'write-review',
              'scheduleAnInterview',
            )({
              link: (s: string) =>
                html`
                  <a
                    href="https://calendar.google.com/calendar/u/0/selfsched?sstoken=UUw4R0F6MVo1ZWhyfGRlZmF1bHR8ZGM2YTU1OTNhYzNhY2RiN2YzNTBlYTdmZTBmMzNmNDA"
                    target="_blank"
                    rel="noopener noreferrer"
                    >${s}<span class="visually-hidden"> (${opensInNewTab})</span></a
                  >
                `.toString(),
            }),
          )}
        </p>

        <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="button"
          >${t('write-review', 'backToPreprint')()}</a
        >
      </main>
    `,
    skipLinks: [[html`${t('write-review', 'skipToMain')()}`, '#main-content']],
    type: 'streamline',
    user,
  })
}

import { Array } from 'effect'
import type { PageOfBlogPosts } from '../../CmsContent/index.ts'
import { html, plainText } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import * as Routes from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { PageResponse } from '../Response/index.ts'

export const createWeeknotesPage = (
  { currentPage, totalPages, blogPosts }: PageOfBlogPosts,
  locale: SupportedLocale,
) => {
  return PageResponse({
    title: plainText`Weeknotes (page ${currentPage.toLocaleString('en')})`,
    extraSkipLink: [html`<span ${languageAttributesFor('en')}>Skip to results</span>`, '#results'],
    main: html`
      <h1><span ${languageAttributesFor('en')}>Weeknotes</span></h1>

      <div class="blog-nav">
        <span><span ${languageAttributesFor('en')}>See also:</span></span>
        <a href="${Routes.Blog.href({ page: 1 })}"><span ${languageAttributesFor('en')}>Blog</span></a>
        <a href="${Routes.Newsletter.href({ page: 1 })}"><span ${languageAttributesFor('en')}>Newsletter</span></a>
      </div>

      <ol class="cards" id="results">
        ${Array.map(
          blogPosts,
          (blogPost, index) => html`
            <li>
              <article aria-labelledby="blog-post-${index}-title">
                <header>
                  <h2 id="blog-post-${index}-title">
                    <span>${renderDate(locale)(blogPost.publishedAt.toZonedDateTimeISO('UTC').toPlainDate())}</span>
                  </h2>
                </header>

                ${
                  typeof blogPost.excerpt === 'string'
                    ? html`<div><span ${languageAttributesFor(blogPost.locale)}>${blogPost.excerpt}</span></div>`
                    : ''
                }

                <a href="${Routes.BlogPost.href({ slug: blogPost.slug })}" class="more">
                  Read
                  <span class="visually-hidden"
                    ><span ${languageAttributesFor(blogPost.locale)}>${blogPost.title}</span></span
                  >
                </a>
              </article>
            </li>
          `,
        )}
      </ol>

      <nav class="pager">
        ${
          currentPage > 1
            ? html`<a href="${Routes.Weeknotes.href({ page: currentPage - 1 })}" rel="prev"
                ><span ${languageAttributesFor('en')}>Newer</span></a
              >`
            : ''
        }
        ${
          currentPage < totalPages
            ? html`<a href="${Routes.Weeknotes.href({ page: currentPage + 1 })}" rel="next"
                ><span ${languageAttributesFor('en')}>Older</span></a
              >`
            : ''
        }
      </nav>
    `,
    canonical: Routes.Weeknotes.href({ page: currentPage }),
  })
}

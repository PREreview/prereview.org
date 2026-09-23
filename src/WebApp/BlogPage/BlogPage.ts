import { Array } from 'effect'
import type { PageOfBlogPosts } from '../../CmsContent/index.ts'
import { html, plainText } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import * as Routes from '../../routes.ts'
import { PageResponse } from '../Response/index.ts'

export const createBlogPage = ({ currentPage, totalPages, blogPosts }: PageOfBlogPosts) => {
  return PageResponse({
    title: plainText`Blog (page ${currentPage.toLocaleString('en')})`,
    extraSkipLink: [html`<span ${languageAttributesFor('en')}>Skip to results</span>`, '#results'],
    main: html`
      <h1><span ${languageAttributesFor('en')}>Blog</span></h1>

      <ol class="cards" id="results">
        ${Array.map(
          blogPosts,
          (blogPost, index) => html`
            <li>
              <article aria-labelledby="blog-post-${index}-title">
                <header>
                  <h2 id="blog-post-${index}-title">
                    <span ${languageAttributesFor(blogPost.locale)}>${blogPost.title}</span>
                  </h2>
                </header>

                ${
                  blogPost.heroImage
                    ? html`
                        <img
                          src="${blogPost.heroImage.url.href}"
                          width="${blogPost.heroImage.width}"
                          height="${blogPost.heroImage.height}"
                          alt=""
                        />
                      `
                    : ''
                }
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
            ? html`<a href="${Routes.Blog.href({ page: currentPage - 1 })}" rel="prev"
                ><span ${languageAttributesFor('en')}>Newer</span></a
              >`
            : ''
        }
        ${
          currentPage < totalPages
            ? html`<a href="${Routes.Blog.href({ page: currentPage + 1 })}" rel="next"
                ><span ${languageAttributesFor('en')}>Older</span></a
              >`
            : ''
        }
      </nav>
    `,
    canonical: Routes.Blog.href({ page: currentPage }),
    current: 'blog',
  })
}

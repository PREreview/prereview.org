import type { BlogPostTitle } from '../../src/CmsContent/index.ts'
import { html } from '../../src/html.ts'
import { Slug } from '../../src/types/Slug.ts'
import * as _ from '../../src/WebApp/BlogPage/BlogPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.createBlogPage({
    currentPage: 1,
    totalPages: 3,
    blogPosts: [blogPost1, blogPost2, blogPost3, blogPost4, blogPost5],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks on a middle page', async ({ showPage }) => {
  const response = _.createBlogPage({
    currentPage: 2,
    totalPages: 3,
    blogPosts: [blogPost1, blogPost2, blogPost3, blogPost4, blogPost5],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks on the last page', async ({ showPage }) => {
  const response = _.createBlogPage({
    currentPage: 3,
    totalPages: 3,
    blogPosts: [blogPost1],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const blogPost1 = {
  title: html`An interview with PREreview Champion Shitondo Yahila`,
  locale: 'en-US',
  slug: Slug('interview-prereview-champion-shitondo-yahila'),
  heroImage: {
    url: new URL('https://placehold.co/600x400'),
    width: 600,
    height: 400,
  },
} satisfies BlogPostTitle

const blogPost2 = {
  title: html`PREreview platform news, 4 September 2026`,
  locale: 'en-US',
  slug: Slug('prereview-platform-news-4-september-2026'),
  heroImage: {
    url: new URL('https://placehold.co/500x400'),
    width: 500,
    height: 400,
  },
} satisfies BlogPostTitle

const blogPost3 = {
  title: html`Register for PREreview's Review-a-thon`,
  locale: 'en-US',
  slug: Slug('register-for-review-a-thon'),
  heroImage: {
    url: new URL('https://placehold.co/500x500'),
    width: 500,
    height: 500,
  },
} satisfies BlogPostTitle

const blogPost4 = {
  title: html`PREreview June 2026 Newsletter`,
  locale: 'en-US',
  slug: Slug('prereview-june-2026-newsletter'),
} satisfies BlogPostTitle

const blogPost5 = {
  title: html`Strategic Plan Community Call: What we learned`,
  locale: 'en-US',
  slug: Slug('strategic-plan-community-call-what-we-learned'),
} satisfies BlogPostTitle

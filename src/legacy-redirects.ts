import type { Doi } from 'doi-ts'
import express from 'express'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { isUuid } from 'uuid-ts'
import {
  findAPreprintMatch,
  logInMatch,
  logOutMatch,
  preprintReviewsMatch,
  preprintReviewsUuidMatch,
  reviewAPreprintMatch,
  reviewsMatch,
} from './routes'

export const legacyRedirects = express()
  .use('/login', (req, res) => {
    res.redirect(Status.MovedPermanently, format(logInMatch.formatter, {}))
  })
  .use('/logout', (req, res) => {
    res.redirect(Status.MovedPermanently, format(logOutMatch.formatter, {}))
  })
  .use(/^\/preprints\/arxiv-([A-z0-9.+-]+?)(?:v[0-9]+)?$/, (req, res) => {
    res.redirect(
      Status.MovedPermanently,
      format(preprintReviewsMatch.formatter, {
        id: { type: 'arxiv', value: `10.48550/arxiv.${req.params['0']}` as Doi<'48550'> },
      }),
    )
  })
  .use(/^\/preprints\/([A-z0-9-]+)\/full-reviews/, (req, res, next) => {
    if (isUuid(req.params['0'])) {
      res.redirect(Status.MovedPermanently, format(preprintReviewsUuidMatch.formatter, { uuid: req.params['0'] }))
    } else {
      next()
    }
  })
  .use('/reviews/new', (req, res) => {
    res.redirect(Status.MovedPermanently, format(reviewAPreprintMatch.formatter, {}))
  })
  .use(/^\/reviews$/, (req, res, next) => {
    if (!req.query.page) {
      res.redirect(Status.MovedPermanently, format(reviewsMatch.formatter, { page: 1 }))
    } else {
      next()
    }
  })
  .use(/^\/validate\/([A-z0-9-]+)$/, (req, res, next) => {
    if (isUuid(req.params['0'])) {
      res.redirect(Status.MovedPermanently, format(preprintReviewsUuidMatch.formatter, { uuid: req.params['0'] }))
    } else {
      next()
    }
  })
  .use('/validate', (req, res) => {
    res.redirect(Status.MovedPermanently, format(findAPreprintMatch.formatter, {}))
  })

import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/cloudinary'
import * as fc from './fc'

describe('getAvatarFromCloudinary', () => {
  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid(),
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
  ])('when the ORCID iD has an avatar', async (cloudinaryApi, orcid, imageId) => {
    const fetch = fetchMock.sandbox().getOnce(`begin:https://res.cloudinary.com/${cloudinaryApi.cloudName}/search/`, {
      body: { resources: [{ public_id: imageId }] },
    })

    const actual = await _.getAvatarFromCloudinary(orcid)({ cloudinaryApi, fetch })()

    expect(actual).toStrictEqual(
      E.right(
        new URL(
          `https://res.cloudinary.com/${cloudinaryApi.cloudName}/image/upload/c_thumb,f_auto,g_face,h_300,q_auto,w_300,z_0.666/${imageId}`,
        ),
      ),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid(),
  ])("when the ORCID iD doesn't have an avatar", async (cloudinaryApi, orcid) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(`begin:https://res.cloudinary.com/${cloudinaryApi.cloudName}/search/`, { body: { resources: [] } })

    const actual = await _.getAvatarFromCloudinary(orcid)({ cloudinaryApi, fetch })()

    expect(actual).toStrictEqual(E.left('not-found'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid(),
    fc.fetchResponse({ status: fc.constant(Status.OK) }),
  ])('when the response cannot be decoded', async (cloudinaryApi, orcid, response) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(`begin:https://res.cloudinary.com/${cloudinaryApi.cloudName}/search/`, response)

    const actual = await _.getAvatarFromCloudinary(orcid)({ cloudinaryApi, fetch })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
  ])('when the response has a non-200/404 status code', async (cloudinaryApi, orcid, status) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(`begin:https://res.cloudinary.com/${cloudinaryApi.cloudName}/search/`, status)

    const actual = await _.getAvatarFromCloudinary(orcid)({ cloudinaryApi, fetch })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid(),
    fc.error(),
  ])('when fetch throws an error', async (cloudinaryApi, orcid, error) => {
    const actual = await _.getAvatarFromCloudinary(orcid)({ cloudinaryApi, fetch: () => Promise.reject(error) })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

import { Fixtures, PlaywrightTestArgs, PlaywrightTestOptions, test as baseTest } from '@playwright/test'
import { SystemClock } from 'clock-ts'
import dotenv from 'dotenv'
import * as IO from 'fp-ts/IO'
import { Server } from 'http'
import nodeFetch from 'node-fetch'
import { app } from '../src/app'

export { expect } from '@playwright/test'

type AppFixtures = {
  server: Server
}

const appFixtures: Fixtures<AppFixtures, Record<never, never>, PlaywrightTestArgs & PlaywrightTestOptions> = {
  baseURL: async ({ server }, use) => {
    const address = server.address()

    if (typeof address !== 'object' || address === null) {
      throw new Error('Unable to find a port')
    }

    await use(`http://localhost:${address.port}`)
  },
  server: async ({}, use) => {
    dotenv.config()

    const server = app({
      clock: SystemClock,
      fetch: nodeFetch,
      logger: () => IO.of(undefined),
      zenodoApiKey: process.env.ZENODO_API_KEY ?? '',
      zenodoUrl: new URL('https://sandbox.zenodo.org/'),
    })

    server.listen()

    await use(server)

    server.close()
  },
}

export const test = baseTest.extend(appFixtures)

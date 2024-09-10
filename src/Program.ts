import { HttpServer } from '@effect/platform'
import { Layer, pipe } from 'effect'
import { Express } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'

export const Program = pipe(ExpressHttpApp, HttpServer.serve(), Layer.provide(Layer.effect(Express, expressServer)))

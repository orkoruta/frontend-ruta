'use client'

import { createContext } from 'react'
import type { RutaSession } from './session'

export const SessionContext = createContext<RutaSession | null>(null)

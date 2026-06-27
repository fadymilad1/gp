'use client'

import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

import { setSiteOwnerId } from '@/lib/storage'

import { buildDemoAwarePath, parseDemoModeState } from '../utils/demoMode'

export function useDemoMode() {
	const searchParams = useSearchParams()
	const { isDemo, ownerId } = parseDemoModeState(searchParams)

	useEffect(() => {
		if (ownerId) {
			setSiteOwnerId(ownerId)
		}
	}, [ownerId])

	const withDemo = useCallback(
		(path: string) => buildDemoAwarePath(path, { isDemo, ownerId }),
		[isDemo, ownerId],
	)

	return {
		isDemo,
		ownerId,
		withDemo,
	}
}

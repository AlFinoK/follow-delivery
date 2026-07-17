'use client'

// Прослойка «демо». Всё под /demo оборачивается <DemoProvider> ([app/demo/layout.tsx]),
// поэтому любой компонент внутри знает, что он в песочнице, и строит ссылки от basePath.
// Вне /demo провайдера нет → значение по умолчанию (не демо, basePath '').

import { createContext, useContext } from 'react'

export interface DemoState {
	isDemo: boolean
	basePath: '' | '/demo'
}

const DemoCtx = createContext<DemoState>({ isDemo: false, basePath: '' })

export function DemoProvider({ children }: { children: React.ReactNode }) {
	return <DemoCtx.Provider value={{ isDemo: true, basePath: '/demo' }}>{children}</DemoCtx.Provider>
}

export function useDemo(): DemoState {
	return useContext(DemoCtx)
}

/** Префикс для всех внутренних ссылок/переходов: '' в проде, '/demo' в песочнице. */
export function useBasePath(): '' | '/demo' {
	return useContext(DemoCtx).basePath
}

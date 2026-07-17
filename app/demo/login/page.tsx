'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FlaskConical, Database, Eraser } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { LangSwitcher } from '@/components/LangSwitcher'
import { resetDemo, seedSampleData } from '@/lib/demo/store'

// Демо-вход (зеркало /login). Авторизация НЕ проверяется — это песочница.
// Здесь же выбор: войти с пустыми данными или с демо-примерами.
export default function DemoLoginPage() {
	const router = useRouter()
	const { t } = useLang()
	const [username, setUsername] = useState('demo')
	const [password, setPassword] = useState('demo')
	const [loading, setLoading] = useState<null | 'empty' | 'seed'>(null)

	const enter = (mode: 'empty' | 'seed') => {
		setLoading(mode)
		if (mode === 'seed') seedSampleData()
		else resetDemo()
		setTimeout(() => router.push('/demo/admin'), 250)
	}

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
			<div className="absolute top-4 left-4">
				<LangSwitcher />
			</div>
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<img
						src="/logo.png"
						alt="Leader Trans Team"
						className="w-14 h-14 mx-auto mb-4 object-contain"
					/>
					<h1 className="text-2xl font-semibold text-slate-900 mb-1">{t('adminPanelTitle')}</h1>
					<p className="text-sm text-slate-500">Leader Trans Team</p>
				</div>

				<div className="mb-4 flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
					<FlaskConical className="w-4 h-4 shrink-0 text-amber-500" />
					<span>Демо-вход: данные не проверяются, ничего не сохраняется в базу.</span>
				</div>

				<div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
					<form
						onSubmit={(e) => {
							e.preventDefault()
							enter('empty')
						}}
						className="flex flex-col gap-3">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1.5">{t('loginInput')}</label>
							<input
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								autoComplete="off"
								className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1.5">{t('passwordInput')}</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								autoComplete="off"
								className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
							/>
						</div>

						<button
							type="submit"
							disabled={loading !== null}
							className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-2">
							{loading === 'empty' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
							Войти (пустая песочница)
						</button>
						<button
							type="button"
							onClick={() => enter('seed')}
							disabled={loading !== null}
							className="w-full inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-orange-300 text-slate-700 font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm">
							{loading === 'seed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
							Войти с демо-данными
						</button>
					</form>
				</div>
			</div>
		</div>
	)
}

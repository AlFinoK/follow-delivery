'use client'

import { useState, useEffect, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { LangSwitcher } from '@/components/LangSwitcher'
import { ToastItem } from '@/components/Toast'
import type { Toast } from '@/components/Toast'

export default function LoginPage() {
	const router = useRouter()
	const { t } = useLang()
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = Date.now().toString()
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
			setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350)
		}, 4000)
	}, [])

	useEffect(() => {
		const pending = sessionStorage.getItem('pendingToast')
		if (pending) {
			try {
				const { message, type } = JSON.parse(pending)
				addToast(message, type)
			} catch {}
			sessionStorage.removeItem('pendingToast')
		}
	}, [addToast])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)

		const res = await signIn('credentials', {
			username,
			password,
			redirect: false,
		})

		setLoading(false)

		if (res?.ok) {
			router.push('/admin')
		} else {
			addToast(t('wrongCredentials'), 'error')
		}
	}

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>
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

				<div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
					<form onSubmit={handleSubmit} className="flex flex-col gap-3">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1.5">{t('loginInput')}</label>
							<input
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								autoComplete="username"
								className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1.5">{t('passwordInput')}</label>
							<div className="relative">
								<input
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete="current-password"
									className="w-full px-3 py-2 pr-10 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors">
									{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-2">
							{loading && <Loader2 className="w-4 h-4 animate-spin" />}
							{loading ? t('loggingIn') : t('loginButton')}
						</button>
					</form>
				</div>
			</div>
		</div>
	)
}

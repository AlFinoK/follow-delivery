'use client'

import { useState, useEffect, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
		<div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>
			<div className="absolute top-4 right-4">
				<LangSwitcher />
			</div>
			<div className="w-full max-w-md">
				<div className="text-center mb-10">
					<img
						src="/logo.png"
						alt="Leader Trans Team"
						className="w-20 h-20 mx-auto mb-4 object-contain"
					/>
					<h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-2">
						{t('adminPanelTitle')}
					</h1>
					<p className="text-gray-600">Leader Trans Team</p>
				</div>

				<div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
					<form
						onSubmit={handleSubmit}
						className="flex flex-col gap-4">
						<div className="relative">
							<input
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder={t('loginInput')}
								required
								className="w-full px-6 py-3 bg-gray-50 border-2 border-orange-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 transition-all"
							/>
						</div>
						<div className="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder={t('passwordInput')}
								required
								className="w-full px-6 py-3 pr-12 bg-gray-50 border-2 border-orange-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 transition-all"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-orange-500 transition-colors">
								{showPassword ? (
									<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
									</svg>
								) : (
									<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								)}
							</button>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
							{loading ? t('loggingIn') : t('loginButton')}
						</button>
					</form>
				</div>
			</div>
		</div>
	)
}

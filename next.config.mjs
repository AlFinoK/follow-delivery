// Защитные заголовки для всех маршрутов. CSP намеренно НЕТ: приложение использует inline-стили
// и скрипты Next, а печатная форма накладной открывает окно about:blank с inline-кодом —
// строгий CSP это сломает, а нестрогий ничего не даёт.
const securityHeaders = [
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Не сообщаем «X-Powered-By: Next.js» — лишняя подсказка для сканеров.
	poweredByHeader: false,
	images: {
		unoptimized: true,
	},
	async headers() {
		return [{ source: '/:path*', headers: securityHeaders }]
	},
}

export default nextConfig

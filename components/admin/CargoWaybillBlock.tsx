'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileDown, FilePlus, FileText, Pencil } from 'lucide-react'
import { repos } from '@/lib/data/repos'
import type { WaybillDTO } from '@/lib/data/types'
import { Spinner } from '@/components/Spinner'
import { openWaybillPrint } from '@/lib/waybill/print'
import { fmtDecimal, fmtMoney, totalWeight, type WaybillStatus } from '@/lib/waybill/model'
import { STATUS_KEYS } from '@/lib/waybill/statusI18n'
import { useLang } from '@/contexts/LangContext'

// Блок «Накладная» на карточке груза: одна накладная = один груз, поэтому её видно
// прямо здесь — и в режиме просмотра, и при редактировании груза. Сама накладная
// правится на своей странице (/admin/waybills/[id]), тут только сводка и действия.

const BADGE: Record<WaybillStatus, string> = {
	draft: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
	active: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/25',
	delivered: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
	cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/25',
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex items-center justify-between gap-3 lg:block lg:space-y-1.5">
		<p className="text-xs font-medium text-slate-700 dark:text-zinc-200">{label}</p>
		<p className="text-sm font-medium text-right lg:text-left text-slate-900 dark:text-zinc-100">{children}</p>
	</div>
)

export function CargoWaybillBlock({ cargoDocId }: { cargoDocId: string }) {
	const { t } = useLang()
	const repo = repos
	const [waybill, setWaybill] = useState<WaybillDTO | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let alive = true
		repo.waybills
			.getByCargo(cargoDocId)
			.then((found) => alive && setWaybill(found))
			.catch(() => {
				/* нет доступа/ошибка сети — просто покажем «накладной нет» */
			})
			.finally(() => alive && setLoading(false))
		return () => {
			alive = false
		}
	}, [cargoDocId, repo])

	if (loading) {
		return (
			<div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500">
				<Spinner className="w-3.5 h-3.5 text-orange-500" /> {t('wbChecking')}
			</div>
		)
	}

	if (!waybill) {
		return (
			<div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-600 px-3.5 py-3">
				<p className="flex-1 text-xs text-slate-500 dark:text-zinc-400">
					{t('wbNone')}
				</p>
				<Link
					href={`/admin/waybills/new`}
					className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/15 border border-orange-200 dark:border-orange-500/25 rounded-lg transition-colors shrink-0">
					<FilePlus className="w-4 h-4" /> {t('createWaybillButton')}
				</Link>
			</div>
		)
	}

	const weight = totalWeight(waybill.positions)
	const places = waybill.positions.reduce((s, p) => s + (p.quantity || 0), 0)

	return (
		<div className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40 p-3.5">
			<div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
				<div className="flex items-center gap-2 min-w-0">
					<FileText className="w-4 h-4 text-orange-500 shrink-0" />
					<span className="text-sm font-bold text-slate-900 dark:text-zinc-100">№{waybill.number}</span>
					<span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${BADGE[waybill.status]}`}>
						{t(STATUS_KEYS[waybill.status])}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => openWaybillPrint(waybill)}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-orange-300 rounded-lg transition-colors">
						<FileDown className="w-3.5 h-3.5" /> PDF
					</button>
					<Link
						href={`/admin/waybills/${waybill.docId}`}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/15 border border-orange-200 dark:border-orange-500/25 rounded-lg transition-colors">
						<Pencil className="w-3.5 h-3.5" /> {t('editButton')}
					</Link>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
				<Row label={t('wfSenderTitle')}>{waybill.sender.fullName || '—'}</Row>
				<Row label={t('wfReceiverTitle')}>{waybill.receiver.fullName || '—'}</Row>
				<Row label={t('wbReceiverPhone')}>{waybill.receiver.phone || '—'}</Row>
				<Row label={t('wfNature')}>{waybill.nature || '—'}</Row>
				<Row label={t('wbPlacesWeight')}>
					{places || '—'} / {fmtDecimal(weight, 1)} {t('calcKg')}
				</Row>
				<Row label={t('wfAmount')}>{fmtMoney(waybill.amount)} ₸</Row>
				<Row label={t('wbPackaging')}>
					{waybill.packagingOk ? (
						<span className="text-emerald-700 dark:text-emerald-300">{t('wbPackagingOk')}</span>
					) : (
						<span className="text-red-700 dark:text-red-300">{t('wbPackagingBad')}</span>
					)}
				</Row>
				{waybill.specialInstructions && <Row label={t('wfInstructions')}>{waybill.specialInstructions}</Row>}
			</div>
		</div>
	)
}

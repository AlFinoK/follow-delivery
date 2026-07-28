export type Lang = 'ru' | 'kk'

export type Translations = {
	// Header/Nav
	headerSubtitle: string
	goHome: string
	themeDark: string
	themeLight: string
	logout: string
	// Main hero
	realtimeBadge: string
	heroTitle: string
	heroSubtitle: string
	// Main search
	trackInputPlaceholder: string
	trackButton: string
	searching: string
	// Main features
	featureInstant: string
	featureRealtime: string
	featureSecure: string
	// Main cargo card
	cargoStatusLabel: string
	trackNumberLabel: string
	routeLabel: string
	fromLabel: string
	currentLabel: string
	toLabel: string
	stagesLabel: string
	newSearchButton: string
	// Status display labels
	statusWaiting: string
	statusInTransit: string
	statusArrived: string
	// Main page toasts
	enterCargoId: string
	cargoNotFound: string
	trackLinkNotFound: string
	searchError: string
	cargoFound: string
	// Login
	adminPanelTitle: string
	loginInput: string
	passwordInput: string
	wrongCredentials: string
	loggingIn: string
	loginButton: string
	// Admin nav
	adminNavTitle: string
	adminNavSubtitle: string
	// Admin form
	newCargoTitle: string
	fromFormLabel: string
	toFormLabel: string
	cargoNumberLabel: string
	enterCargoNumber: string
	cargoNameLabel: string
	statusFormLabel: string
	creating: string
	createCargoButton: string
	createWaybillButton: string
	waybillsNavLink: string
	// Admin cargo list
	cargosTitle: string
	foundCount: string
	totalCount: string
	searchPlaceholder: string
	// Admin cargo card
	cargoNameCardLabel: string
	enterName: string
	saveButton: string
	trackCardLabel: string
	copied: string
	fromCardLabel: string
	currentLocationLabel: string
	toCardLabel: string
	statusCardLabel: string
	deleteButton: string
	noName: string
	// Admin empty states
	noCargos: string
	createFirstCargo: string
	nothingFound: string
	tryAnotherQuery: string
	// Admin city select
	cityDeparture: string
	cityDelivery: string
	selectCity: string
	otherCity: string
	enterCityManually: string
	selectCountry: string
	otherCountry: string
	enterCountryManually: string
	// Admin status options
	statusOptionWaiting: string
	statusOptionInTransit: string
	statusOptionArrived: string
	// Admin country names
	countryKZ: string
	countryRU: string
	countryBY: string
	// Admin toasts
	loadError: string
	fillAllFields: string
	cargoCreated: string
	createError: string
	statusUpdated: string
	statusUpdateError: string
	cityEmpty: string
	cityUpdated: string
	cityUpdateError: string
	nameUpdated: string
	nameUpdateError: string
	cargoDeleted: string
	deleteError: string
	confirmDelete: string
	// Footer
	footer: string
	adminFooter: string
	// New cargo detail fields
	acceptanceDateLabel: string
	shipmentDateLabel: string
	deliveryTimeframeLabel: string
	deliveryAmountLabel: string
	paymentStatusLabel: string
	partialPaymentDetailLabel: string
	currencyLabel: string
	paymentNone: string
	paymentPartial: string
	paymentFull: string
	currencyKZT: string
	currencyRUB: string
	unitDays: string
	unitWeeks: string
	unitMonths: string
	detailsLabel: string
	enterTimeframe: string
	enterAmount: string
	enterPaymentDetail: string
	notSpecified: string
	detailsUpdated: string
	detailsUpdateError: string
	backToList: string
	cargoDetailTitle: string
	cancelButton: string
	editButton: string
	filterAll: string
	pageOf: string
	createHintFrom: string
	createHintTo: string
	createHintBoth: string
	loggedOut: string
	confirmLogoutTitle: string
	confirmLogoutDesc: string
	// Folders
	foldersNavLink: string
	foldersTitle: string
	foldersCount: string
	newFolderButton: string
	newFolderTitle: string
	folderNamePlaceholder: string
	folderNameEmpty: string
	folderCreated: string
	folderCreateError: string
	folderRenamed: string
	folderRenameError: string
	folderDeleted: string
	folderDeleteError: string
	confirmDeleteFolder: string
	noFolders: string
	createFirstFolder: string
	folderEmptyCargos: string
	folderActiveCount: string
	folderTotalCargos: string
	addCargosTitle: string
	addCargosHint: string
	addCargosPlaceholder: string
	addCargosButton: string
	cargosAddedToast: string
	cargosNotFoundToast: string
	cargosAlreadyDeliveredToast: string
	cargosAlreadyInFolderToast: string
	cargosMovedToast: string
	confirmArrivedTitle: string
	confirmArrivedDescription: string
	confirmArrivedYes: string
	dangerZoneTitle: string
	dangerZoneDescription: string
	bulkUpdateTitle: string
	bulkUpdateHint: string
	bulkUpdateButton: string
	bulkUpdatedToast: string
	bulkUpdateError: string
	bulkNothingToUpdate: string
	removeFromFolderButton: string
	removeFromFolderError: string
	folderTabActive: string
	folderTabDelivered: string
	folderTabAll: string
	renameFolderButton: string
	saveFolderName: string
	openFolderButton: string
	// Calculator
	calcNavLink: string
	calcTitle: string
	calcSubtitle: string
	calcBadge: string
	calcOriginLabel: string
	calcOriginValue: string
	calcDestLabel: string
	calcDestPlaceholder: string
	calcDestSearch: string
	calcOtherCityOption: string
	calcCustomCityHint: string
	calcNoResults: string
	calcModeTotals: string
	calcModeDimensions: string
	calcVolumeLabel: string
	calcWeightLabel: string
	calcVolumePh: string
	calcWeightPh: string
	calcUnitLabel: string
	calcUnitMeters: string
	calcUnitCm: string
	calcPlaceTitle: string
	calcDimLength: string
	calcDimWidth: string
	calcDimHeight: string
	calcDimWeight: string
	calcDimQty: string
	calcPlaceVolume: string
	calcAddPlace: string
	calcRemove: string
	calcResultTitle: string
	calcResCity: string
	calcResPlaces: string
	calcResVolume: string
	calcResWeight: string
	calcResPaidWeight: string
	calcResPrice: string
	calcResDays: string
	calcBilledWeight: string
	calcBilledVolume: string
	calcTariffBasis: string
	calcApproxNote: string
	calcExcludedTitle: string
	calcExcludedDesc: string
	calcEmptyHint: string
	calcSelectCityHint: string
	calcFillCargoHint: string
	calcDisclaimer: string
	calcBackToTracking: string
	calcPlacesUnit: string
	// Calculator — presets / regions / custom city
	calcModePresets: string
	calcModeCustom: string
	calcKg: string
	calcPresetsEmpty: string
	calcPresetQtyLabel: string
	calcPresetSelect: string
	calcCustomCargoButton: string
	calcCustomCargoHint: string
	calcCargoName: string
	calcCargoUnitCost: string
	calcCopyToWaybill: string
	calcFromPreset: string
	calcPresetSelectedCount: string
	calcApproxBadge: string
	calcCustomCityNamePh: string
	calcNearestCityLabel: string
	calcBackToCityList: string
	calcNearestCityHint: string
	calcOtherSettlement: string
	calcSectionCities: string
	calcSectionSettlements: string
	calcSearchingPlaces: string
	calcApproxHint: string
	calcBilledPreset: string
	calcResBasePrice: string
	calcSurchargeLabel: string
	calcMinTariffNote: string
	// Admin — presets management
	presetsNavLink: string
	presetsTitle: string
	presetsSubtitle: string
	presetAddButton: string
	presetSeedButton: string
	presetCreated: string
	presetUpdated: string
	presetSaveError: string
	presetDeleted: string
	presetDeleteError: string
	presetSeedDone: string
	presetSeedError: string
	presetsEmptyAdmin: string
	presetsEmptyHint: string
	presetHiddenBadge: string
	presetHideAction: string
	presetShowAction: string
	presetDeleteTitle: string
	presetConfirmDelete: string
	presetNameLabel: string
	presetCategoryLabel: string
	presetSortLabel: string
	presetLengthLabel: string
	presetWidthLabel: string
	presetHeightLabel: string
	presetWeightLabel: string
	presetBasePriceLabel: string
	presetGoodsPriceLabel: string
	presetGoodsPriceHint: string
	presetImageUrlLabel: string
	presetActiveLabel: string
	presetSaveButton: string
	presetSearchPlaceholder: string
	presetNothingFound: string
	// Home hero + tabs
	homeHeroBadge: string
	homeHeroTitle: string
	homeHeroSubtitle: string
	tabTrack: string
	tabCalc: string
	tabTrackShort: string
	tabCalcShort: string
	// Общие заголовки секций (карточка груза, создание груза)
	openMenu: string
	closeMenu: string
	calcNamePh: string
	// Сообщения валидации накладной (показываются тостом при сохранении)
	wvSenderName: string
	wvCompanyName: string
	wvSenderAddress: string
	wvSenderCity: string
	wvReceiverName: string
	wvPhone: string
	wvDeliveryAddress: string
	wvDeliveryCity: string
	wvNature: string
	// Статусы накладной (документ; не путать со статусами перемещения груза)
	wsDraft: string
	wsActive: string
	wsDelivered: string
	wsCancelled: string
	secRoute: string
	secDates: string
	secPayment: string
	secInfo: string
	folderLabel: string
	folderInBadge: string
	presetGoodsShort: string
	// Форма накладной
	wfSenderTitle: string
	wfSenderHint: string
	wfSenderName: string
	wfSenderNamePh: string
	wfSenderType: string
	wfIndividual: string
	wfCompany: string
	wfCompanyName: string
	wfCompanyNamePh: string
	wfCompanyTin: string
	wfDigitsOnly: string
	wfContactPerson: string
	wfSenderAddress: string
	wfCity: string
	wfCountry: string
	wfReceiverTitle: string
	wfReceiverHint: string
	wfReceiverFullName: string
	wfReceiverNamePh: string
	wfPhone: string
	wfReceiverTin: string
	wfOptional: string
	wfPassport: string
	wfDeliveryAddress: string
	wfAddressPh: string
	wfDeliveryCountry: string
	wfPrivacyNote: string
	wfCargoTitle: string
	wfCargoHint: string
	wfNature: string
	wfNaturePh: string
	wfPositions: string
	wfPositionsUnit: string
	wfPositionNamePh: string
	wfRemovePosition: string
	wfQty: string
	wfDims: string
	wfPlaceWeight: string
	wfCost: string
	wfPositionVolume: string
	wfPositionWeight: string
	wfAddPosition: string
	wfTotalWeight: string
	wfVolume: string
	wfManualVolume: string
	wfPackaging: string
	wfYes: string
	wfNo: string
	wfInstructions: string
	wfInstructionsPh: string
	wfPaymentTitle: string
	wfPayer: string
	wfPayMethod: string
	wfCash: string
	wfCashless: string
	wfAmount: string
	wfAmountHint: string
	wfExtrasTitle: string
	wfAcceptanceDate: string
	wfShipmentDate: string
	wfExtrasNote: string
	wfNumberLabel: string
	wfNumberPending: string
	// Страница накладной (мастер)
	wpStep1: string
	wpStep2: string
	wpStep3: string
	wpStepOf: string
	wpWaybill: string
	wpNotFound: string
	wpToList: string
	wpNumberError: string
	wpCalcFilled: string
	wpCalcCopied: string
	wpSaved: string
	wpSaveError: string
	wpCleared: string
	wpDeleted: string
	wpDeleteError: string
	wpSaving: string
	wpSave: string
	wpDownloadPdf: string
	wpNotifyClient: string
	wpNotifyDisabled: string
	wpClear: string
	wpBack: string
	wpNext: string
	wpCalcTitle: string
	wpCalcHint: string
	wpFillFromWaybill: string
	wpLogistTitle: string
	wpLogistHint: string
	// Список накладных
	wlLoadError: string
	wlSearchPh: string
	wlPayerSender: string
	wlPayerReceiver: string
	wlPdfAria: string
	wlEmpty: string
	wlEmptyHint: string
	wlAccepted: string
	// Блок накладной в грузе
	wbChecking: string
	wbNone: string
	wbReceiverPhone: string
	wbPlacesWeight: string
	wbPackaging: string
	wbPackagingOk: string
	wbPackagingBad: string
	// Сводка логистам
	lsHint: string
	lsCopy: string
	lsSend: string
	lsSendDisabled: string
	lsSendNote: string
	// Ввод телефона
	phCountry: string
	phCountrySearch: string
	phNumber: string
	phInvalid: string
}

export const translations: Record<Lang, Translations> = {
	ru: {
		headerSubtitle: 'Логистика и доставка',
		goHome: 'На главную',
		themeDark: 'Тёмная тема',
		themeLight: 'Светлая тема',
		logout: 'Выйти',
		realtimeBadge: 'Отслеживание в реальном времени',
		heroTitle: 'Где ваш груз',
		heroSubtitle: 'Введите трек-номер и получите актуальный статус доставки',
		trackInputPlaceholder: 'Трек-номер или номер отправления...',
		trackButton: 'Отследить груз',
		searching: 'Поиск...',
		featureInstant: 'Мгновенный поиск',
		featureRealtime: 'Реальное время',
		featureSecure: 'Безопасно',
		cargoStatusLabel: 'Статус груза',
		trackNumberLabel: 'Трек-номер',
		routeLabel: 'Маршрут',
		fromLabel: 'Откуда',
		currentLabel: 'Сейчас',
		toLabel: 'Куда',
		stagesLabel: 'Этапы доставки',
		newSearchButton: 'Новый поиск',
		statusWaiting: 'Ожидает отправления',
		statusInTransit: 'В пути',
		statusArrived: 'Прибыл',
		enterCargoId: 'Введите ID груза',
		cargoNotFound: 'Груз не найден',
		trackLinkNotFound:
			'Груз №{id} не найден. Проверьте номер в накладной или свяжитесь с нами — возможно, груз ещё не принят на склад.',
		searchError: 'Ошибка при поиске груза',
		cargoFound: 'Груз найден!',
		adminPanelTitle: 'Админ панель',
		loginInput: 'Логин',
		passwordInput: 'Пароль',
		wrongCredentials: 'Неверный логин или пароль',
		loggingIn: 'Входим...',
		loginButton: 'Войти в панель',
		adminNavTitle: 'Админ панель',
		adminNavSubtitle: 'Админ панель',
		newCargoTitle: 'Новый груз',
		fromFormLabel: 'ОТКУДА',
		toFormLabel: 'КУДА',
		cargoNumberLabel: 'НОМЕР',
		enterCargoNumber: 'Напр.: 1899',
		cargoNameLabel: 'НАЗВАНИЕ ГРУЗА',
		statusFormLabel: 'СТАТУС',
		creating: 'Создание...',
		createCargoButton: 'Создать груз',
		createWaybillButton: 'Создать накладную',
		waybillsNavLink: 'Накладные',
		cargosTitle: 'Грузы',
		foundCount: 'Найдено: {found} из {total}',
		totalCount: 'Всего: {total}',
		searchPlaceholder: 'Поиск по треку, названию, городу, статусу...',
		cargoNameCardLabel: 'Название груза',
		enterName: 'Введите название...',
		saveButton: 'Сохранить',
		trackCardLabel: 'Трек-номер',
		copied: 'Скопировано',
		fromCardLabel: 'Откуда',
		currentLocationLabel: 'Текущее местоположение',
		toCardLabel: 'Куда',
		statusCardLabel: 'Статус',
		deleteButton: 'Удалить',
		noName: 'Нет названия',
		noCargos: 'Грузов нет',
		createFirstCargo: 'Создайте первый груз в левой панели',
		nothingFound: 'Ничего не найдено',
		tryAnotherQuery: 'Попробуйте другой запрос',
		cityDeparture: 'Город отправления',
		cityDelivery: 'Город доставки',
		selectCity: 'Выберите город',
		otherCity: 'Другой город',
		enterCityManually: 'Введите название города',
		selectCountry: 'Выберите страну',
		otherCountry: 'Другая страна',
		enterCountryManually: 'Введите название страны',
		statusOptionWaiting: 'Ожидает отправления',
		statusOptionInTransit: 'В пути',
		statusOptionArrived: 'Прибыл',
		countryKZ: '🇰🇿 Казахстан',
		countryRU: '🇷🇺 Россия',
		countryBY: '🇧🇾 Беларусь',
		loadError: 'Ошибка при загрузке грузов',
		fillAllFields: 'Заполните все поля',
		cargoCreated: 'Груз создан! ID: {id}',
		createError: 'Ошибка при создании груза',
		statusUpdated: 'Статус обновлён',
		statusUpdateError: 'Ошибка при обновлении статуса',
		cityEmpty: 'Город не может быть пустым',
		cityUpdated: 'Город обновлен',
		cityUpdateError: 'Ошибка при обновлении города',
		nameUpdated: 'Название обновлено',
		nameUpdateError: 'Ошибка при обновлении названия',
		cargoDeleted: 'Груз удален',
		deleteError: 'Ошибка при удалении груза',
		confirmDelete: 'Вы уверены? Это действие нельзя отменить.',
		footer: 'Leader Trans Team © 2026',
		adminFooter: 'Leader Trans Team © 2026 • Админ панель',
		acceptanceDateLabel: 'Дата приема',
		shipmentDateLabel: 'Дата отправки',
		deliveryTimeframeLabel: 'Сроки доставки',
		deliveryAmountLabel: 'Сумма доставки',
		paymentStatusLabel: 'Статус оплаты',
		partialPaymentDetailLabel: 'Детали оплаты',
		currencyLabel: 'Валюта',
		paymentNone: 'Нет оплаты',
		paymentPartial: 'Частичная оплата',
		paymentFull: 'Полная оплата',
		currencyKZT: '₸ (Тенге)',
		currencyRUB: '₽ (Рубли)',
		unitDays: 'дней',
		unitWeeks: 'недель',
		unitMonths: 'месяцев',
		detailsLabel: 'Детали',
		enterTimeframe: 'Напр.: 10–14 дней',
		enterAmount: 'Введите сумму',
		enterPaymentDetail: '15 000',
		notSpecified: 'Не указано',
		detailsUpdated: 'Данные обновлены',
		detailsUpdateError: 'Ошибка при обновлении',
		backToList: 'Назад к списку',
		cargoDetailTitle: 'Детали груза',
		cancelButton: 'Отмена',
		editButton: 'Редактировать',
		filterAll: 'Все',
		pageOf: 'Стр. {page} из {pages}',
		createHintFrom: 'Укажите город отправления',
		createHintTo: 'Укажите город доставки',
		createHintBoth: 'Укажите города отправления и доставки',
		loggedOut: 'Вы вышли из системы',
		confirmLogoutTitle: 'Выйти из системы?',
		confirmLogoutDesc: 'Вы вернётесь на страницу входа.',
		foldersNavLink: 'Папки',
		foldersTitle: 'Папки',
		foldersCount: '{count} активных',
		newFolderButton: 'Новая папка',
		newFolderTitle: 'Новая папка',
		folderNamePlaceholder: 'Напр.: Консол 1, Машина Алматы — Москва',
		folderNameEmpty: 'Название не может быть пустым',
		folderCreated: 'Папка создана',
		folderCreateError: 'Ошибка при создании папки',
		folderRenamed: 'Папка переименована',
		folderRenameError: 'Ошибка при переименовании',
		folderDeleted: 'Папка удалена',
		folderDeleteError: 'Ошибка при удалении папки',
		confirmDeleteFolder: 'Удалить папку? Грузы внутри останутся и просто отвяжутся.',
		noFolders: 'Папок ещё нет',
		createFirstFolder: 'Создайте первую папку — например, под рейс или машину',
		folderEmptyCargos: 'В этой папке пока нет грузов',
		folderActiveCount: 'Активных: {count}',
		folderTotalCargos: 'Всего: {count}',
		addCargosTitle: 'Добавить грузы по номерам',
		addCargosHint: 'Введите номера через запятую, пробел или Enter. Например: 1899, 1889, 1891',
		addCargosPlaceholder: '1899, 1889, 1891',
		addCargosButton: 'Добавить',
		cargosAddedToast: 'Добавлено: {count}',
		cargosNotFoundToast: 'Не найдены: {numbers}',
		cargosAlreadyDeliveredToast: 'Уже доставлены: {numbers}',
		cargosAlreadyInFolderToast: 'Уже в этой папке: {numbers}',
		cargosMovedToast: 'Перенесены из других папок: {numbers}',
		confirmArrivedTitle: 'Отметить как доставленный?',
		confirmArrivedDescription: 'Груз исчезнет из активных в папке и переедет в «Доставленные».',
		confirmArrivedYes: 'Да, доставлен',
		dangerZoneTitle: 'Опасная зона',
		dangerZoneDescription: 'Удаление груза не может быть отменено.',
		bulkUpdateTitle: 'Массовое обновление',
		bulkUpdateHint: 'Изменения применятся ко всем активным грузам в папке',
		bulkUpdateButton: 'Применить ко всем',
		bulkUpdatedToast: 'Обновлено: {count}',
		bulkUpdateError: 'Ошибка при массовом обновлении',
		bulkNothingToUpdate: 'Выберите хотя бы одно поле',
		removeFromFolderButton: 'Убрать из папки',
		removeFromFolderError: 'Ошибка при откреплении',
		folderTabActive: 'Активные',
		folderTabDelivered: 'Доставленные',
		folderTabAll: 'Все',
		renameFolderButton: 'Переименовать',
		saveFolderName: 'Сохранить',
		openFolderButton: 'Открыть',
		calcNavLink: 'Калькулятор',
		calcTitle: 'Калькулятор доставки',
		calcSubtitle: 'Рассчитайте ориентировочную стоимость и срок доставки груза из Алматы по России',
		calcBadge: 'Расчёт стоимости',
		calcOriginLabel: 'Откуда',
		calcOriginValue: 'Алматы, Казахстан',
		calcDestLabel: 'Куда',
		calcDestPlaceholder: 'Выберите город назначения',
		calcDestSearch: 'Начните вводить город…',
		calcOtherCityOption: 'Другой город (оценка)',
		calcCustomCityHint: 'Рассчитать как «{city}» (приблизительно)',
		calcNoResults: 'Город не найден',
		calcModeTotals: 'Знаю объём и вес',
		calcModeDimensions: 'По габаритам мест',
		calcVolumeLabel: 'Общий объём, м³',
		calcWeightLabel: 'Общий вес, кг',
		calcVolumePh: 'напр. 5',
		calcWeightPh: 'напр. 1200',
		calcUnitLabel: 'Единицы габаритов',
		calcUnitMeters: 'метры',
		calcUnitCm: 'см',
		calcPlaceTitle: 'Место {n}',
		calcDimLength: 'Длина',
		calcDimWidth: 'Ширина',
		calcDimHeight: 'Высота',
		calcDimWeight: 'Вес места, кг',
		calcDimQty: 'Кол-во, шт',
		calcPlaceVolume: 'Объём: {v} м³ × {q} = {total} м³',
		calcAddPlace: 'Добавить место',
		calcRemove: 'Удалить',
		calcResultTitle: 'Результат расчёта',
		calcResCity: 'Город назначения',
		calcResPlaces: 'Количество мест',
		calcResVolume: 'Общий объём',
		calcResWeight: 'Общий вес',
		calcResPaidWeight: 'Расчётный вес',
		calcResPrice: 'Ориентировочная стоимость',
		calcResDays: 'Срок доставки',
		calcBilledWeight: 'по весу',
		calcBilledVolume: 'по объёму',
		calcTariffBasis: 'Тарификация',
		calcApproxNote: 'Приблизительно: города нет в справочнике тарифов',
		calcExcludedTitle: 'Доставка недоступна',
		calcExcludedDesc: 'На это направление перевозка не осуществляется',
		calcEmptyHint: 'Заполните данные о грузе, чтобы увидеть расчёт',
		calcSelectCityHint: 'Выберите город назначения',
		calcFillCargoHint: 'Укажите объём и вес груза',
		calcDisclaimer: 'Расчёт ориентировочный. Точную стоимость уточняйте у менеджера.',
		calcBackToTracking: 'К отслеживанию',
		calcPlacesUnit: 'шт',
		calcModePresets: 'Шаблоны',
		calcModeCustom: 'Свой груз',
		calcKg: 'кг',
		calcPresetsEmpty: 'Шаблоны ещё не загружены',
		calcPresetQtyLabel: 'Количество',
		calcPresetSelect: 'Выбрать',
		calcCustomCargoButton: 'Свой груз',
		calcCustomCargoHint: 'Ввести свои размеры и вес',
		calcCargoName: 'Название техники',
		calcCargoUnitCost: 'Себестоимость (шт), ₸',
		calcCopyToWaybill: 'Скопировать в накладную',
		calcFromPreset: 'Добавить из шаблона',
		calcPresetSelectedCount: 'Выбрано единиц: {count}',
		calcApproxBadge: 'примерно',
		calcCustomCityNamePh: 'Ваш населённый пункт (село, посёлок…)',
		calcNearestCityLabel: 'Ближайший город (для тарифа)',
		calcBackToCityList: 'Назад к списку городов',
		calcNearestCityHint: 'Выберите ближайший город — по нему рассчитаем тариф',
		calcOtherSettlement: 'Другой населённый пункт',
		calcSectionCities: 'Города',
		calcSectionSettlements: 'Населённые пункты',
		calcSearchingPlaces: 'Ищем населённый пункт…',
		calcApproxHint: 'Тариф рассчитан по ближайшему городу; надбавка — по округу населённого пункта',
		calcBilledPreset: 'по прейскуранту',
		calcResBasePrice: 'Базовая стоимость',
		calcSurchargeLabel: 'Региональная надбавка',
		calcMinTariffNote: 'Применён минимальный тариф {min} ₸',
		presetsNavLink: 'Шаблоны',
		presetsTitle: 'Шаблоны грузов',
		presetsSubtitle: 'Готовая техника: выберите шаблон, количество и город — стоимость считается по габаритам и весу с региональной надбавкой.',
		presetAddButton: 'Новый шаблон',
		presetSeedButton: 'Загрузить стандартные',
		presetCreated: 'Шаблон создан',
		presetUpdated: 'Шаблон обновлён',
		presetSaveError: 'Ошибка при сохранении шаблона',
		presetDeleted: 'Шаблон удалён',
		presetDeleteError: 'Ошибка при удалении шаблона',
		presetSeedDone: 'Загружено шаблонов: {count}',
		presetSeedError: 'Ошибка при загрузке шаблонов',
		presetsEmptyAdmin: 'Шаблонов пока нет',
		presetsEmptyHint: 'Создайте шаблон или загрузите стандартный набор',
		presetHiddenBadge: 'Скрыт',
		presetHideAction: 'Скрыть из калькулятора',
		presetShowAction: 'Показать в калькуляторе',
		presetDeleteTitle: 'Удалить шаблон?',
		presetConfirmDelete: 'Шаблон будет удалён без возможности восстановления.',
		presetNameLabel: 'Название',
		presetCategoryLabel: 'Категория',
		presetSortLabel: 'Порядок',
		presetLengthLabel: 'Длина, см',
		presetWidthLabel: 'Ширина, см',
		presetHeightLabel: 'Высота, см',
		presetWeightLabel: 'Вес, кг',
		presetBasePriceLabel: 'Базовая цена, ₸',
		presetGoodsPriceLabel: 'Стоимость товара, ₸',
		presetGoodsPriceHint: 'За единицу. Не влияет на цену доставки, клиентам не видна.',
		presetImageUrlLabel: 'Ссылка на фото',
		presetActiveLabel: 'Показывать в калькуляторе',
		presetSaveButton: 'Сохранить',
		presetSearchPlaceholder: 'Поиск по названию…',
		presetNothingFound: 'Шаблоны не найдены',
		homeHeroBadge: 'Грузоперевозки онлайн',
		homeHeroTitle: 'Доставка и отслеживание грузов',
		homeHeroSubtitle: 'Отслеживайте отправления в реальном времени и рассчитывайте ориентировочную стоимость доставки',
		tabTrack: 'Отслеживание груза',
		tabCalc: 'Калькулятор доставки',
		openMenu: 'Открыть меню',
		closeMenu: 'Закрыть меню',
		calcNamePh: 'напр. Электровелосипеды SK8',
		wvSenderName: 'Укажите ФИО отправителя',
		wvCompanyName: 'Укажите название компании-отправителя',
		wvSenderAddress: 'Укажите адрес отправителя',
		wvSenderCity: 'Укажите город отправителя',
		wvReceiverName: 'Укажите ФИО получателя',
		wvPhone: 'Проверьте телефон получателя',
		wvDeliveryAddress: 'Укажите адрес доставки',
		wvDeliveryCity: 'Укажите город доставки',
		wvNature: 'Укажите характер груза',
		wsDraft: 'Черновик',
		wsActive: 'Активна / В работе',
		wsDelivered: 'Доставлена',
		wsCancelled: 'Отменена',
		secRoute: 'Маршрут',
		secDates: 'Даты',
		secPayment: 'Оплата и доставка',
		secInfo: 'Информация',
		folderLabel: 'Папка',
		folderInBadge: 'В папке',
		presetGoodsShort: 'товар',
		wfSenderTitle: 'Отправитель',
		wfSenderHint: 'По умолчанию — реквизиты склада ЛТТ в Алматы',
		wfSenderName: 'ФИО отправителя',
		wfSenderNamePh: 'Иванов Иван Иванович',
		wfSenderType: 'Тип отправителя',
		wfIndividual: 'Физлицо',
		wfCompany: 'Компания',
		wfCompanyName: 'Название компании',
		wfCompanyNamePh: 'ТОО «…»',
		wfCompanyTin: 'ИНН / БИН',
		wfDigitsOnly: 'Только цифры',
		wfContactPerson: 'Контактное лицо',
		wfSenderAddress: 'Адрес отправителя',
		wfCity: 'Город',
		wfCountry: 'Страна',
		wfReceiverTitle: 'Получатель',
		wfReceiverHint: 'Телефон используется для уведомления клиента',
		wfReceiverFullName: 'Фамилия, Имя, Отчество',
		wfReceiverNamePh: 'Троценко Никита Алексеевич',
		wfPhone: 'Телефон',
		wfReceiverTin: 'ИНН / ИИН',
		wfOptional: 'Необязательно',
		wfPassport: 'Паспорт',
		wfDeliveryAddress: 'Полный адрес доставки',
		wfAddressPh: 'г. Казань, ул. Южно-промышленная 30А',
		wfDeliveryCountry: 'Страна доставки',
		wfPrivacyNote: 'ИНН и паспорт необязательны; хранятся в защищённом виде, доступ по ролям.',
		wfCargoTitle: 'Описание отправления',
		wfCargoHint: 'Характер груза, позиции, вес и объём',
		wfNature: 'Характер груза',
		wfNaturePh: 'или введите свой характер груза',
		wfPositions: 'Позиции груза',
		wfPositionsUnit: '{count} поз.',
		wfPositionNamePh: 'Наименование (напр. Электровелосипеды SK8)',
		wfRemovePosition: 'Удалить позицию',
		wfQty: 'Кол-во, шт',
		wfDims: 'Габариты, см (Д × Ш × В)',
		wfPlaceWeight: 'Вес места, кг',
		wfCost: 'Стоимость, ₸',
		wfPositionVolume: 'Объём позиции:',
		wfPositionWeight: 'Вес позиции:',
		wfAddPosition: 'Добавить позицию',
		wfTotalWeight: 'Общий вес (авто)',
		wfVolume: 'Объём',
		wfManualVolume: 'ввести вручную',
		wfPackaging: 'Соответствие упаковки',
		wfYes: 'Да',
		wfNo: 'Нет',
		wfInstructions: 'Спец-инструкция',
		wfInstructionsPh: 'Особые условия перевозки…',
		wfPaymentTitle: 'Оплата',
		wfPayer: 'Кто оплачивает',
		wfPayMethod: 'Способ оплаты',
		wfCash: 'Наличный',
		wfCashless: 'Безналичный',
		wfAmount: 'Сумма к оплате',
		wfAmountHint: 'Подставляется автоматически из калькулятора (Блок №3).',
		wfExtrasTitle: 'Дополнительные реквизиты',
		wfAcceptanceDate: 'Дата приёма груза',
		wfShipmentDate: 'Дата отправки груза',
		wfExtrasNote: 'Дата отправки и сроки доставки попадают в PDF-накладную (кнопка «Скачать PDF») и в карточку груза.',
		wfNumberLabel: 'Номер накладной',
		wfNumberPending: 'присвоится при сохранении',
		wpStep1: 'Отправитель и получатель',
		wpStep2: 'Груз, оплата и расчёт',
		wpStep3: 'Итог и отправка',
		wpStepOf: 'Шаг {step} из {total} · {title}',
		wpWaybill: 'Накладная',
		wpNotFound: 'Накладная не найдена.',
		wpToList: 'К списку накладных',
		wpNumberError: 'Не удалось получить номер накладной',
		wpCalcFilled: 'Вес и объём переданы в калькулятор',
		wpCalcCopied: 'Данные калькулятора скопированы в накладную',
		wpSaved: 'Накладная №{number} сохранена',
		wpSaveError: 'Не удалось сохранить накладную',
		wpCleared: 'Форма очищена',
		wpDeleted: 'Накладная №{number} удалена',
		wpDeleteError: 'Не удалось удалить накладную',
		wpSaving: 'Сохранение…',
		wpSave: 'Сохранить накладную',
		wpDownloadPdf: 'Скачать PDF',
		wpNotifyClient: 'Уведомить клиента',
		wpNotifyDisabled: 'Канал уведомлений пока не подключён',
		wpClear: 'Очистить',
		wpBack: 'Назад',
		wpNext: 'Далее',
		wpCalcTitle: 'Калькулятор стоимости',
		wpCalcHint: 'Итог → «Сумма к оплате». Кнопка «{copy}» переносит габариты, название и себестоимость в накладную.',
		wpFillFromWaybill: 'Заполнить из накладной →',
		wpLogistTitle: 'Данные для логистов',
		wpLogistHint: 'Автосводка по накладной — скопировать или отправить',
		wlLoadError: 'Не удалось загрузить накладные',
		wlSearchPh: 'Номер, ФИО, телефон, город или характер груза',
		wlPayerSender: 'платит отправитель',
		wlPayerReceiver: 'платит получатель',
		wlPdfAria: 'Скачать PDF накладной №{number}',
		wlEmpty: 'Накладных пока нет',
		wlEmptyHint: 'Создайте первую — она сохранится в базе и появится здесь',
		wlAccepted: 'приём {date}',
		wbChecking: 'Проверяем накладную…',
		wbNone: 'К этому грузу накладная не привязана. Накладная создаётся в разделе «Накладные» — груз в трекере появляется автоматически.',
		wbReceiverPhone: 'Телефон получателя',
		wbPlacesWeight: 'Мест / вес',
		wbPackaging: 'Упаковка',
		wbPackagingOk: 'соответствует',
		wbPackagingBad: 'не соответствует',
		lsHint: 'Сводка собирается автоматически из накладной (Блок №1). Формат — по образцу заказчика.',
		lsCopy: 'Скопировать',
		lsSend: 'Отправить логисту',
		lsSendDisabled: 'Канал отправки пока не подключён',
		lsSendNote: 'Отправка появится после согласования канала (WhatsApp Business API / Telegram / e-mail). Пока — «Скопировать».',
		phCountry: 'Выбрать страну',
		phCountrySearch: 'Поиск страны…',
		phNumber: 'Номер телефона',
		phInvalid: 'Введите корректный номер телефона',
		tabTrackShort: 'Отслеживание',
		tabCalcShort: 'Калькулятор',
	},
	kk: {
		headerSubtitle: 'Логистика және жеткізу',
		goHome: 'Басты бетке',
		themeDark: 'Қараңғы тақырып',
		themeLight: 'Ашық тақырып',
		logout: 'Шығу',
		realtimeBadge: 'Нақты уақытта бақылау',
		heroTitle: 'Жүгіңіз қайда',
		heroSubtitle: 'Трек-нөмірді енгізіп, жеткізу мәртебесін алыңыз',
		trackInputPlaceholder: 'Трек-нөмір немесе жөнелтім нөмірі...',
		trackButton: 'Жүкті бақылау',
		searching: 'Іздеу...',
		featureInstant: 'Жылдам іздеу',
		featureRealtime: 'Нақты уақыт',
		featureSecure: 'Қауіпсіз',
		cargoStatusLabel: 'Жүк мәртебесі',
		trackNumberLabel: 'Трек-нөмір',
		routeLabel: 'Маршрут',
		fromLabel: 'Қайдан',
		currentLabel: 'Қазір',
		toLabel: 'Қайда',
		stagesLabel: 'Жеткізу кезеңдері',
		newSearchButton: 'Жаңа іздеу',
		statusWaiting: 'Жөнелтілуін күтуде',
		statusInTransit: 'Жолда',
		statusArrived: 'Жетті',
		enterCargoId: 'Жүк идентификаторын енгізіңіз',
		cargoNotFound: 'Жүк табылмады',
		trackLinkNotFound:
			'№{id} жүк табылмады. Жүкқұжаттағы нөмірді тексеріңіз немесе бізге хабарласыңыз — жүк әлі қабылданбаған болуы мүмкін.',
		searchError: 'Жүкті іздеу кезінде қате',
		cargoFound: 'Жүк табылды!',
		adminPanelTitle: 'Әкімші панелі',
		loginInput: 'Логин',
		passwordInput: 'Құпия сөз',
		wrongCredentials: 'Логин немесе құпия сөз қате',
		loggingIn: 'Кіруде...',
		loginButton: 'Панельге кіру',
		adminNavTitle: 'Әкімші панелі',
		adminNavSubtitle: 'Әкімші панелі',
		newCargoTitle: 'Жаңа жүк',
		fromFormLabel: 'ҚАЙДАН',
		toFormLabel: 'ҚАЙДА',
		cargoNumberLabel: 'НӨМІР',
		enterCargoNumber: 'Мыс.: 1899',
		cargoNameLabel: 'ЖҮК АТАУЫ',
		statusFormLabel: 'МӘРТЕБЕ',
		creating: 'Жасалуда...',
		createCargoButton: 'Жүк жасау',
		createWaybillButton: 'Жүкқұжат жасау',
		waybillsNavLink: 'Жүкқұжаттар',
		cargosTitle: 'Жүктер',
		foundCount: 'Табылды: {found} / {total}',
		totalCount: 'Барлығы: {total}',
		searchPlaceholder: 'Трек, атау, қала, мәртебе бойынша іздеу...',
		cargoNameCardLabel: 'Жүк атауы',
		enterName: 'Атауды енгізіңіз...',
		saveButton: 'Сақтау',
		trackCardLabel: 'Трек-нөмір',
		copied: 'Көшірілді',
		fromCardLabel: 'Қайдан',
		currentLocationLabel: 'Ағымдағы орын',
		toCardLabel: 'Қайда',
		statusCardLabel: 'Мәртебе',
		deleteButton: 'Жою',
		noName: 'Атауы жоқ',
		noCargos: 'Жүктер жоқ',
		createFirstCargo: 'Сол жақ панельде бірінші жүкті жасаңыз',
		nothingFound: 'Ештеңе табылмады',
		tryAnotherQuery: 'Басқа сұраным енгізіп көріңіз',
		cityDeparture: 'Жөнелту қаласы',
		cityDelivery: 'Жеткізу қаласы',
		selectCity: 'Қаланы таңдаңыз',
		otherCity: 'Басқа қала',
		enterCityManually: 'Қала атауын енгізіңіз',
		selectCountry: 'Елді таңдаңыз',
		otherCountry: 'Басқа ел',
		enterCountryManually: 'Ел атауын енгізіңіз',
		statusOptionWaiting: 'Жөнелтілуін күтуде',
		statusOptionInTransit: 'Жолда',
		statusOptionArrived: 'Жетті',
		countryKZ: '🇰🇿 Қазақстан',
		countryRU: '🇷🇺 Ресей',
		countryBY: '🇧🇾 Беларусь',
		loadError: 'Жүктерді жүктеу кезінде қате',
		fillAllFields: 'Барлық өрістерді толтырыңыз',
		cargoCreated: 'Жүк жасалды! ID: {id}',
		createError: 'Жүк жасау кезінде қате',
		statusUpdated: 'Мәртебе жаңартылды',
		statusUpdateError: 'Мәртебені жаңарту кезінде қате',
		cityEmpty: 'Қала бос болмауы керек',
		cityUpdated: 'Қала жаңартылды',
		cityUpdateError: 'Қаланы жаңарту кезінде қате',
		nameUpdated: 'Атау жаңартылды',
		nameUpdateError: 'Атауды жаңарту кезінде қате',
		cargoDeleted: 'Жүк жойылды',
		deleteError: 'Жүкті жою кезінде қате',
		confirmDelete: 'Сіз сенімдісіз бе? Бұл әрекетті кері қайтару мүмкін емес.',
		footer: 'Leader Trans Team © 2026',
		adminFooter: 'Leader Trans Team © 2026 • Әкімші панелі',
		acceptanceDateLabel: 'Қабылдау күні',
		shipmentDateLabel: 'Жөнелту күні',
		deliveryTimeframeLabel: 'Жеткізу мерзімі',
		deliveryAmountLabel: 'Жеткізу сомасы',
		paymentStatusLabel: 'Төлем мәртебесі',
		partialPaymentDetailLabel: 'Төлем егжей-тегжейі',
		currencyLabel: 'Валюта',
		paymentNone: 'Төлем жоқ',
		paymentPartial: 'Ішінара төлем',
		paymentFull: 'Толық төлем',
		currencyKZT: '₸ (Теңге)',
		currencyRUB: '₽ (Рубль)',
		unitDays: 'күн',
		unitWeeks: 'апта',
		unitMonths: 'ай',
		detailsLabel: 'Мәліметтер',
		enterTimeframe: 'Мыс.: 10–14 күн',
		enterAmount: 'Соманы енгізіңіз',
		enterPaymentDetail: '15 000',
		notSpecified: 'Көрсетілмеген',
		detailsUpdated: 'Деректер жаңартылды',
		detailsUpdateError: 'Жаңарту кезінде қате',
		backToList: 'Тізімге қайту',
		cargoDetailTitle: 'Жүк мәліметтері',
		cancelButton: 'Болдырмау',
		editButton: 'Өңдеу',
		filterAll: 'Барлығы',
		pageOf: '{pages} беттің {page}',
		createHintFrom: 'Жөнелту қаласын көрсетіңіз',
		createHintTo: 'Жеткізу қаласын көрсетіңіз',
		createHintBoth: 'Жөнелту және жеткізу қалаларын көрсетіңіз',
		loggedOut: 'Жүйеден шықтыңыз',
		confirmLogoutTitle: 'Жүйеден шығу керек пе?',
		confirmLogoutDesc: 'Сіз кіру бетіне ораласыз.',
		foldersNavLink: 'Папкалар',
		foldersTitle: 'Папкалар',
		foldersCount: '{count} белсенді',
		newFolderButton: 'Жаңа папка',
		newFolderTitle: 'Жаңа папка',
		folderNamePlaceholder: 'Мыс.: Консол 1, Көлік Алматы — Мәскеу',
		folderNameEmpty: 'Атау бос болмауы керек',
		folderCreated: 'Папка жасалды',
		folderCreateError: 'Папка жасау кезінде қате',
		folderRenamed: 'Папка атауы өзгертілді',
		folderRenameError: 'Атауды өзгерту кезінде қате',
		folderDeleted: 'Папка жойылды',
		folderDeleteError: 'Папканы жою кезінде қате',
		confirmDeleteFolder: 'Папканы жою керек пе? Ішіндегі жүктер сақталады, тек ажыратылады.',
		noFolders: 'Папкалар әлі жоқ',
		createFirstFolder: 'Бірінші папканы жасаңыз — мысалы, рейс немесе көлік үшін',
		folderEmptyCargos: 'Бұл папкада жүктер әзірге жоқ',
		folderActiveCount: 'Белсенді: {count}',
		folderTotalCargos: 'Барлығы: {count}',
		addCargosTitle: 'Нөмірлер бойынша жүктер қосу',
		addCargosHint: 'Нөмірлерді үтір, бос орын немесе Enter арқылы енгізіңіз. Мыс.: 1899, 1889, 1891',
		addCargosPlaceholder: '1899, 1889, 1891',
		addCargosButton: 'Қосу',
		cargosAddedToast: 'Қосылды: {count}',
		cargosNotFoundToast: 'Табылмады: {numbers}',
		cargosAlreadyDeliveredToast: 'Жеткізілген: {numbers}',
		cargosAlreadyInFolderToast: 'Бұл папкада бар: {numbers}',
		cargosMovedToast: 'Басқа папкадан көшірілді: {numbers}',
		confirmArrivedTitle: 'Жеткізілді деп белгілеу керек пе?',
		confirmArrivedDescription: 'Жүк папкадағы белсенділерден кетіп, «Жеткізілген» бөліміне ауысады.',
		confirmArrivedYes: 'Иә, жеткізілді',
		dangerZoneTitle: 'Қауіпті аймақ',
		dangerZoneDescription: 'Жүкті жоюды кері қайтару мүмкін емес.',
		bulkUpdateTitle: 'Жаппай жаңарту',
		bulkUpdateHint: 'Өзгерістер папкадағы барлық белсенді жүктерге қолданылады',
		bulkUpdateButton: 'Барлығына қолдану',
		bulkUpdatedToast: 'Жаңартылды: {count}',
		bulkUpdateError: 'Жаппай жаңарту кезінде қате',
		bulkNothingToUpdate: 'Кемінде бір өрісті таңдаңыз',
		removeFromFolderButton: 'Папкадан алып тастау',
		removeFromFolderError: 'Ажырату кезінде қате',
		folderTabActive: 'Белсенді',
		folderTabDelivered: 'Жеткізілген',
		folderTabAll: 'Барлығы',
		renameFolderButton: 'Атауын өзгерту',
		saveFolderName: 'Сақтау',
		openFolderButton: 'Ашу',
		calcNavLink: 'Калькулятор',
		calcTitle: 'Жеткізу калькуляторы',
		calcSubtitle: 'Алматыдан Ресей бойынша жүкті жеткізудің болжамды құны мен мерзімін есептеңіз',
		calcBadge: 'Құнды есептеу',
		calcOriginLabel: 'Қайдан',
		calcOriginValue: 'Алматы, Қазақстан',
		calcDestLabel: 'Қайда',
		calcDestPlaceholder: 'Жеткізу қаласын таңдаңыз',
		calcDestSearch: 'Қаланы енгізе бастаңыз…',
		calcOtherCityOption: 'Басқа қала (болжам)',
		calcCustomCityHint: '«{city}» ретінде есептеу (шамамен)',
		calcNoResults: 'Қала табылмады',
		calcModeTotals: 'Көлем мен салмақ',
		calcModeDimensions: 'Габариттер бойынша',
		calcVolumeLabel: 'Жалпы көлемі, м³',
		calcWeightLabel: 'Жалпы салмағы, кг',
		calcVolumePh: 'мыс. 5',
		calcWeightPh: 'мыс. 1200',
		calcUnitLabel: 'Габарит өлшемдері',
		calcUnitMeters: 'метр',
		calcUnitCm: 'см',
		calcPlaceTitle: '{n}-орын',
		calcDimLength: 'Ұзындығы',
		calcDimWidth: 'Ені',
		calcDimHeight: 'Биіктігі',
		calcDimWeight: 'Орын салмағы, кг',
		calcDimQty: 'Саны, дана',
		calcPlaceVolume: 'Көлемі: {v} м³ × {q} = {total} м³',
		calcAddPlace: 'Орын қосу',
		calcRemove: 'Жою',
		calcResultTitle: 'Есептеу нәтижесі',
		calcResCity: 'Жеткізу қаласы',
		calcResPlaces: 'Орын саны',
		calcResVolume: 'Жалпы көлемі',
		calcResWeight: 'Жалпы салмағы',
		calcResPaidWeight: 'Есептік салмақ',
		calcResPrice: 'Болжамды құны',
		calcResDays: 'Жеткізу мерзімі',
		calcBilledWeight: 'салмақ бойынша',
		calcBilledVolume: 'көлем бойынша',
		calcTariffBasis: 'Тарификация',
		calcApproxNote: 'Шамамен: қала тариф анықтамалығында жоқ',
		calcExcludedTitle: 'Жеткізу қолжетімсіз',
		calcExcludedDesc: 'Бұл бағытқа тасымалдау жүзеге асырылмайды',
		calcEmptyHint: 'Есептеуді көру үшін жүк деректерін толтырыңыз',
		calcSelectCityHint: 'Жеткізу қаласын таңдаңыз',
		calcFillCargoHint: 'Жүктің көлемі мен салмағын көрсетіңіз',
		calcDisclaimer: 'Есеп болжамды. Нақты құнды менеджерден нақтылаңыз.',
		calcBackToTracking: 'Бақылауға',
		calcPlacesUnit: 'дана',
		calcModePresets: 'Үлгілер',
		calcModeCustom: 'Өз жүгім',
		calcKg: 'кг',
		calcPresetsEmpty: 'Үлгілер әлі жүктелмеген',
		calcPresetQtyLabel: 'Саны',
		calcPresetSelect: 'Таңдау',
		calcCustomCargoButton: 'Өз жүгім',
		calcCustomCargoHint: 'Өз өлшемдеріңіз бен салмағыңызды енгізіңіз',
		calcCargoName: 'Техника атауы',
		calcCargoUnitCost: 'Өзіндік құны (дана), ₸',
		calcCopyToWaybill: 'Жүкқұжатқа көшіру',
		calcFromPreset: 'Үлгіден қосу',
		calcPresetSelectedCount: 'Таңдалған бірлік: {count}',
		calcApproxBadge: 'шамамен',
		calcCustomCityNamePh: 'Сіздің елді мекеніңіз (ауыл, кент…)',
		calcNearestCityLabel: 'Жақын қала (тариф үшін)',
		calcBackToCityList: 'Қалалар тізіміне қайту',
		calcNearestCityHint: 'Жақын қаланы таңдаңыз — тариф сол бойынша есептеледі',
		calcOtherSettlement: 'Басқа елді мекен',
		calcSectionCities: 'Қалалар',
		calcSectionSettlements: 'Елді мекендер',
		calcSearchingPlaces: 'Елді мекенді іздеудеміз…',
		calcApproxHint: 'Тариф ең жақын қала бойынша; үстеме — елді мекеннің округі бойынша',
		calcBilledPreset: 'прейскурант бойынша',
		calcResBasePrice: 'Базалық құны',
		calcSurchargeLabel: 'Аймақтық үстеме',
		calcMinTariffNote: 'Ең төмен тариф қолданылды: {min} ₸',
		presetsNavLink: 'Үлгілер',
		presetsTitle: 'Жүк үлгілері',
		presetsSubtitle: 'Дайын техника: үлгіні, санын және қаланы таңдаңыз — құны габариттер мен салмаққа қарай аймақтық үстемемен есептеледі.',
		presetAddButton: 'Жаңа үлгі',
		presetSeedButton: 'Стандартты жүктеу',
		presetCreated: 'Үлгі жасалды',
		presetUpdated: 'Үлгі жаңартылды',
		presetSaveError: 'Үлгіні сақтау кезінде қате',
		presetDeleted: 'Үлгі жойылды',
		presetDeleteError: 'Үлгіні жою кезінде қате',
		presetSeedDone: 'Жүктелген үлгілер: {count}',
		presetSeedError: 'Үлгілерді жүктеу кезінде қате',
		presetsEmptyAdmin: 'Үлгілер әзірге жоқ',
		presetsEmptyHint: 'Үлгі жасаңыз немесе стандартты жинақты жүктеңіз',
		presetHiddenBadge: 'Жасырын',
		presetHideAction: 'Калькулятордан жасыру',
		presetShowAction: 'Калькуляторда көрсету',
		presetDeleteTitle: 'Үлгіні жою керек пе?',
		presetConfirmDelete: 'Үлгі қалпына келтірілмей жойылады.',
		presetNameLabel: 'Атауы',
		presetCategoryLabel: 'Санаты',
		presetSortLabel: 'Реті',
		presetLengthLabel: 'Ұзындығы, см',
		presetWidthLabel: 'Ені, см',
		presetHeightLabel: 'Биіктігі, см',
		presetWeightLabel: 'Салмағы, кг',
		presetBasePriceLabel: 'Базалық баға, ₸',
		presetGoodsPriceLabel: 'Тауар құны, ₸',
		presetGoodsPriceHint: 'Бір бірлікке. Жеткізу бағасына әсер етпейді, клиенттерге көрінбейді.',
		presetImageUrlLabel: 'Фото сілтемесі',
		presetActiveLabel: 'Калькуляторда көрсету',
		presetSaveButton: 'Сақтау',
		presetSearchPlaceholder: 'Атауы бойынша іздеу…',
		presetNothingFound: 'Үлгілер табылмады',
		homeHeroBadge: 'Жүк тасымалы онлайн',
		homeHeroTitle: 'Жүкті жеткізу және бақылау',
		homeHeroSubtitle: 'Жөнелтілімдерді нақты уақытта бақылаңыз және жеткізудің болжамды құнын есептеңіз',
		tabTrack: 'Жүкті бақылау',
		tabCalc: 'Жеткізу калькуляторы',
		openMenu: 'Мәзірді ашу',
		closeMenu: 'Мәзірді жабу',
		calcNamePh: 'мыс. Электровелосипедтер SK8',
		wvSenderName: 'Жіберушінің аты-жөнін көрсетіңіз',
		wvCompanyName: 'Жіберуші компанияның атауын көрсетіңіз',
		wvSenderAddress: 'Жіберушінің мекенжайын көрсетіңіз',
		wvSenderCity: 'Жіберушінің қаласын көрсетіңіз',
		wvReceiverName: 'Алушының аты-жөнін көрсетіңіз',
		wvPhone: 'Алушының телефонын тексеріңіз',
		wvDeliveryAddress: 'Жеткізу мекенжайын көрсетіңіз',
		wvDeliveryCity: 'Жеткізу қаласын көрсетіңіз',
		wvNature: 'Жүк сипатын көрсетіңіз',
		wsDraft: 'Жоба',
		wsActive: 'Белсенді / Жұмыста',
		wsDelivered: 'Жеткізілді',
		wsCancelled: 'Болдырылмады',
		secRoute: 'Бағыт',
		secDates: 'Күндер',
		secPayment: 'Төлем және жеткізу',
		secInfo: 'Ақпарат',
		folderLabel: 'Қалта',
		folderInBadge: 'Қалтада',
		presetGoodsShort: 'тауар',
		wfSenderTitle: 'Жіберуші',
		wfSenderHint: 'Әдепкі бойынша — Алматыдағы ЛТТ қоймасының деректемелері',
		wfSenderName: 'Жіберушінің аты-жөні',
		wfSenderNamePh: 'Иванов Иван Иванович',
		wfSenderType: 'Жіберуші түрі',
		wfIndividual: 'Жеке тұлға',
		wfCompany: 'Компания',
		wfCompanyName: 'Компания атауы',
		wfCompanyNamePh: 'ЖШС «…»',
		wfCompanyTin: 'ЖСН / БСН',
		wfDigitsOnly: 'Тек сандар',
		wfContactPerson: 'Байланыс тұлғасы',
		wfSenderAddress: 'Жіберушінің мекенжайы',
		wfCity: 'Қала',
		wfCountry: 'Ел',
		wfReceiverTitle: 'Алушы',
		wfReceiverHint: 'Телефон клиентке хабарлама жіберу үшін қолданылады',
		wfReceiverFullName: 'Тегі, Аты, Әкесінің аты',
		wfReceiverNamePh: 'Троценко Никита Алексеевич',
		wfPhone: 'Телефон',
		wfReceiverTin: 'ИНН / ЖСН',
		wfOptional: 'Міндетті емес',
		wfPassport: 'Төлқұжат',
		wfDeliveryAddress: 'Жеткізудің толық мекенжайы',
		wfAddressPh: 'Қазан қ., Южно-промышленная көш. 30А',
		wfDeliveryCountry: 'Жеткізу елі',
		wfPrivacyNote: 'ЖСН мен төлқұжат міндетті емес; қорғалған түрде сақталады, рөлдер бойынша қолжетімді.',
		wfCargoTitle: 'Жүктеме сипаттамасы',
		wfCargoHint: 'Жүк сипаты, позициялар, салмағы және көлемі',
		wfNature: 'Жүк сипаты',
		wfNaturePh: 'немесе өз жүк сипатыңызды енгізіңіз',
		wfPositions: 'Жүк позициялары',
		wfPositionsUnit: '{count} поз.',
		wfPositionNamePh: 'Атауы (мыс. Электровелосипедтер SK8)',
		wfRemovePosition: 'Позицияны жою',
		wfQty: 'Саны, дана',
		wfDims: 'Габариттер, см (Ұ × Е × Б)',
		wfPlaceWeight: 'Орын салмағы, кг',
		wfCost: 'Құны, ₸',
		wfPositionVolume: 'Позиция көлемі:',
		wfPositionWeight: 'Позиция салмағы:',
		wfAddPosition: 'Позиция қосу',
		wfTotalWeight: 'Жалпы салмағы (авто)',
		wfVolume: 'Көлемі',
		wfManualVolume: 'қолмен енгізу',
		wfPackaging: 'Қаптаманың сәйкестігі',
		wfYes: 'Иә',
		wfNo: 'Жоқ',
		wfInstructions: 'Арнайы нұсқау',
		wfInstructionsPh: 'Тасымалдаудың ерекше шарттары…',
		wfPaymentTitle: 'Төлем',
		wfPayer: 'Кім төлейді',
		wfPayMethod: 'Төлем әдісі',
		wfCash: 'Қолма-қол',
		wfCashless: 'Қолма-қол емес',
		wfAmount: 'Төлеуге жататын сома',
		wfAmountHint: 'Калькулятордан автоматты қойылады (№3 блок).',
		wfExtrasTitle: 'Қосымша деректемелер',
		wfAcceptanceDate: 'Жүкті қабылдау күні',
		wfShipmentDate: 'Жүкті жіберу күні',
		wfExtrasNote: 'Жіберу күні мен жеткізу мерзімі PDF-жүкқұжатқа («PDF жүктеу» түймесі) және жүк карточкасына түседі.',
		wfNumberLabel: 'Жүкқұжат нөмірі',
		wfNumberPending: 'сақтау кезінде беріледі',
		wpStep1: 'Жіберуші және алушы',
		wpStep2: 'Жүк, төлем және есептеу',
		wpStep3: 'Қорытынды және жіберу',
		wpStepOf: '{total} қадамнан {step}-і · {title}',
		wpWaybill: 'Жүкқұжат',
		wpNotFound: 'Жүкқұжат табылмады.',
		wpToList: 'Жүкқұжаттар тізіміне',
		wpNumberError: 'Жүкқұжат нөмірін алу мүмкін болмады',
		wpCalcFilled: 'Салмақ пен көлем калькуляторға берілді',
		wpCalcCopied: 'Калькулятор деректері жүкқұжатқа көшірілді',
		wpSaved: '№{number} жүкқұжат сақталды',
		wpSaveError: 'Жүкқұжатты сақтау мүмкін болмады',
		wpCleared: 'Форма тазартылды',
		wpDeleted: '№{number} жүкқұжат жойылды',
		wpDeleteError: 'Жүкқұжатты жою мүмкін болмады',
		wpSaving: 'Сақталуда…',
		wpSave: 'Жүкқұжатты сақтау',
		wpDownloadPdf: 'PDF жүктеу',
		wpNotifyClient: 'Клиентке хабарлау',
		wpNotifyDisabled: 'Хабарлама арнасы әзірге қосылмаған',
		wpClear: 'Тазарту',
		wpBack: 'Артқа',
		wpNext: 'Әрі қарай',
		wpCalcTitle: 'Құн калькуляторы',
		wpCalcHint: 'Қорытынды → «Төлеуге жататын сома». «{copy}» түймесі габариттерді, атауын және өзіндік құнын жүкқұжатқа көшіреді.',
		wpFillFromWaybill: 'Жүкқұжаттан толтыру →',
		wpLogistTitle: 'Логистерге арналған деректер',
		wpLogistHint: 'Жүкқұжат бойынша авто-жиынтық — көшіріңіз немесе жіберіңіз',
		wlLoadError: 'Жүкқұжаттарды жүктеу мүмкін болмады',
		wlSearchPh: 'Нөмір, аты-жөні, телефон, қала немесе жүк сипаты',
		wlPayerSender: 'жіберуші төлейді',
		wlPayerReceiver: 'алушы төлейді',
		wlPdfAria: '№{number} жүкқұжаттың PDF-ін жүктеу',
		wlEmpty: 'Жүкқұжаттар әзірге жоқ',
		wlEmptyHint: 'Біріншісін жасаңыз — ол дерекқорда сақталып, осында көрінеді',
		wlAccepted: 'қабылдау {date}',
		wbChecking: 'Жүкқұжат тексерілуде…',
		wbNone: 'Бұл жүкке жүкқұжат тіркелмеген. Жүкқұжат «Жүкқұжаттар» бөлімінде жасалады — жүк трекерде автоматты пайда болады.',
		wbReceiverPhone: 'Алушының телефоны',
		wbPlacesWeight: 'Орын / салмақ',
		wbPackaging: 'Қаптама',
		wbPackagingOk: 'сәйкес келеді',
		wbPackagingBad: 'сәйкес келмейді',
		lsHint: 'Жиынтық жүкқұжаттан автоматты жиналады (№1 блок). Пішімі — тапсырыс беруші үлгісі бойынша.',
		lsCopy: 'Көшіру',
		lsSend: 'Логистке жіберу',
		lsSendDisabled: 'Жіберу арнасы әзірге қосылмаған',
		lsSendNote: 'Жіберу арна келісілгеннен кейін қосылады (WhatsApp Business API / Telegram / e-mail). Әзірге — «Көшіру».',
		phCountry: 'Елді таңдау',
		phCountrySearch: 'Ел іздеу…',
		phNumber: 'Телефон нөмірі',
		phInvalid: 'Дұрыс телефон нөмірін енгізіңіз',
		tabTrackShort: 'Бақылау',
		tabCalcShort: 'Калькулятор',
	},
}

export type TranslationKey = keyof Translations

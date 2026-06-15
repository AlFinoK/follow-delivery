export type Lang = 'ru' | 'kk'

export type Translations = {
	// Header/Nav
	headerSubtitle: string
	goHome: string
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
	// Admin status options
	statusOptionWaiting: string
	statusOptionInTransit: string
	statusOptionArrived: string
	// Admin country names
	countryKZ: string
	countryRU: string
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
	// Home hero + tabs
	homeHeroBadge: string
	homeHeroTitle: string
	homeHeroSubtitle: string
	tabTrack: string
	tabCalc: string
	tabTrackShort: string
	tabCalcShort: string
}

export const translations: Record<Lang, Translations> = {
	ru: {
		headerSubtitle: 'Логистика и доставка',
		goHome: 'На главную',
		logout: 'Выйти',
		realtimeBadge: 'Отслеживание в реальном времени',
		heroTitle: 'Где ваш груз',
		heroSubtitle: 'Введите трек-номер и получите актуальный статус доставки',
		trackInputPlaceholder: 'Введите трек-номер...',
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
		statusOptionWaiting: 'Ожидает отправления',
		statusOptionInTransit: 'В пути',
		statusOptionArrived: 'Прибыл',
		countryKZ: '🇰🇿 Казахстан',
		countryRU: '🇷🇺 Россия',
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
		homeHeroBadge: 'Грузоперевозки онлайн',
		homeHeroTitle: 'Доставка и отслеживание грузов',
		homeHeroSubtitle: 'Отслеживайте отправления в реальном времени и рассчитывайте ориентировочную стоимость доставки',
		tabTrack: 'Отслеживание груза',
		tabCalc: 'Калькулятор доставки',
		tabTrackShort: 'Отслеживание',
		tabCalcShort: 'Калькулятор',
	},
	kk: {
		headerSubtitle: 'Логистика және жеткізу',
		goHome: 'Басты бетке',
		logout: 'Шығу',
		realtimeBadge: 'Нақты уақытта бақылау',
		heroTitle: 'Жүгіңіз қайда',
		heroSubtitle: 'Трек-нөмірді енгізіп, жеткізу мәртебесін алыңыз',
		trackInputPlaceholder: 'Трек-нөмірді енгізіңіз...',
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
		statusOptionWaiting: 'Жөнелтілуін күтуде',
		statusOptionInTransit: 'Жолда',
		statusOptionArrived: 'Жетті',
		countryKZ: '🇰🇿 Қазақстан',
		countryRU: '🇷🇺 Ресей',
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
		homeHeroBadge: 'Жүк тасымалы онлайн',
		homeHeroTitle: 'Жүкті жеткізу және бақылау',
		homeHeroSubtitle: 'Жөнелтілімдерді нақты уақытта бақылаңыз және жеткізудің болжамды құнын есептеңіз',
		tabTrack: 'Жүкті бақылау',
		tabCalc: 'Жеткізу калькуляторы',
		tabTrackShort: 'Бақылау',
		tabCalcShort: 'Калькулятор',
	},
}

export type TranslationKey = keyof Translations

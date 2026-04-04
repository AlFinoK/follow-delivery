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
		adminNavSubtitle: 'УПРАВЛЕНИЕ',
		newCargoTitle: 'Новый груз',
		fromFormLabel: 'ОТКУДА',
		toFormLabel: 'КУДА',
		cargoNameLabel: 'НАЗВАНИЕ ГРУЗА',
		statusFormLabel: 'СТАТУС',
		creating: 'Создание...',
		createCargoButton: '✨ Создать груз',
		cargosTitle: 'Грузы',
		foundCount: 'Найдено: {found} из {total}',
		totalCount: 'Всего: {total}',
		searchPlaceholder: 'Поиск по треку, названию, городу, статусу...',
		cargoNameCardLabel: 'НАЗВАНИЕ ГРУЗА',
		enterName: 'Введите название...',
		saveButton: '✓ Сохранить',
		trackCardLabel: 'ТРЕК-НОМЕР',
		copied: '✅ Скопирован!',
		fromCardLabel: 'ОТКУДА',
		currentLocationLabel: 'ТЕКУЩЕЕ МЕСТОПОЛОЖЕНИЕ',
		toCardLabel: 'КУДА',
		statusCardLabel: 'СТАТУС',
		deleteButton: '🗑️ Удалить',
		noName: 'Нет названия',
		noCargos: 'Грузов нет',
		createFirstCargo: 'Создайте первый груз в левой панели',
		nothingFound: 'Ничего не найдено',
		tryAnotherQuery: 'Попробуйте другой запрос',
		cityDeparture: 'Город отправления',
		cityDelivery: 'Город доставки',
		selectCity: 'Выберите город',
		otherCity: '✏️ Другой город...',
		enterCityManually: 'Введите название города',
		statusOptionWaiting: '⏳ Ожидает отправления',
		statusOptionInTransit: '🚚 В пути',
		statusOptionArrived: '✅ Прибыл',
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
	},
	kk: {
		headerSubtitle: 'Логистика және жеткізу',
		goHome: 'Басты бетке',
		logout: 'Шығу',
		realtimeBadge: 'Нақты уақытта бақылау',
		heroTitle: 'Жүкіңіз қайда',
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
		adminNavSubtitle: 'БАСҚАРУ',
		newCargoTitle: 'Жаңа жүк',
		fromFormLabel: 'ҚАЙДАН',
		toFormLabel: 'ҚАЙДА',
		cargoNameLabel: 'ЖҮК АТАУЫ',
		statusFormLabel: 'МӘРТЕБЕ',
		creating: 'Жасалуда...',
		createCargoButton: '✨ Жүк жасау',
		cargosTitle: 'Жүктер',
		foundCount: 'Табылды: {found} / {total}',
		totalCount: 'Барлығы: {total}',
		searchPlaceholder: 'Трек, атау, қала, мәртебе бойынша іздеу...',
		cargoNameCardLabel: 'ЖҮК АТАУЫ',
		enterName: 'Атауды енгізіңіз...',
		saveButton: '✓ Сақтау',
		trackCardLabel: 'ТРЕК-НӨМІР',
		copied: '✅ Көшірілді!',
		fromCardLabel: 'ҚАЙДАН',
		currentLocationLabel: 'АҒЫМДАҒЫ ОРЫН',
		toCardLabel: 'ҚАЙДА',
		statusCardLabel: 'МӘРТЕБЕ',
		deleteButton: '🗑️ Жою',
		noName: 'Атауы жоқ',
		noCargos: 'Жүктер жоқ',
		createFirstCargo: 'Сол жақ панельде бірінші жүкті жасаңыз',
		nothingFound: 'Ештеңе табылмады',
		tryAnotherQuery: 'Басқа сұраным енгізіп көріңіз',
		cityDeparture: 'Жөнелту қаласы',
		cityDelivery: 'Жеткізу қаласы',
		selectCity: 'Қаланы таңдаңыз',
		otherCity: '✏️ Басқа қала...',
		enterCityManually: 'Қала атауын енгізіңіз',
		statusOptionWaiting: '⏳ Жөнелтілуін күтуде',
		statusOptionInTransit: '🚚 Жолда',
		statusOptionArrived: '✅ Жетті',
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
	},
}

export type TranslationKey = keyof Translations

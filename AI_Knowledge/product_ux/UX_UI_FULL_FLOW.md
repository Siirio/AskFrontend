# Ask UX/UI full flow

Этот документ описывает фронтовую часть Ask как единый UX/UI blueprint. Его задача - чтобы по тексту можно было почти полностью представить экран, поведение, логику переходов, состояния, цвета, движения, ограничения и будущую нативную модель.

Документ сознательно не углубляется в Java backend. Backend нужен как стабильный источник данных и статусов, но UX-логика здесь описана так, чтобы ее можно было перенести на новый frontend, на новый backend-for-frontend и в будущие native Android/iOS клиенты.

## 1. Что такое Ask

Ask - это не бот для рассылки в Telegram или WhatsApp. Ask - это платформа запроса наличия товара.

Главная идея:

1. Клиент хочет конкретную вещь, но не хочет обзванивать магазины.
2. Клиент пишет человеческий запрос: "Mammut gainer 5 kg", "крем SPF 50", "масляный фильтр Toyota", "смесь детская 1 банка".
3. Ask понимает, к какой категории может относиться запрос, находит подходящие магазины и отправляет один запрос сразу во многие магазины.
4. Магазины отвечают вручную: есть, нет, нужно уточнить, есть аналог.
5. Клиент получает ответы в одном списке, сравнивает цену, магазин, расстояние, комментарий и открывает 2GIS, WhatsApp, Telegram или Ask-чат.
6. Позже Ask должен уметь получать автоматические ответы от интеграций с Paloma, 1C, re:Kassa, Shopify, POS, CRM и e-commerce системами, но MVP остается ручным и простым.

Главное продуктово: Ask продает не каталог товаров, а спокойное действие "спросить магазины". Поэтому клиент не должен вручную выбирать конкретный товар из длинного списка как в маркетплейсе. Поиск - главный сценарий. Категория - только область поиска.

## 2. Общая визуальная система

Вся текущая frontend-модель сделана как mobile-first prototype. Даже когда проект открыт на desktop, внутри страницы показывается телефонная рамка. Это важно: браузерный prototype должен выглядеть как будущий native smartphone app, а не как desktop dashboard.

Базовая поверхность:

1. Фон страницы теплый ivory, почти молочный: `#fffaf0`.
2. Сверху есть мягкий теплый градиент, который уходит вниз и растворяется. Он не должен быть агрессивным, синим или темным.
3. В центре стоит телефонная рамка:
   - для customer flow около 390 px шириной;
   - для store flow около 412 px шириной;
   - для debug flow до 430 px;
   - высота ограничена примерно 760 px или высотой viewport;
   - углы сильно скруглены, около 32 px;
   - внутри собственный scroll, внешний layout не дергается.
4. Внутри телефона фон бело-ivory, панели в основном белые.
5. Карточки имеют мягкую тень, тонкую warm-brown border и радиусы 18-28 px.
6. Основной текст темно-оливково-коричневый: `#343b1b`.
7. Главный action/accent синий: `#3971b8`.
8. Успешные или нейтрально-позитивные состояния подсвечиваются pastel green: `#c8d69b`.
9. Аналоги, ожидание, мягкие акценты - warm vanilla/yellow: `#f7dfa4` или `#f6e6a5`.
10. Ошибки и destructive action - muted brick red: `#b85743`.

Эта палитра выбрана не случайно. Ask должен ощущаться быстрым, полезным и локальным, а не как темный fintech, не как холодный SaaS и не как тяжелый маркетплейс. Теплый фон снижает тревожность, зеленый сообщает "есть/можно", синий отвечает за действие и доверие, желтый показывает ожидание или альтернативу.

Типографика:

1. Используется системный sans-serif с Trebuchet MS первым в списке.
2. Заголовки жирные, почти black, но не огромные в каждой карточке.
3. Внутри компактных строк текст должен быть коротким, с truncate.
4. Letter spacing у обычных элементов не должен уходить в отрицательные значения.
5. Верхние labels могут иметь uppercase tracking, но это служебные подписи, не основной текст.

Движение:

1. Переходы между основными customer экранами идут через Framer Motion.
2. Новые ответы магазинов появляются с мягким arrival animation.
3. Раскрытие карточки ответа идет вниз по высоте, без резкого скачка.
4. Иконка chevron в карточке ответа поворачивается на 180 градусов при раскрытии.
5. Loading во время dispatch локальный: радары, точки, мягкие шаги.
6. После dispatch loading прекращается. Дальше показывается спокойное ожидание ответов, а не бесконечная "загрузка".

## 3. Верхний shell prototype

На каждой странице сверху за пределами телефонной рамки есть общий header:

1. Слева логотип Ask:
   - синяя округлая квадратная плитка;
   - внутри белая буква `A`;
   - рядом текст `Ask`;
   - под ним контекст текущего экрана: "Клиент", "Магазин", "Admin", "Debug" или "Наличие товаров".
2. Справа есть pill-кнопка `Debug`.
3. При нажатии на логотип пользователь возвращается на prototype home.
4. При нажатии `Debug` открывается debug экран.

Это prototype navigation. В production user-facing frontend верхние `Ask`, `Debug`, customer-flow и store-flow переключатели должны быть убраны или спрятаны в dev/debug окружение. Для пользователя будущего приложения навигация должна быть нативной, а не тестовой.

## 4. Prototype home flow

Путь: `/`

Home - это тестовый hub, а не production landing page.

Внутри телефонной рамки:

1. Вверху маленький brand text `Ask` синим.
2. Ниже большой заголовок: "Найти товар без звонков."
3. Под заголовком короткое пояснение: откройте клиентский и магазинный экраны в двух окнах, чтобы проверить живой сценарий.
4. Ниже вертикальный список из четырех белых карточек-ссылок:
   - `Клиент` - поиск, статус, ответы, чат.
   - `Магазин` - регистрация, входящие заявки, быстрый ответ.
   - `Admin` - продавцы, жалобы, ручная блокировка.
   - `API/debug экран` - base URL, mock mode, request logs.

Поведение:

1. Нажимаешь `Клиент` - открывается customer flow.
2. Нажимаешь `Магазин` - открывается store flow.
3. Нажимаешь `Admin` - открывается admin panel.
4. Нажимаешь `API/debug экран` - открывается debug screen.

На desktop справа от телефона есть дополнительный информационный блок. Он не является главным приложением. Он объясняет тестовый сценарий:

1. Prototype работает в mock mode без backend.
2. API layer готов к Spring Boot.
3. Проверять нужно в mobile Chrome viewport.

В production этот hub не нужен пользователю. Он нужен разработке, демонстрации и ручному тесту customer-store сценария.

## 5. Customer main idea

Customer flow - главный пользовательский сценарий. Клиент не должен думать как оператор магазина или админ каталога. Он должен сделать одно простое действие: написать, что он ищет, и отправить запрос магазинам.

Текущий путь: `/customer`

Customer flow имеет два крупных состояния:

1. Search state - клиент еще не отправил активный запрос.
2. Status/responses state - запрос создан, отправляется или уже отправлен, клиент ждет ответы и работает с feed.

Если у клиента есть несколько активных запросов, между ними можно переключаться через горизонтальную историю.

## 6. Customer search screen

Когда клиент открывает `/customer` и активного запроса нет, он видит мобильный экран поиска.

Визуальная структура сверху вниз:

1. Верхняя строка внутри телефона:
   - слева `Ask` крупным синим текстом;
   - под ним маленькая подпись "Поиск товара";
   - справа notification badge;
   - рядом маленькая pill-кнопка `Магазин` для prototype перехода.
2. Центральный блок занимает основную высоту, чтобы главный action был в фокусе.
3. Большой заголовок: "Найдите товар без звонков."
4. Ниже большая белая карточка ProductSelector.
5. Ниже большая primary кнопка: `Спросить магазины`.
6. Если уже были запросы, ниже появляется горизонтальная история запросов.

ProductSelector состоит из:

1. Search input:
   - высота около 64 px;
   - белый фон;
   - скругление около 22 px;
   - слева иконка Search;
   - placeholder примерами: "Мамут, гейнер 5 кг, крем SPF...";
   - текст запроса сохраняется как raw query, без насильственной замены на товар из каталога.
2. Category/Smart Search block:
   - большая кнопка высотой около 96 px;
   - muted panel background;
   - слева label `Smart Search`;
   - ниже выбранная категория или текст "Выбрать категорию поиска товара";
   - справа белый маленький count badge с количеством matches.

Как пользователь действует:

1. Пользователь нажимает в поле поиска.
2. Клавиатура на телефоне должна подниматься нативно.
3. Пользователь пишет свободный текст: например "Mammut gainer 5kg chocolate".
4. Под капотом Smart Search ищет совпадения по названию, категории и alias словам.
5. Пользователь может вообще не открывать категории. Это нормальный основной flow.
6. Если пользователь хочет сузить область, он нажимает блок `Smart Search`.
7. Открывается full-screen category picker поверх текущего экрана.

Важно: категория не превращается в выбор конкретного товара. Нельзя показывать клиенту primary product list, где он обязан выбрать один SKU. Клиент ищет человеческим запросом, а категория только помогает маршрутизации и ranking.

## 7. Customer category picker

Когда пользователь нажимает категорию в ProductSelector, открывается full-screen overlay.

Визуальная структура overlay:

1. Overlay закрывает весь viewport телефона, а не маленький dropdown.
2. Фон почти белый, `--ask-panel-strong`.
3. Контент ограничен шириной телефона.
4. В верхней строке:
   - слева маленький label `Smart Search`;
   - ниже заголовок "Категория поиска";
   - справа круглая кнопка с иконкой `X`.
5. Ниже muted panel с текущим выбором:
   - если категория выбрана: "Выбрано: Спортпит";
   - если нет: "Категория не выбрана".
6. Ниже вертикальный scroll список category rows.

Каждая category row:

1. Белая карточка высотой около 94 px.
2. Слева реальная или качественная product/category image в квадрате около 70-82 px.
3. Справа крупный жирный label категории.
4. Если категория активна, border синий и вокруг мягкий blue ring.

Категории:

1. Без категории.
2. Автозапчасти.
3. Косметика.
4. Спортпит.
5. Детское питание.
6. Зоотовары.
7. Телефонные аксессуары.

Поведение:

1. Нажимаешь `X` - overlay закрывается, выбор не меняется.
2. Нажимаешь `Без категории` - categoryId становится null, overlay закрывается.
3. Нажимаешь `Спортпит` - запрос остается тем же, categoryId становится `sport_nutrition`, overlay закрывается.
4. Search card теперь показывает выбранную категорию и обновленный match count.

Почему так:

1. Full-screen picker лучше для mobile, чем dropdown, потому что строки с картинками требуют места.
2. Категории с изображениями позволяют быстро понять scope.
3. Выбор категории закрывает overlay сразу, потому что это не сложная форма.
4. Сохранение raw query защищает главный UX: пользователь написал свой запрос, Ask его не перезаписал.

## 8. Customer submit request

Кнопка `Спросить магазины` - главный CTA.

Что происходит при нажатии:

1. Берется текущий raw query.
2. Smart Search ищет лучший match внутри выбранной категории или по всем категориям.
3. Если match найден, он используется как product hint для мок-данных.
4. Если match не найден, но выбрана категория, берется первый fallback product этой категории.
5. Если нет ни match, ни категории, берется initial product.
6. Создается ProductRequest.
7. Статус сначала становится `DISPATCHING`.
8. Запрос добавляется в начало истории.
9. Active customer request переключается на новый запрос.
10. В debug logs добавляется mock `POST /api/v1/product-requests 201`.
11. Через локальную mock задержку около 1200 ms request переходит в `SENT`.
12. После этого планируются симулированные ответы магазинов.

Визуальный переход:

1. Search screen уходит через motion screen transition.
2. Status screen появляется вместо него.
3. Пользователь не видит техническую маршрутизацию.
4. Он видит, что запрос отправляется, потом отправлен, и можно ждать ответы.

Главный contract:

1. Dispatch loading длится только до подтверждения отправки во все текущие доступные магазины.
2. Нельзя оставлять бесконечную загрузку "ищем магазин" после dispatch.
3. После dispatch - спокойное ожидание ответов, потому что ответы магазинов могут приходить постепенно.

## 9. Customer status screen

Когда активный request есть, customer screen меняется.

Верхняя часть:

1. Слева ghost-кнопка `Сделать новый поиск`.
2. Справа notification badge.
3. Ниже горизонтальная история запросов.

Нажимаешь `Сделать новый поиск`:

1. Active customer request сбрасывается.
2. Выбранный chat закрывается.
3. Response filter возвращается в `Все`.
4. Pagination возвращается на первую страницу.
5. Открывается search screen.
6. Старые активные запросы не удаляются, они остаются в истории.

История запросов:

1. Label: "История запросов".
2. Горизонтальный scroll карточек.
3. Каждая карточка минимум 152 px шириной.
4. Активная карточка синяя, текст белый.
5. Неактивная карточка белая с border.
6. В карточке показывается raw query.
7. Под raw query:
   - если есть чаты: "Чаты: N";
   - если нет: "Ответы и статус".

Нажимаешь карточку истории:

1. Этот request становится active.
2. Chat закрывается.
3. Filter сбрасывается на `Все`.
4. Page сбрасывается на первую.
5. Ниже показывается status/progress и ответы именно этого запроса.

## 10. Request progress card

RequestProgress - это основная карточка статуса запроса.

Визуально:

1. Белая карточка с radius около 24 px.
2. Сверху flex row:
   - слева label "Статус запроса";
   - ниже крупный raw query;
   - если category есть, маленький pastel green pill "Категория: X";
   - справа status pill.
3. Ниже grid статусов:
   - full-width timer: "Осталось 2ч 59м" или "Осталось 12м 03с";
   - затем две колонки:
     - "Магазины: N";
     - "Ответы: N".
4. Внизу либо loading animation, либо спокойная линия.

Status pill:

1. Если request status `DISPATCHING`, label должен быть "Отправляем".
2. Если request status уже `SENT` или `PARTIALLY_RESPONDED`, label должен быть "Отправлен".

Loading animation при `DISPATCHING`:

1. В muted panel появляется визуальный блок.
2. Слева круглая белая зона 88 px.
3. В центре маленькая синяя точка.
4. От нее расходятся мягкие radar rings.
5. Рядом маленькие orbit dots: yellow и green.
6. Справа текст "Ищем ответ магазина".
7. Ниже три строки step indicator:
   - "Запрос ушел";
   - "Магазин смотрит наличие";
   - "Ждем ответ".
8. Точки слева от step строк пульсируют с небольшим offset.

После dispatch:

1. Loading block исчезает.
2. Внизу остается тонкая спокойная линия.
3. Пользователь понимает: отправка закончена, теперь ждем реальные ответы.

Почему так:

1. Dispatch - системная короткая операция.
2. Ответ магазина - человеческая операция, ее нельзя показывать как technical spinner.
3. Бесконечный spinner создает тревогу и ложное ощущение, что backend еще что-то делает.

## 11. Customer cancel request

Под RequestProgress есть danger button `Отменить запрос`.

Нажимаешь `Отменить запрос`:

1. Сразу не удаляем.
2. Появляется confirmation card:
   - заголовок "Удалить этот запрос?";
   - описание, что ответы и чат по этому запросу исчезнут из текущей истории;
   - две кнопки: `Оставить` и `Удалить`.

Нажимаешь `Оставить`:

1. Confirmation card закрывается.
2. Request остается.

Нажимаешь `Удалить`:

1. Request удаляется из runtime списка.
2. Responses этого request удаляются.
3. Chat messages этого request удаляются.
4. Reply attempts этого request удаляются.
5. Active request переключается на первый оставшийся request или null.
6. В debug logs добавляется mock `DELETE /api/v1/product-requests/{id} 204`.

UX reason:

1. Удаление разрушает связку request-response-chat.
2. Нужна confirmation card, а не мгновенное удаление.
3. Confirmation встроена ниже кнопки, чтобы не открывать тяжелую modal в mobile flow.

## 12. Customer response feed

Когда ответы есть, ниже статуса появляется response feed.

Feed должен выдерживать десятки и 100+ ответов. Поэтому ответ магазина не должен сразу занимать огромную карточку. По умолчанию это компактная строка. Раскрытие - по нажатию.

Сначала фильтры:

1. Горизонтальный scroll pills.
2. Если есть хотя бы один чат, первым появляется `Чаты N`.
3. Дальше всегда:
   - `Все N`;
   - `Есть N`;
   - `Нет N`;
   - `Аналог N`.
4. Активный фильтр синий с белым текстом.
5. Неактивные фильтры белые с border.

Нажимаешь фильтр:

1. responseFilter меняется.
2. responsePage сбрасывается в 0.
3. Список ниже перерисовывается.

Фильтр `Чаты`:

1. Показывает только responses от магазинов, с которыми есть chat messages.
2. Он появляется только если есть хотя бы один chat store id.

Фильтр `Все`:

1. Показывает все ответы текущего request.
2. Порядок должен быть хронологический по появлению ответов.

Фильтры статусов:

1. `Есть` - только `AVAILABLE`.
2. `Нет` - только `UNAVAILABLE`.
3. `Аналог` - только `ALTERNATIVE_OFFERED`.
4. `NEED_CLARIFICATION` в текущем customer filter отдельно не выделен, но может быть добавлен как отдельный pill, если UX потребует.

Pagination:

1. Page size сейчас 5 ответов.
2. Если ответов больше 5, внизу появляется pagination control.
3. Слева круглая кнопка chevron left.
4. В центре счетчик страницы: `1 / 3`.
5. Справа круглая кнопка chevron right.
6. Disabled кнопка становится semi-transparent.

Future scalable behavior:

1. Для 100+ ответов можно заменить page buttons на `Показать еще`, но принцип сохраняется: progressive reveal.
2. Feed не должен превращаться в бесконечную огромную ленту без контроля.
3. Compact row остается обязательной.

## 13. Response card compact state

Каждый response card в закрытом состоянии - компактная строка.

Визуально:

1. Белая карточка.
2. Border теплый, легкая тень.
3. Radius около 20 px.
4. Вся верхняя часть - кнопка раскрытия.
5. Layout: слева content, справа chevron down.

Внутри compact row:

1. Первая строка:
   - status pill;
   - store name жирным, truncate;
   - если есть chat messages от этого store, маленький badge с MessageCircle icon и count.
2. Вторая строка:
   - price крупнее и темнее, только если status не `UNAVAILABLE`;
   - distance, если есть;
   - productName truncate.

Что нельзя показывать в compact row:

1. Нельзя дублировать address.
2. Нельзя показывать exact stock quantity, если его не дал store или integration.
3. Нельзя показывать courier availability, delivery SLA или "45 минут", если это не пришло из явной логистической интеграции.
4. Нельзя превращать compact row в большую карточку с картинкой и длинным комментарием.

Status colors:

1. `AVAILABLE` - pastel green background, dark text.
2. `UNAVAILABLE` - light red background, danger text.
3. `ALTERNATIVE_OFFERED` - warm yellow background, dark text.
4. `NEED_CLARIFICATION` - soft blue background, primary blue text.

Поведение:

1. Нажимаешь compact row - карточка раскрывается вниз.
2. Chevron поворачивается вверх.
3. Карточка скроллится так, чтобы раскрытые детали были видны.
4. Нажимаешь снова - детали сворачиваются.

## 14. Response card expanded state

Раскрытая карточка должна сохранять rich card feel, но не дублировать compact row.

Внутри expanded state:

1. Верхняя detail panel:
   - muted panel background;
   - grid 92 px image + content;
   - слева product image;
   - справа store name, product name, price.
2. Ниже comment block:
   - warm yellow tint;
   - текст ответа магазина;
   - пример: "Есть в филиале. Цена актуальна на момент ответа."
3. Ниже address/map block, если address есть:
   - muted panel;
   - row с MapPin icon;
   - address;
   - distance справа;
   - ниже full-width button/link `2GIS`, если есть branchMapUrl.
4. Ниже contact actions:
   - Ask chat primary full-width;
   - WhatsApp and Telegram as secondary half-width links.

2GIS behavior:

1. В browser prototype `2GIS` - обычная ссылка на `https://2gis.kz/astana/search/{encoded address}`.
2. Нажимаешь `2GIS` - открывается 2GIS web search в новой вкладке.
3. В native app это должно стать deep link:
   - если 2GIS установлен, открыть приложение 2GIS;
   - если не установлен, открыть browser fallback;
   - deep link должен использовать branch location/address, а не свободный текст без привязки.

Contact behavior:

1. Нажимаешь `Чат в Ask` - открывается Ask in-app chat по конкретному request и конкретному store.
2. Нажимаешь `WhatsApp` - открывается WhatsApp URL для конкретного store response.
3. Нажимаешь `Telegram` - открывается Telegram URL для конкретного store response.
4. WhatsApp/Telegram не заменяют Ask chat. Это отдельные store contact actions.

Почему details так устроены:

1. Compact row нужен для сравнения.
2. Expanded card нужен для решения: ехать, писать, открыть карту, уточнить.
3. Address нужен только в details, потому что в compact row он мешает scan.
4. Product image в details дает доверие и визуальную проверку, но не раздувает feed.

## 15. Customer Ask chat

Ask chat всегда scoped to one request and one store.

Как клиент открывает chat:

1. Клиент раскрывает response card.
2. Нажимает `Чат в Ask`.
3. Status/progress/feed заменяются на ChatPanel.
4. Вверху остается общая строка со `Сделать новый поиск`, notification badge и history.
5. ChatPanel показывает кнопку `Назад`.

Нажимаешь `Назад` в chat:

1. selectedChatStoreId сбрасывается.
2. Клиент возвращается к response feed того же request.
3. Filter/page сохраняются или сбрасываются по текущей логике только при смене request/new search.

ChatPanel визуально:

1. Белая карточка с radius около 24 px.
2. Вверху:
   - заголовок "Чат в Ask";
   - ниже storeName;
   - если нет back button, справа может быть `live` pill.
3. Message list:
   - max height около 240 px;
   - own messages справа;
   - other messages слева;
   - own bubble primary blue + white text;
   - other bubble muted panel + dark text.
4. Empty state:
   - muted panel bubble: "Сообщения с этим магазином появятся здесь."
5. Input row:
   - attachment button с paperclip;
   - text input;
   - send button с send icon.
6. Attachments preview:
   - chips с Image/File icon;
   - filename truncate;
   - X для удаления.

Поведение:

1. Chat auto-scrolls to latest message при изменении количества сообщений.
2. Enter отправляет сообщение.
3. Пустой текст без attachments не отправляется.
4. Можно прикрепить несколько файлов.
5. Image attachments показываются как preview в bubble.
6. File attachments показываются ссылкой/download chip.
7. Если текст содержит URL, он выделяется как link внутри bubble.
8. На одного автора по одному request/store действует limit 99 сообщений за 1 час.
9. При достижении лимита показывается danger text.

Native expectation:

1. На mobile chat должен быть отдельным screen/sub-view, а не блоком ниже длинной формы.
2. Back path обязателен.
3. Input должен оставаться reachable при поднятой клавиатуре.
4. Attachments должны использовать native picker.

## 16. Customer notification badge

Notification badge показывает unread-like count в prototype.

Customer side:

1. Count считается по сообщениям, где author = `STORE`, внутри active request.
2. Значение ограничено максимумом chat limit.
3. Если chat не открыт, badge может анимироваться.
4. Badge нужен, чтобы клиент видел новые store messages даже находясь в response feed.

Store side:

1. Count считается по customer messages.
2. Он виден в store header.
3. В store inbox отдельные request rows показывают message count.

Важно: текущий prototype считает сообщения грубо, без real read receipts. В production нужны read states, но визуальная идея сохраняется: notification badge не должен мешать главному action, он только сигналит.

## 17. Store auth entry

Путь: `/store`

Если store session отсутствует, магазин видит auth panel.

Верх:

1. Слева status pill `Магазин`.
2. Справа pill-кнопка `Клиент` для prototype перехода.
3. Ниже белая auth card.

Auth card в register mode:

1. Label: "Аккаунт магазина".
2. Заголовок: "Создайте магазин в Ask".
3. Segmented control:
   - `Регистрация`;
   - `Вход`.
4. Checkbox: `Запомнить меня`.
5. Inputs:
   - email магазина;
   - пароль;
   - название магазина;
   - город;
   - адрес;
   - WhatsApp для заявок;
   - Telegram для заявок.
6. Category selector block:
   - muted panel;
   - label "Категории товаров";
   - chips всех категорий.
7. Checkbox: `Есть физический адрес`.
8. Checkbox rules acceptance:
   - магазин принимает правила Ask;
   - магазин отвечает за наличие, цену, качество товара и коммуникацию с покупателем.
9. Primary button: `Создать аккаунт`.

Register validation:

1. Store name обязателен.
2. City обязателен.
3. Нужен хотя бы один контакт: WhatsApp или Telegram.
4. Должна быть хотя бы одна категория.
5. Rules acceptance обязателен.
6. Если что-то не заполнено, показывается error text.

Category behavior:

1. По умолчанию выбран sport_nutrition.
2. Можно выбрать до 5 категорий.
3. Нельзя снять последнюю категорию.
4. Выбранные chips синие с белым текстом.
5. Неактивные chips белые с border/muted text.

Address behavior:

1. Address input есть всегда в текущем prototype.
2. Checkbox `Есть физический адрес` определяет, отправлять ли address в session/backend.
3. Для будущего UX лучше связать visual state адреса с checkbox яснее: если checkbox выключен, address считается неактивным или optional.

Register submit:

1. Нажимаешь `Создать аккаунт`.
2. Если backend доступен, вызывается registerStore.
3. Если backend недоступен, но email/password/storeName выглядят валидно, создается local mock registration.
4. После регистрации открывается verification screen.

## 18. Store verification

После регистрации store видит verification screen.

Визуально:

1. Label "Подтверждение".
2. Заголовок "Введите 6-значный код".
3. Текст: "Код отправлен на {email}."
4. Если registration mock, показывается muted panel `Local mock code: XXXXXX`.
5. Один numeric input:
   - placeholder `000000`;
   - text centered;
   - font large;
   - letter spacing большой;
   - ввод ограничен цифрами и 6 символами.
6. Error text, если код неверный или истек.
7. Primary button `Подтвердить`.

Поведение:

1. Пока код не 6 цифр, button disabled.
2. Нажимаешь `Подтвердить`.
3. Если mock code совпал или backend verify прошел, показывается success screen.
4. Через короткую задержку около 500 ms store session сохраняется.
5. Открывается store inbox.

Success screen:

1. Центрированный блок.
2. Круглая pastel green иконка Check.
3. Заголовок "Регистрация завершена".
4. Движение scale/opacity делает успех мягким.

## 19. Store login

В auth card нажимаешь segmented tab `Вход`.

Экран меняется:

1. Заголовок становится "Войдите в магазин".
2. Остаются:
   - email;
   - password;
   - remember me;
   - primary button `Войти`.
3. Поля регистрации скрываются.

Нажимаешь `Войти`:

1. Вызывается loginStore.
2. Если успешно, session сохраняется:
   - localStorage, если remember = true;
   - sessionStorage, если remember = false.
3. Store inbox открывается.
4. Если ошибка, показывается error text "Не удалось войти. Проверьте данные магазина."

Logout:

1. В authenticated store header есть button `Выйти`.
2. Нажимаешь - localStorage/sessionStorage очищаются.
3. Store session становится null.
4. Selected request и active chat закрываются.
5. Пользователь возвращается в auth panel.

## 20. Store authenticated shell

Когда store вошел, верх store screen выглядит так:

1. Слева status pill:
   - если открыт inbox: `Заявки`;
   - если открыт detail: `Заявка`.
2. Справа:
   - notification badge;
   - `Выйти`;
   - `Клиент` prototype link.

Ниже либо:

1. StoreInbox - список заявок.
2. StoreRequestPanel - detail одной заявки.
3. Store chat sub-view - если чат открыт.

Store всегда начинается с inbox, а не с одной заявки на весь экран.

Почему:

1. У магазина может быть много активных requests одновременно.
2. Могут быть несколько requests на один товар от разных покупателей.
3. Могут быть requests на разные категории.
4. Store user должен быстро triage новые/unanswered requests.

## 21. Store inbox

StoreInbox появляется, если store вошел и selectedRequest отсутствует.

Empty state:

1. Если заявок нет, показывается EmptyState.
2. Текст говорит открыть клиентский экран во втором окне и отправить запрос.
3. Это prototype-only instruction.

Non-empty inbox:

1. Заголовок "Входящие заявки".
2. Подзаголовок: новые заявки сверху, ответ можно повторить один раз.
3. Ниже vertical grid request rows.

Сортировка:

1. Сначала requests, где replyCount = 0.
2. Потом answered requests.
3. Внутри группы - более новые выше.

Каждая request row:

1. Высота минимум 104 px.
2. Grid:
   - слева product image 72 px;
   - центр content;
   - справа chevron right.
3. В центре:
   - chips row:
     - reply status;
     - price, если уже есть response price;
     - message count badge, если есть customer messages;
   - ниже raw query truncate;
   - ниже "Клиент демо".
4. Вся row clickable.

Reply status labels:

1. replyCount 0: `Новая`, warm yellow.
2. replyCount 1: `Повторный ответ доступен`, pastel green.
3. replyCount 2+: `Лимит ответов`, danger tint.

Нажимаешь row:

1. selectedRequestId становится id заявки.
2. Открывается StoreRequestPanel.

## 22. Store request detail

StoreRequestPanel - экран ответа на одну заявку.

Вверху:

1. Back button `Назад к заявкам` с ArrowLeft.
2. Нажимаешь - selectedRequestId сбрасывается, active chat закрывается, store возвращается в inbox.

Request summary card:

1. Белая карточка radius около 24 px.
2. Grid: product image 112 px + details.
3. Details:
   - label "Запрос клиента";
   - raw query крупным жирным;
   - chips:
     - "Клиент демо";
     - reply status.

Ниже status options:

1. Grid 2 columns.
2. Каждая option - button около 80 px height.
3. Внутри icon сверху и label снизу.
4. Options:
   - `Есть` с Check icon -> `AVAILABLE`;
   - `Нет` с PackageX icon -> `UNAVAILABLE`;
   - `Уточнить` с HelpCircle icon -> `NEED_CLARIFICATION`;
   - `Есть аналог` с Replace icon -> `ALTERNATIVE_OFFERED`.
5. Активная option имеет soft blue background and blue border.
6. Неактивная белая.
7. Если limit reached, все options disabled opacity.

Ниже fields:

1. Price input:
   - label "Цена";
   - numeric/decimal keyboard;
   - disabled if limit reached.
2. Message textarea:
   - label "Сообщение";
   - 3 rows;
   - disabled if limit reached;
   - default text: "Есть в наличии. Можем отложить до 20:00."

Reply button area:

1. Если sent после текущего submit, показывается success text "Ответ отправлен".
2. Если limit reached, показывается danger text: "Лимит: повтор доступен только один раз."
3. Primary button:
   - если replyCount 0: `Отправить ответ`;
   - если replyCount 1: `Повторить ответ`;
   - если replyCount >= 2: disabled.

Submit behavior:

1. Нажимаешь `Отправить ответ`.
2. submitStoreReply создает или обновляет store response.
3. Request status становится `PARTIALLY_RESPONDED`.
4. Response upsert происходит по `(requestId, storeId)`.
5. Если это первый ответ, debug log `POST /api/v1/store-responses 201`.
6. Если это повтор/update, debug log `POST /api/v1/store-responses 200`.
7. Reply attempt count увеличивается.
8. Store detail показывает success text.
9. У клиента response feed обновляется через shared localStorage/BroadcastChannel.

One retry rule:

1. Один store на один ProductRequest может дать первый ответ и только один retry/update.
2. После второго submit поля и options disabled.
3. Нельзя создавать вторую отдельную строку response от того же магазина.
4. Retry/update должен сохранять строку магазина на месте в customer feed.

Data truth:

1. Store manual reply может включать status, price, comment, branch address, contacts, map.
2. Store manual reply не должен автоматически показывать stock quantity.
3. Store manual reply не должен утверждать courier/delivery SLA.
4. Если в будущем integration вернет inventory/logistics facts, их нужно пометить source и показывать только тогда.

## 23. Store chat

Store chat доступен только после хотя бы одного replyCount > 0.

Почему:

1. Chat должен быть продолжением ответа магазина.
2. Клиент сначала должен получить row/response, чтобы понимать, с каким store он говорит.
3. Chat scoped to request/store.

В StoreRequestPanel после первого ответа появляется secondary button:

1. `Перейти в чат`;
2. если есть customer messages, добавляется count: `Перейти в чат (N)`.

Нажимаешь:

1. chatOpen становится true.
2. activeStoreChatOpen становится true, чтобы notification animation не мешала.
3. StoreRequestPanel заменяется ChatPanel.
4. ChatPanel author = `STORE`.
5. storeName в header - demo store name.

Нажимаешь `Назад` в store chat:

1. chatOpen false.
2. activeStoreChatOpen false.
3. Возврат на StoreRequestPanel той же заявки.

Важно: chat не должен быть pushed below long form. Это отдельный sub-view.

## 24. Admin panel

Путь: `/admin`

Admin panel сейчас prototype-level, не полноценная админка.

Внутри телефона:

1. Верхняя строка:
   - слева label `Ask admin`;
   - заголовок "Продавцы и жалобы";
   - справа pill link `Магазин`.
2. Ниже список seller cards.
3. Ниже block "Причины жалоб".

Seller card:

1. Белая карточка radius около 20 px.
2. Вверху:
   - seller name;
   - city + contacts;
   - status pill справа: `ACTIVE` или `SUSPENDED`.
3. Ниже category chips, берутся первые 3 product categories.
4. Ниже две кнопки:
   - `Отключить` muted;
   - `Заблокировать` danger.
5. Ниже text "Жалобы: N".

Report reasons block:

1. Muted panel.
2. Title "Причины жалоб".
3. Wrap chips:
   - нет такого товара;
   - неверная цена;
   - не отвечает;
   - подозрение на мошенничество;
   - спам;
   - другое.

Future admin expectation:

1. Admin должен видеть stores, verification, complaints, suspicious behavior.
2. Admin actions must be audited.
3. Blocking store should affect routing so inactive/suspended stores do not receive dispatch.
4. Admin UI can be desktop later, но mobile prototype сейчас показывает минимальный moderation concept.

## 25. Debug screen

Путь: `/debug`

Debug screen нужен разработке.

Визуально:

1. PhoneShell preset fluid.
2. Label `API debug`.
3. Заголовок "Состояние подключения".
4. Debug rows:
   - Backend URL;
   - Mode: Mock mode или API mode;
   - Health: Mock healthy или Ready for backend.
5. Buttons:
   - `Создать тестовый запрос`;
   - `Очистить тестовую историю`.
6. Reset status message, если reset выполнен или backend reset не прошел.
7. Request log card.

Нажимаешь `Создать тестовый запрос`:

1. Создается mock request на один из productSuggestions.
2. Он появляется в customer/store shared runtime.
3. В logs добавляется запись.

Нажимаешь `Очистить тестовую историю`:

1. Пытается вызвать backend reset endpoint.
2. В любом случае очищает local runtime.
3. Показывает status:
   - если backend reset успешен, сколько удалено requests/responses/recipients;
   - если backend недоступен, что локальная история очищена, backend нужно проверить после запуска.

Request logs:

1. Показывают последние 8 entries.
2. Каждая log row:
   - method + status;
   - source mock/api;
   - url truncate;
   - error, если есть.

Production rule:

1. Debug screen не должен быть доступен обычному пользователю.
2. Для production нужен отдельный dev/admin guard.

## 26. Mock runtime and cross-window behavior

Prototype state хранится в localStorage key `ask.prototype.runtime.v3`.

Для синхронизации:

1. Используется BroadcastChannel `ask.prototype.runtime`, если доступен.
2. Также слушается storage event.
3. Это позволяет открыть customer и store в разных окнах и видеть updates.

Runtime содержит:

1. requests.
2. activeCustomerRequestId.
3. responses.
4. chatMessages.
5. logs.
6. replyAttempts.

Это не production state management, но UX-модель важна:

1. Customer создает request.
2. Store sees request in inbox.
3. Store replies.
4. Customer sees response.
5. Customer opens chat and writes.
6. Store notification/inbox shows message.
7. Store opens chat and answers.
8. Customer sees message.

## 27. Product and category model in UX

Категории сейчас:

1. Автозапчасти.
2. Косметика.
3. Спортпит.
4. Детское питание.
5. Зоотовары.
6. Телефонные аксессуары.

Это важно: спортпит - первый рынок, но не identity продукта.

Product examples сейчас включают:

1. Oil filter, brake pads, spark plugs, wiper blades.
2. Face cream, mascara, shampoo, sunscreen.
3. Mammut Gainer, whey protein, creatine, pre-workout, protein bars.
4. Infant formula, puree, cereal, baby water.
5. Cat food, dog treats, cat litter, pet shampoo.
6. USB-C cable, phone case, wireless earbuds, power bank.

UX rule:

1. Product images должны быть реальными или качественными.
2. Нельзя заменять product representation одними иконками.
3. Нельзя делать пустые 3D decorations вместо товаров.
4. Image помогает пользователю быстро проверить, что ответ примерно про нужный товар.

Smart Search:

1. Нормализует query.
2. Учитывает aliases.
3. Scopes by category if selected.
4. Возвращает top 5 matches.
5. Но UI не заставляет выбирать конкретный result.

Routing:

1. Если категория выбрана, request routed только в stores этой категории.
2. Если категория не выбрана, category classifier пытается определить подходящие categories.
3. Если ничего не определено, request может уйти всем relevant stores.
4. Inactive/offline/suspended stores в production не должны получать dispatch.

## 28. Store response statuses

Status set:

1. `AVAILABLE` - есть.
2. `UNAVAILABLE` - нет.
3. `NEED_CLARIFICATION` - нужно уточнить.
4. `ALTERNATIVE_OFFERED` - есть аналог.

Customer meaning:

1. `Есть` - store говорит, что может предложить искомый товар.
2. `Нет` - store явно ответил, что товара нет.
3. `Уточнить` - store не уверен, нужен размер/вкус/модель/год/артикул.
4. `Аналог` - точного товара нет, но есть похожий вариант.

Store UX:

1. Store выбирает один из четырех вариантов большими buttons.
2. Потом может указать price.
3. Потом пишет comment.

Customer UX:

1. Status виден первым в compact row.
2. Price показывается только если уместен.
3. Comment раскрывается в details.
4. Alternative должен иметь product hint/image другого похожего товара, если есть.

## 29. Request statuses and customer meaning

Request statuses:

1. `DRAFT` - черновик, в текущем frontend почти не используется.
2. `CREATED` - создан, еще не в dispatch.
3. `DISPATCHING` - отправляем магазинам.
4. `SENT` - отправлен магазинам, ждем ответы.
5. `PARTIALLY_RESPONDED` - пришел хотя бы один ответ.
6. `COMPLETED` - завершен.
7. `EXPIRED` - TTL закончился.
8. `CANCELLED` - отменен.
9. `FAILED` - ошибка.

Current frontend:

1. Создает request как `DISPATCHING`.
2. Через mock dispatch delay переводит в `SENT`.
3. При первом response переводит в `PARTIALLY_RESPONDED`.
4. TTL 3 часа.
5. Если expiresAt прошел, request становится `EXPIRED` и deletedAt ставится.

Customer copy should be human:

1. `DISPATCHING` - "Отправляем".
2. `SENT` - "Отправлен".
3. `PARTIALLY_RESPONDED` - "Есть ответы".
4. `EXPIRED` - "Время запроса истекло".
5. `CANCELLED` - "Запрос отменен".
6. `FAILED` - "Не удалось отправить".

Backend can return machine codes; frontend owns localization.

## 30. Integration behavior

Current manual MVP:

1. Store replies manually.
2. Store response source is `MANUAL`.
3. Contacts are per store response.
4. 2GIS link is generated from branch address in prototype.
5. WhatsApp/Telegram are external links.

Future integrations:

1. Telegram and WhatsApp are delivery/contact adapters, not core business logic.
2. Paloma, 1C, re:Kassa, Shopify are inventory/POS/e-commerce integrations.
3. InventoryProvider/AutoReplyProvider can create automatic availability replies later.
4. Automatic replies must not destroy manual workflow.
5. If integration returns exact stock, SLA, branch availability, source must be explicit.
6. UI must show integration-backed facts differently enough that users understand they came from system/provider data.

2GIS:

1. Browser prototype opens web URL.
2. Native app should use deep link.
3. If branch address is unknown, 2GIS action should not appear.
4. Address should appear only in expanded details, not compact row.

WhatsApp/Telegram:

1. They are per response/store contact actions.
2. They should open the right app on native mobile if installed.
3. They should have web fallback.
4. They do not replace in-app Ask chat.

## 31. Native mobile requirements

Ask frontend is a mobile-first prototype for future native clients.

General:

1. Primary actions must be reachable by thumb.
2. Long forms must not hide critical actions too far below.
3. Chat must be its own screen/sub-view.
4. Category selection should be horizontal or full-screen when space is tight.
5. Text must not overlap or overflow buttons.
6. Keyboard behavior must be respected.
7. Safe area must be respected.
8. Loading/waiting motion must be local/offline-capable.

Customer:

1. Search field is primary.
2. Category is secondary.
3. Customer never manually picks a concrete SKU as primary task.
4. After send, customer sees clear status.
5. Responses arrive over time.
6. Feed remains compact and filterable.
7. Expanded details preserve rich card information.
8. Chat has back path.

Store:

1. Starts from inbox.
2. Detail only after drilling into request.
3. Reply options are large and tap-friendly.
4. Price and message fields are easy to edit.
5. Chat is separate from reply form.
6. One retry/update rule is visible.

Admin:

1. Prototype admin can stay simple.
2. Production admin may become desktop-first, but moderation actions must remain clear and auditable.

## 32. Current limitations to preserve as TODOs

Current frontend is a prototype. Known areas that should be improved without breaking the locked behavior:

1. Some Russian strings in source appear mojibake due to encoding. UX copy should be stored and rendered as proper UTF-8 Russian.
2. Debug/prototype navigation must be removed from production user-facing UI.
3. Read/unread notifications are approximate; production needs read receipts.
4. Store auth mock fallback is useful locally, but production must use backend verification.
5. Admin panel is static mock data.
6. Response feed currently paginates with arrows; `Показать еще` may be better for long mobile feed.
7. Address input in registration should visually match the `Есть физический адрес` toggle better.
8. `NEED_CLARIFICATION` needs a customer filter if usage grows.
9. Store profile/settings screen is not fully modeled yet.
10. Customer identity/login is not fully modeled yet.

These are not permission to rewrite the core flow. They are extension points.

## 33. Non-negotiable UX locks

These behaviors must not regress:

1. Smart Search is the main customer product discovery path.
2. Category selection only scopes Smart Search.
3. Customer must not manually pick a concrete product from a product list in the primary flow.
4. Customer raw query must be preserved.
5. Store starts from inbox/home page with many requests.
6. Store request detail opens only after drilling into one request.
7. One store can answer one ProductRequest first time and retry/update only once.
8. Updating one store response keeps that store row in place.
9. New store responses appear below earlier responses chronologically.
10. Feed must handle dozens or 100+ responses through compact rows, filters and progressive reveal.
11. Compact row shows quick comparison only: store, status, price, distance, product hint.
12. Expanded response shows product image, store, product, price, comment, address, 2GIS and contacts.
13. Address must not be duplicated in compact and expanded views.
14. Manual replies must not invent stock quantity, courier availability or delivery SLA.
15. Dispatch loading ends when request is sent to available stores.
16. After dispatch, waiting for replies is calm, not a spinner.
17. Ask chat is scoped to one request and one store.
18. Customer chat has back path to store responses.
19. Store chat opens as separate sub-view, not below the reply form.
20. WhatsApp, Telegram and Ask chat are separate per-store response actions.

## 34. End-to-end user story in plain actions

Customer and store live scenario:

1. Клиент открывает Ask.
2. Он видит теплый мобильный экран, логотип Ask, заголовок "Найдите товар без звонков", поле поиска и кнопку "Спросить магазины".
3. Он нажимает поле поиска.
4. Пишет "Mammut gainer 5 kg chocolate".
5. Если хочет, нажимает Smart Search category block.
6. Открывается full-screen список категорий с картинками.
7. Он нажимает "Спортпит".
8. Список закрывается, в search card видно, что category selected.
9. Он нажимает "Спросить магазины".
10. Экран поиска сменяется экраном статуса.
11. В карточке статуса видно raw query, категорию, таймер TTL, количество магазинов и количество ответов.
12. Пока идет dispatch, слева двигается radar animation, точки пульсируют, step строки показывают ход отправки.
13. Через короткое время status меняется на "Отправлен", loading исчезает, остается спокойная линия.
14. Store в другом окне уже видит заявку в inbox.
15. Магазин нажимает заявку.
16. Открывается detail: картинка товара, запрос клиента, четыре кнопки "Есть/Нет/Уточнить/Есть аналог", цена, сообщение.
17. Магазин выбирает "Есть", оставляет цену и комментарий.
18. Нажимает "Отправить ответ".
19. У магазина появляется "Ответ отправлен", а кнопка меняется так, что доступен только один повтор.
20. У клиента в feed появляется compact response row: зеленый "Есть", название магазина, цена, расстояние, product hint.
21. Клиент нажимает row.
22. Карточка раскрывается: картинка товара, магазин, товар, цена, комментарий, адрес, 2GIS, Ask chat, WhatsApp, Telegram.
23. Клиент нажимает `2GIS`.
24. В browser prototype открывается 2GIS web search по адресу филиала; в native будущем должен открыться 2GIS app deep link.
25. Клиент возвращается, нажимает `Чат в Ask`.
26. Feed заменяется chat screen с кнопкой назад.
27. Клиент пишет "Можно забрать сегодня вечером?" и нажимает send.
28. Сообщение появляется справа с синим bubble.
29. Store видит notification badge и count в inbox/detail.
30. Store открывает chat по этой заявке.
31. Store отвечает "Да, отложим до 20:00."
32. У клиента notification badge обновляется, chat auto-scrolls to latest.
33. Если store меняет цену или предлагает аналог, он может один раз нажать "Повторить ответ".
34. У клиента та же row магазина обновляется на месте, а не появляется как дубликат.
35. Если клиент хочет искать другой товар, он нажимает "Сделать новый поиск".
36. Search screen возвращается, но предыдущий request остается в horizontal history.

Это и есть базовый Ask: клиент спрашивает один раз, магазины отвечают, клиент выбирает лучший контакт без звонков.

## 35. What new backend/frontend must support

Для будущего backend и frontend важно сохранить эти contracts:

1. Versioned REST endpoints under `/api/v1`.
2. Stable machine-readable statuses and error codes.
3. ProductRequest with TTL.
4. ProductRequestRecipient per store dispatch.
5. Idempotent dispatch.
6. Dispatch only to active/online eligible stores.
7. No duplicate request messages to same store/channel.
8. StoreResponse upsert/update rule per request/store with max two attempts.
9. StoreResponse source field.
10. Contact channels per store response.
11. Branch address and map URL/source.
12. Chat scoped by requestId and storeId.
13. Frontend-owned localization.
14. Backend messages only fallback except server-owned outputs.
15. No JPA entities exposed directly to REST.

Frontend/BFF should receive data in shapes that let it render:

1. Customer request history.
2. Active request status/progress.
3. Recipient count and response count.
4. Response feed filters with counts.
5. Compact response rows.
6. Expanded response details.
7. Store inbox sorted by unanswered/new.
8. Store reply attempts and limit state.
9. Per-request/per-store chat messages.
10. Notification counts/read states.

## 36. Final visual direction

Ask should look like:

1. Warm, light, quick.
2. Product-focused with real images.
3. Mobile-native, not desktop squeezed into phone.
4. Calm after sending request.
5. Dense enough for many responses, but not visually noisy.
6. Trustworthy for store/customer communication.
7. Built around one action: "спросить магазины".

Ask should not look like:

1. Dark blue corporate dashboard.
2. Icon-only catalog.
3. Marketplace product picker.
4. Telegram bot admin panel.
5. Empty decorative 3D landing page.
6. Infinite spinner waiting for stores.
7. Long store form with chat buried below it.
8. Feed of huge cards that collapses under 100 responses.

This document is the frontend UX/UI source of truth for the current prototype and the intended product flow.

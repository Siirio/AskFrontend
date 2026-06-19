# Ask Super App UX/UI Full Flow

Этот документ описывает Ask Super App как единый UX/UI blueprint. По нему можно представить продуктовую модель, экраны, переходы, состояния, визуальную систему, поведение кнопок, историю поисков, снапшоты результатов, чаты, бизнес-страницы, кабинет бизнеса и backend/frontend contracts.

Ask — это мобильная платформа для быстрого поиска товаров, услуг и бизнесов через человеческий запрос. Пользователь не обязан обзванивать компании, писать в десятки WhatsApp/Telegram-чатов или вручную собирать информацию из разных мест. Он пишет, что ему нужно, получает релевантные варианты, открывает карточку бизнеса, смотрит товары или услуги, записывается, уточняет наличие, переходит в чат или открывает внешний контакт.

Главный принцип Ask: пользователь делает одно действие — спрашивает или ищет. Категории, фильтры, карточки бизнесов, товары, услуги и чаты помогают этому действию, но не превращают приложение в тяжелый каталог или маркетплейс, где клиент обязан вручную выбирать конкретный SKU.

---

## 1. Продуктовая модель Ask 

Ask объединяет несколько пользовательских сценариев:

1. Клиент ищет товар: `Mammut gainer 5 kg chocolate`, `крем Anua зеленый`, `масляный фильтр Toyota`, `USB-C кабель`, `смесь детская 1 банка`.
2. Клиент ищет услугу: `стрижка до 5000 сегодня в 18:00`, `ремонт телефона сегодня`, `маникюр рядом`, `аренда квартиры на завтра`.
3. Клиент ищет бизнес: `барбершоп рядом`, `кофейня рядом`, `магазин спортпита`, `салон красоты`.
4. Клиент открывает бизнес-страницу и видит услуги, товары, рейтинг, расстояние, график, контакты и описание.
5. Клиент записывается на услугу через bottom sheet подтверждения.
6. Клиент отправляет запрос по товару или услуге и получает ответы от компаний.
7. Клиент открывает историю поиска и видит сохраненный снапшот результатов того момента.
8. Клиент открывает чат с конкретной компанией внутри конкретного поиска, результата, товара, услуги или записи.
9. Менеджер бизнеса управляет заявками, записями, товарами, услугами, графиком и настройками.
10. Админ/модератор видит бизнесы, жалобы, подозрительные действия и ручные moderation controls.

Ask работает вокруг свободного человеческого запроса. Пользователь может написать неидеальный текст, смесь русского и английского, бренд, категорию, цену, время, район, описание проблемы или пример товара. UI сохраняет raw query и не переписывает его на внутреннее название товара.

---

## 2. Визуальная система

Визуальная модель Ask mobile-first. Даже в браузерном прототипе экраны ощущаются как будущие mobile/native screens, а не как desktop dashboard.

Базовая поверхность:

1. Общий фон теплый ivory/milk, близкий к `#fffaf0`.
2. Верхняя часть может иметь мягкий теплый градиент, который растворяется вниз.
3. Внутренние поверхности карточек белые или warm white.
4. Карточки имеют мягкую тень, тонкий warm-brown border и radius 18–28 px.
5. Основной текст темный olive-brown: `#343b1b`.
6. Главный action/accent — синий: `#3971b8`.
7. Позитивные состояния — pastel green: `#c8d69b`.
8. Ожидание, аналоги и мягкие статусы — warm vanilla/yellow: `#f7dfa4`, `#f6e6a5`.
9. Ошибки и destructive actions — muted brick red: `#b85743`.
10. Фон не становится темным fintech-blue, холодным SaaS-gray или тяжелым маркетплейсным white/black.

Типографика:

1. Основной шрифт — системный sans-serif, Trebuchet MS может использоваться первым в списке.
2. Заголовки жирные и плотные, но не огромные внутри каждой карточки.
3. Компактные строки используют truncate, чтобы не ломать layout.
4. Служебные labels могут быть uppercase с tracking.
5. Основной текст не использует агрессивный negative letter spacing.

Движение:

1. Главные переходы между customer screens мягкие, через opacity/translate/scale.
2. Карточки ответа раскрываются вниз по высоте без резкого скачка.
3. Chevron в карточке ответа поворачивается на 180 градусов при раскрытии.
4. Loading во время отправки запроса локальный и короткий: radar rings, dots, steps.
5. После отправки запроса loading исчезает; ожидание ответов становится спокойным.
6. Bottom sheet записи появляется снизу, фон затемняется, верхний handle показывает draggable feeling.
7. Новые сообщения в чате появляются без тяжелой анимации, чат auto-scrolls to latest.

---

## 3. Клиентская нижняя навигация

Клиентская нижняя навигация состоит из трех основных вкладок:

1. `Поиск`.
2. `История`.
3. `Профиль`.

`Поиск` — главная вкладка Ask. Это стартовый экран клиента, главный front продукта, поле поиска, быстрые категории, nearby/business suggestions, результаты по текущему запросу и переход к бизнесам.

`История` — единая вкладка для прошлых поисков, снапшотов результатов и связанных чатов. Внутри нее есть две под-вкладки:

1. `Чаты` — быстрый доступ к последним активным диалогам.
2. `История поисков` — список поисков, сгруппированный по времени и категории.

`Профиль` — аккаунт клиента, город, контакты, настройки уведомлений, privacy, сохраненные адреса и способы связи.

`Главная` как отдельная вкладка не нужна. Ее смысл выполняет `Поиск`. При открытии приложения пользователь сразу попадает в `Поиск`.

---

## 4. Вкладка `Поиск`

Вкладка `Поиск` является главным экраном клиента.

Верх экрана:

1. Слева отображается текущий город/район с иконкой MapPin.
2. Ниже крупный заголовок: `Что вам нужно сегодня?` или похожая короткая human copy.
3. Справа может быть notification badge или profile/avatar button, если это не конфликтует с bottom navigation.

Главная поисковая карточка:

1. Большая search bar занимает всю ширину контента.
2. Слева иконка Search.
3. Placeholder: `Услуга, товар или место…`.
4. Справа кнопка/иконка фильтров `SlidersHorizontal`.
5. Нажатие на search bar открывает search input state.
6. Нажатие на filters открывает фильтры/категории/район/цена/время.

Быстрые переключатели под поиском:

1. `Услуги`.
2. `Товары`.
3. Дополнительно могут быть `Бизнесы`, `Рядом`, `Сейчас открыто`.

Поведение быстрых переключателей:

1. Нажатие `Услуги` меняет scope поиска на service-first.
2. Нажатие `Товары` меняет scope поиска на product-first.
3. Нажатие не очищает raw query.
4. Активный chip синий или primary.
5. Неактивные chips белые с border.

Блок `Рядом с вами`:

1. Заголовок: `Рядом с вами`.
2. Справа action: `Смотреть все`.
3. Ниже список бизнес-карточек.
4. Карточка бизнеса показывает изображение, рейтинг, название, категорию, расстояние и количество отзывов.
5. Нажатие на карточку бизнеса открывает бизнес-страницу.

---

## 5. Search input state

При нажатии на search bar экран переходит в состояние ввода запроса.

Верхняя строка:

1. Слева круглая кнопка назад.
2. В центре search input с текущим raw query.
3. При пустом запросе placeholder остается `Услуга, товар или место…`.
4. При вводе текста raw query сохраняется как написано пользователем.

Под search input:

1. Показываются активные фильтры chips: цена, время, район, категория, `рядом`, `сегодня`, `открыто`.
2. Chips можно удалить или изменить.
3. Chips не заменяют raw query, а только уточняют поиск.

Примеры query parsing:

1. `стрижка до 5000 в 18:00` → service intent, price cap, time slot.
2. `Mammut gainer 5 kg chocolate` → product intent, sport nutrition category, brand/product hint.
3. `ремонт телефона сегодня` → service intent, electronics/repair category, date today.
4. `кофейня рядом` → business/place intent, nearby filter.
5. `аренда квартиры завтра` → service/rental intent, date tomorrow.

После отправки/подтверждения поиска создается search session. Search session становится current search, пока пользователь работает с результатами.

---

## 6. Search results screen

Search results screen показывает результаты текущего запроса.

Верх экрана:

1. Back button.
2. Search bar с raw query.
3. Под ним chips активных фильтров.
4. Текст: `Найдено N вариантов по вашему запросу`.

Карточка результата услуги:

1. Изображение бизнеса/услуги.
2. Название услуги.
3. Цена.
4. Название бизнеса.
5. Рейтинг.
6. Расстояние.
7. Свободный слот или ближайшее время.
8. Кнопка `Записаться`.
9. Нажатие на основную часть карточки открывает бизнес-страницу.
10. Нажатие `Записаться` открывает booking sheet.

Карточка результата товара:

1. Изображение товара или категории товара.
2. Название товара/product hint.
3. Цена, если известна.
4. Название бизнеса.
5. Статус наличия, если есть ответ: `Есть`, `Нет`, `Уточнить`, `Аналог`.
6. Расстояние.
7. Кнопка `Запросить`, `Уточнить`, `Открыть` или `Чат` в зависимости от состояния.
8. Нажатие на карточку открывает expanded details или бизнес-страницу с выбранным товаром.

Карточка результата бизнеса:

1. Большое изображение/обложка.
2. Название бизнеса.
3. Категория.
4. Рейтинг.
5. Количество отзывов.
6. Расстояние.
7. Open/closed status.
8. Нажатие открывает бизнес-страницу.

Порядок результатов:

1. Варианты с явной доступностью/свободным временем выше.
2. Варианты ближе к пользователю выше при прочих равных.
3. Бизнесы с лучшим рейтингом и большим количеством отзывов получают boost.
4. Платные/рекламные результаты могут быть добавлены только с явной маркировкой.
5. Недоступные варианты не должны визуально конкурировать с доступными.

---

## 7. Current search и snapshot search

Каждый запущенный поиск имеет жизненный цикл:

1. `current` — поиск сейчас открыт и активен.
2. `previous` — пользователь ушел к другому поиску, создал другой поиск или закрыл активную сессию.
3. `expired` — срок хранения истории закончился.
4. `deleted` — история удалена.

Когда поиск перестает быть current, фиксируется snapshot.

Snapshot — это сохраненное состояние результатов на момент выхода из current search. Snapshot хранит не бесконечно живую ленту, а последнюю зафиксированную картину поиска.

Момент фиксации snapshot:

1. Пользователь создает новый поиск.
2. Пользователь переключается на другой поиск.
3. Пользователь уходит из текущего поиска во вкладку `История`.
4. Search session перестает быть active/current.
5. TTL current search заканчивается.

Snapshot содержит:

1. Search id.
2. Raw query.
3. Intent: product/service/business/mixed.
4. Категорию или категории.
5. Фильтры: цена, время, район, расстояние, open now.
6. Список результатов, которые были видны пользователю.
7. Ответы бизнесов по этому поиску.
8. Связанные товары.
9. Связанные услуги.
10. Связанные бизнесы.
11. Chat thread references.
12. Last activity timestamp.
13. Expiration timestamp.

Snapshot не обязан хранить весь возможный каталог. Он хранит то, что относится к конкретному поиску и уже было показано/получено.

---

## 8. Хранение истории поисков

История поисков хранится максимум 10 дней.

После 10 дней:

1. Search snapshot удаляется.
2. Results snapshot удаляется.
3. Store/business responses удаляются из пользовательской истории.
4. Chat history по этому search удаляется или становится недоступной пользователю по privacy/data retention policy.
5. В базе не остается тяжелых search-result данных, которые не нужны продукту.

История не является вечным архивом. Ее задача — дать пользователю быстрый возврат к недавним поискам, результатам и чатам, не перегружая базу.

При открытии `История` пользователь видит только поиски в пределах retention window.

Группировка истории:

1. Сегодня.
2. Вчера.
3. Последние 7 дней.
4. До 10 дней.

Если истории нет:

1. Показывается empty state.
2. Текст объясняет, что прошлые поиски появятся здесь после первого запроса.
3. Primary action ведет в `Поиск`.

---

## 9. Вкладка `История`

Вкладка `История` содержит две под-вкладки:

1. `Чаты`.
2. `История поисков`.

По умолчанию открывается `Чаты`, потому что пользователю часто нужно быстро вернуться к последнему диалогу.

### 9.1 Под-вкладка `Чаты`

`Чаты` показывает последние активные диалоги по всем поискам.

Каждая chat row содержит:

1. Avatar/logo бизнеса.
2. Название бизнеса.
3. Последнее сообщение.
4. Время последнего сообщения.
5. Badge unread count.
6. Маленький context label: товар, услуга, запись или raw query.
7. Статус: active, waiting, booked, answered, expired.

Нажатие на chat row открывает чат напрямую.

Внутри чата сохраняется context search. Пользователь видит, по какому запросу, товару, услуге или записи идет диалог.

Если search snapshot уже expired, chat row исчезает из обычной истории. Если правила продукта требуют юридическое хранение, оно не отображается пользователю как обычный UX item.

### 9.2 Под-вкладка `История поисков`

`История поисков` показывает прошлые search sessions.

Каждая search history row содержит:

1. Raw query.
2. Type badge: `Товар`, `Услуга`, `Бизнес`, `Смешанный`.
3. Категория/категории.
4. Количество результатов.
5. Количество чатов.
6. Last activity timestamp.
7. Статус: `Есть ответы`, `Запись`, `Чаты`, `Истекло скоро`, `Нет ответов`.

Нажатие на search history row открывает search snapshot details.

---

## 10. Search snapshot details

Search snapshot details — экран конкретной истории поиска.

Верх экрана:

1. Back button.
2. Заголовок `История поиска`.
3. Raw query крупным текстом.
4. Под raw query отображаются chips фильтров и категории.
5. Если до удаления осталось мало времени, показывается retention hint: `История удалится через X дней`.

Основные actions:

1. `Повторить поиск`.
2. `Открыть чаты`.
3. `Посмотреть результаты`.

`Повторить поиск` создает новый current search с тем же raw query и фильтрами. Это не меняет сохраненный snapshot; рядом появляется отдельная актуальная search session.

`Открыть чаты` показывает список чатов, связанных именно с этим поиском.

`Посмотреть результаты` показывает frozen/snapshot список вариантов, которые были сохранены по этому поиску.

Внутри snapshot details есть секции:

1. `Товары`.
2. `Услуги`.
3. `Бизнесы`.
4. `Чаты`.

Секции отображаются только если в них есть данные.

---

## 11. Товары внутри истории поиска

Секция `Товары` показывает товары/product hints, связанные с поиском.

Каждая product row содержит:

1. Product image.
2. Product name или raw product hint.
3. Category.
4. Best known price, если есть.
5. Status: `Есть`, `Нет`, `Аналог`, `Уточнить`, `Ожидает ответа`.
6. Количество бизнесов, которые ответили по этому товару.
7. Badge chat count, если есть чаты.

Нажатие на product row открывает product snapshot details.

Product snapshot details показывает:

1. Product image.
2. Product/product hint name.
3. Raw query context.
4. Список бизнесов, которые ответили по этому товару.
5. Compact response rows.
6. Возможность открыть чат с конкретным бизнесом.
7. Возможность открыть бизнес-страницу.

Чат по товару всегда scoped by searchId + businessId + product/result context.

---

## 12. Услуги внутри истории поиска

Секция `Услуги` показывает service results, связанные с поиском.

Каждая service row содержит:

1. Service image or business image.
2. Service name.
3. Business name.
4. Price.
5. Duration.
6. Slot/time, если применимо.
7. Booking status: available, requested, confirmed, declined, completed, cancelled.
8. Badge chat count, если есть.

Нажатие на service row открывает service snapshot details.

Service snapshot details показывает:

1. Название услуги.
2. Бизнес.
3. Цена.
4. Длительность.
5. Выбранный или доступный слот.
6. Статус записи/заявки.
7. Кнопку `Открыть чат`.
8. Кнопку `Открыть бизнес`.
9. Кнопку `Повторить запись` или `Записаться снова`, если услуга еще доступна.

Чат по услуге scoped by searchId + businessId + serviceId/bookingId.

---

## 13. Бизнесы внутри истории поиска

Секция `Бизнесы` показывает компании, которые были связаны с поиском.

Business row содержит:

1. Cover/avatar.
2. Business name.
3. Category.
4. Rating.
5. Distance at snapshot time.
6. Open/closed status at snapshot time, если он был известен.
7. Number of related products/services/results.
8. Chat count.

Нажатие открывает business snapshot context или актуальную бизнес-страницу.

Если бизнес-страница изменилась после snapshot, пользователь может видеть:

1. Snapshot context того поиска.
2. Актуальную страницу бизнеса как live business profile.

Snapshot facts и live facts не смешиваются без маркировки. Цена/слот/наличие из snapshot не должны выглядеть как актуальные, если время прошло.

---

## 14. Business page

Business page — экран конкретной компании.

Верх:

1. Большая cover image.
2. Back button поверх cover.
3. Logo/avatar может быть поверх нижней части cover.
4. Название бизнеса.
5. Rating и reviews count.
6. Расстояние.
7. Open/closed status.
8. Краткое описание.
9. Кнопка `Написать сообщение`.

Business summary card:

1. Белая карточка с radius около 24 px.
2. Название бизнеса крупным текстом.
3. Rating со star icon.
4. Количество отзывов.
5. Distance.
6. Open/closed status.
7. Описание в 2–4 строки.
8. Primary or secondary chat button.

Tabs внутри бизнес-страницы:

1. `Услуги`.
2. `Товары`.

Дополнительно могут быть:

1. `О бизнесе`.
2. `Отзывы`.
3. `Филиалы`.
4. `Фото`.

По умолчанию активна вкладка, которая соответствует контексту входа. Если пользователь пришел из service result, открывается `Услуги`. Если из product result, открывается `Товары`. Если пришел с nearby card без конкретного intent, активна вкладка с основным профилем бизнеса.

---

## 15. Business page — вкладка `Услуги`

Вкладка `Услуги` показывает список услуг бизнеса.

Service card содержит:

1. Название услуги.
2. Duration.
3. Price.
4. Optional description.
5. Кнопка `Записаться`.

Нажатие `Записаться` открывает booking sheet.

Если услуга недоступна:

1. Кнопка disabled.
2. Показывается reason: `нет свободных слотов`, `временно недоступно`, `нужна консультация`.
3. Secondary action может быть `Написать`.

Услуги не должны превращаться в огромный текстовый прайс-лист. Каждая строка компактная, tap-friendly, с понятной ценой и длительностью.

---

## 16. Business page — вкладка `Товары`

Вкладка `Товары` показывает товары бизнеса.

Product card/grid item содержит:

1. Product image.
2. Product name.
3. Price, если известна.
4. Availability status, если известен.
5. Button: `Запросить`, `Уточнить`, `В чат`, `Открыть`.

Для товаров без подтвержденной актуальности нельзя показывать уверенный `Есть в наличии`, если этого не дал бизнес или интеграция. В таком случае используется `Уточнить наличие`.

Нажатие `Запросить` создает product inquiry context и ведет к запросу/чату с бизнесом.

Нажатие на карточку товара открывает product detail внутри бизнеса:

1. Изображение.
2. Название.
3. Цена.
4. Описание.
5. Категория.
6. Availability/source.
7. `Уточнить наличие`.
8. `Написать`.

---

## 17. Booking sheet

Booking sheet появляется при нажатии `Записаться`.

Визуально:

1. Overlay затемняет фон.
2. Sheet поднимается снизу.
3. Верхний handle показывает draggable feeling.
4. Верхняя строка содержит title `Подтверждение записи` и close button `X`.

Содержимое:

1. Summary card услуги.
2. Название услуги.
3. Название бизнеса.
4. Price.
5. Date row: например `Сегодня, 19 июня`.
6. Time slot chips: `17:00`, `17:30`, `18:00`, `18:30`, `19:00`.
7. Comment textarea: `Комментарий (необязательно)`.
8. Primary button: `Подтвердить запись · {price}`.

Поведение:

1. Нажатие на slot делает его активным.
2. Комментарий не обязателен.
3. Нажатие close закрывает sheet без подтверждения.
4. Нажатие по затемненному фону закрывает sheet.
5. Нажатие `Подтвердить запись` переводит sheet в success state.

Success state:

1. Green check icon.
2. Заголовок `Вы записаны!`.
3. Текст: `{service} · сегодня в {slot}`.
4. Кнопка `Готово` закрывает sheet.
5. После подтверждения создается booking context, который доступен в истории и чате.

---

## 18. Customer Ask chat

Ask chat — это отдельный экран/sub-view, а не блок внизу длинной формы.

Chat context всегда привязан к одному из вариантов:

1. searchId + businessId.
2. searchId + businessId + productId/resultId.
3. searchId + businessId + serviceId.
4. bookingId + businessId.

Верх чата:

1. Back button.
2. Avatar/logo бизнеса или мастера.
3. Business name.
4. Online/offline status.
5. Phone/contact button, если доступен.

Message list:

1. Date separator: `Сегодня`, `Вчера`, date.
2. Own messages справа.
3. Business messages слева.
4. Own bubble primary blue + white text.
5. Business bubble muted panel + dark text.
6. Max bubble width около 78%.
7. Сообщения auto-scroll to latest.

Input row:

1. Paperclip button.
2. Text input placeholder `Сообщение…`.
3. Send button в primary circle.
4. Пустой текст без attachments не отправляется.
5. Attachments отображаются preview chips перед отправкой.

Back behavior:

1. Если чат открыт из бизнес-страницы, back возвращает на бизнес-страницу.
2. Если чат открыт из истории, back возвращает в историю.
3. Если чат открыт из snapshot details, back возвращает в этот snapshot.
4. Если чат открыт из booking, back возвращает к booking/service context.

Чат не заменяет WhatsApp/Telegram. External messengers остаются отдельными contact actions.

---

## 19. Customer notification badge

Notification badge показывает unread-like count.

Customer side:

1. Count считается по business messages, которые пользователь еще не прочитал.
2. Badge может появляться в нижней вкладке `История`.
3. Badge может появляться у конкретного chat row.
4. Badge не перекрывает главный CTA поиска.

Store/business side:

1. Count считается по customer messages.
2. Badge отображается в inbox, booking requests, chats и dashboard.
3. При открытии чата count очищается для этого thread.

Production модель требует read receipts. Визуально badge остается легким сигналом, а не главным элементом экрана.

---

## 20. Customer response feed для товарных запросов

Когда товарный запрос отправлен бизнесам, пользователь видит status/progress и response feed.

Request progress card:

1. Белая карточка radius около 24 px.
2. Label `Статус запроса`.
3. Raw query крупным текстом.
4. Category pill, если категория определена.
5. Status pill.
6. Timer TTL.
7. Recipient count.
8. Response count.

Status labels:

1. `DISPATCHING` → `Отправляем`.
2. `SENT` → `Отправлен`.
3. `PARTIALLY_RESPONDED` → `Есть ответы`.
4. `EXPIRED` → `Время запроса истекло`.
5. `CANCELLED` → `Запрос отменен`.
6. `FAILED` → `Не удалось отправить`.

Dispatch loading:

1. Показывается только во время отправки запроса бизнесам.
2. Внутри loading блока radar animation.
3. Step rows: `Запрос ушел`, `Бизнес смотрит наличие`, `Ждем ответ`.
4. После dispatch loading исчезает.
5. Ожидание ответов не выглядит как бесконечный technical spinner.

Response feed filters:

1. `Чаты N`, если есть чаты.
2. `Все N`.
3. `Есть N`.
4. `Нет N`.
5. `Аналог N`.
6. `Уточнить N`, если таких ответов достаточно или продуктово нужно выделить.

Compact response row:

1. Status pill.
2. Store/business name.
3. Chat badge, если есть сообщения.
4. Price, если status не `UNAVAILABLE` и цена известна.
5. Distance.
6. Product hint.
7. Chevron.

Compact row не показывает адрес, длинный комментарий, delivery SLA, exact stock quantity или лишние картинки.

Expanded response:

1. Product image.
2. Business name.
3. Product name/hint.
4. Price.
5. Comment.
6. Address/map block.
7. Distance.
8. `2GIS` button, если есть адрес/координаты.
9. `Чат в Ask`.
10. `WhatsApp`.
11. `Telegram`.

Manual business reply не придумывает stock quantity, courier availability или delivery SLA. Эти факты отображаются только при явном источнике.

---

## 21. Customer cancel/delete request

Под progress card может быть destructive action `Отменить запрос` или `Удалить из истории`.

Нажатие не удаляет сразу.

Confirmation card:

1. Заголовок `Удалить этот запрос?`.
2. Описание: ответы и чаты по этому запросу исчезнут из текущей истории.
3. Button `Оставить`.
4. Button `Удалить`.

Нажатие `Оставить` закрывает confirmation.

Нажатие `Удалить`:

1. Удаляет search/request из пользовательской истории.
2. Удаляет связанные snapshot results.
3. Удаляет связанные response rows.
4. Удаляет связанные chat refs из пользовательской истории.
5. Возвращает пользователя к списку истории или текущему поиску.

---

## 22. Store/business mobile app

Мобильный кабинет бизнеса предназначен для быстрых действий менеджера/мастера.

Нижняя навигация бизнеса:

1. `Сводка`.
2. `Записи`.
3. `Услуги`.
4. Дополнительно могут быть `Товары`, `Чаты`, `Профиль`.

### 22.1 Сводка

Верх:

1. Business name small label.
2. Greeting: `Добрый день, {managerName}`.
3. Notification bell with unread indicator.

Stats cards:

1. `Записей сегодня`.
2. `Ждут подтверждения`.
3. Дополнительно: `Новые сообщения`, `Новые запросы`, `Товары требуют ответа`.

Action card `Новые заявки`:

1. Icon CalendarClock.
2. Title `Новые заявки`.
3. Subtitle `{N} ожидают вашего ответа`.
4. Chevron.
5. Нажатие открывает `Записи` или входящие заявки.

Quick actions:

1. `Добавить услугу`.
2. `Изменить график`.
3. `Мои услуги`.
4. `Уведомления`.
5. `Добавить товар`.
6. `Настройки бизнеса`.

### 22.2 Записи / входящие заявки

Booking/request card содержит:

1. Client name.
2. Price.
3. Service name.
4. Time.
5. Status.
6. Buttons `Отклонить` и `Подтвердить`, если заявка не обработана.

Нажатие `Подтвердить`:

1. Card показывает success state `Подтверждено`.
2. Клиент получает обновление статуса.
3. Chat context остается доступным.

Нажатие `Отклонить`:

1. Card показывает declined state `Отклонено`.
2. Клиент получает обновление статуса.
3. Может появиться reason/comment flow, если нужен.

### 22.3 Услуги

Services list показывает услуги бизнеса.

Service row:

1. Icon/image.
2. Service name.
3. Price.
4. Duration, если есть.
5. Status active/inactive.

Floating action button `+`:

1. На вкладке `Услуги` появляется снизу справа.
2. Нажатие открывает add/edit service flow.

### 22.4 Товары

Products list показывает товары бизнеса.

Product row/grid item:

1. Product image.
2. Name.
3. Price.
4. Availability/status.
5. Category.
6. Edit action.

Товары могут быть ручными или integration-backed. Источник availability должен быть понятен системе.

---

## 23. Business web cabinet

Business web cabinet предназначен для более удобного управления с desktop.

Layout:

1. Left sidebar.
2. Top header.
3. Main content area.

Sidebar:

1. Ask Business logo.
2. Business short name.
3. Navigation:
   - `Дашборд`.
   - `Товары`.
   - `Услуги`.
   - `Записи`.
   - `Настройки`.
4. Bottom owner/manager profile.

Header:

1. Page title.
2. Search field.
3. Notification bell.

### 23.1 Дашборд

Dashboard показывает:

1. Key metrics.
2. Новые заявки.
3. Новые сообщения.
4. Сегодняшние записи.
5. Быстрые действия.
6. Alerts по товарам/услугам/графику.

### 23.2 Товары

Products page показывает:

1. Products table/grid.
2. Search/filter.
3. Add product button.
4. Product status.
5. Price.
6. Category.
7. Availability.
8. Edit/delete actions.

Add product page содержит:

1. Product name.
2. Category.
3. Price.
4. Images.
5. Description.
6. Availability/source.
7. Branch availability, если есть филиалы.
8. Save button.

### 23.3 Услуги

Services page показывает:

1. Services list.
2. Add service.
3. Price.
4. Duration.
5. Active/inactive status.
6. Booking settings.
7. Staff/master association, если применимо.

### 23.4 Записи

Bookings page показывает:

1. Calendar/list view.
2. Incoming booking requests.
3. Confirmed bookings.
4. Declined/cancelled bookings.
5. Client contacts.
6. Chat link.
7. Time/date filters.

### 23.5 Настройки

Settings page содержит:

1. Business profile.
2. Address/branches.
3. Contacts.
4. Working hours.
5. Notification preferences.
6. Team/roles.
7. Categories.
8. Integration settings.

---

## 24. Store/business auth

Business auth entry содержит register/login flow.

Register mode:

1. Label `Аккаунт бизнеса`.
2. Title `Создайте бизнес в Ask`.
3. Segmented control: `Регистрация`, `Вход`.
4. Email.
5. Password.
6. Business name.
7. City.
8. Address.
9. WhatsApp.
10. Telegram.
11. Category selector.
12. Physical address toggle.
13. Rules acceptance.
14. Primary button `Создать аккаунт`.

Validation:

1. Business name required.
2. City required.
3. At least one contact required.
4. At least one category required.
5. Rules acceptance required.
6. Password required.

Verification screen:

1. Title `Введите 6-значный код`.
2. Text `Код отправлен на {email}`.
3. Numeric input 6 digits.
4. Button `Подтвердить`.
5. Success state `Регистрация завершена`.

Login mode:

1. Email.
2. Password.
3. Remember me.
4. Button `Войти`.
5. Error text for invalid credentials.

Logout clears business session and returns to auth screen.

---

## 25. Product/category model

Ask categories include goods and services.

Goods categories:

1. Автозапчасти.
2. Косметика.
3. Спортпит.
4. Детское питание.
5. Зоотовары.
6. Телефонные аксессуары.
7. Электроника.
8. Одежда/аксессуары.
9. Дом/быт.

Service categories:

1. Барбершопы.
2. Салоны красоты.
3. Ремонт техники.
4. Аренда.
5. Кафе/кофейни.
6. Доставка/логистика.
7. Образование/курсы.
8. Медицина/wellness, если legal requirements соблюдены.
9. Автосервис.

Category selection:

1. Категория помогает routing/ranking.
2. Категория не заставляет пользователя выбрать конкретный SKU.
3. Raw query сохраняется.
4. Если категория не выбрана, Ask определяет category candidates автоматически.
5. Если категория выбрана, routing ограничивается релевантными бизнесами.

Category picker:

1. Full-screen mobile overlay.
2. Header `Категория поиска`.
3. Close X.
4. Current selection panel.
5. Category rows with images/icons.
6. Active row has primary border/ring.
7. Selecting category closes overlay.

---

## 26. Response statuses

Store/business response statuses:

1. `AVAILABLE` — есть.
2. `UNAVAILABLE` — нет.
3. `NEED_CLARIFICATION` — нужно уточнить.
4. `ALTERNATIVE_OFFERED` — есть аналог.
5. `BOOKING_AVAILABLE` — можно записаться.
6. `BOOKING_CONFIRMED` — запись подтверждена.
7. `BOOKING_DECLINED` — запись отклонена.
8. `REQUEST_EXPIRED` — запрос истек.

Customer meaning:

1. `Есть` — бизнес может предложить искомый товар/вариант.
2. `Нет` — бизнес явно ответил, что товара/слота нет.
3. `Уточнить` — нужны модель, размер, вкус, дата, время, мастер или другие детали.
4. `Аналог` — точного варианта нет, но есть похожий.
5. `Можно записаться` — есть доступный слот.
6. `Подтверждено` — бизнес подтвердил booking.
7. `Отклонено` — бизнес отклонил booking или слот недоступен.

Status colors:

1. Available/confirmed — pastel green.
2. Unavailable/declined — light red/danger.
3. Alternative/waiting — warm yellow.
4. Clarification — soft blue.
5. Expired — muted gray.

---

## 27. Request/search statuses

Search/request statuses:

1. `DRAFT` — ввод/черновик.
2. `CREATED` — создан.
3. `DISPATCHING` — отправляется бизнесам.
4. `SENT` — отправлен.
5. `PARTIALLY_RESPONDED` — есть ответы.
6. `COMPLETED` — завершен.
7. `EXPIRED` — истек.
8. `CANCELLED` — отменен.
9. `FAILED` — ошибка.
10. `SNAPSHOT` — сохранен как история.

Human labels:

1. `DISPATCHING` → `Отправляем`.
2. `SENT` → `Отправлен`.
3. `PARTIALLY_RESPONDED` → `Есть ответы`.
4. `COMPLETED` → `Завершен`.
5. `EXPIRED` → `Истек`.
6. `CANCELLED` → `Отменен`.
7. `FAILED` → `Ошибка`.
8. `SNAPSHOT` → `История`.

TTL:

1. Active product request может иметь 3-hour TTL for responses.
2. Search history snapshot хранится до 10 дней.
3. Booking/chat visibility follows product privacy and retention rules.

---

## 28. Store reply flow for product requests

Business inbox показывает входящие product/service requests.

Inbox sorting:

1. Сначала unanswered/new.
2. Потом waiting/needs clarification.
3. Потом answered.
4. Внутри группы — newer first.

Request row:

1. Product/service image.
2. Raw query.
3. Customer label.
4. Reply status.
5. Message count.
6. Price if answered.
7. Chevron.

Request detail:

1. Back button `Назад к заявкам`.
2. Summary card with raw query.
3. Status option buttons:
   - `Есть`.
   - `Нет`.
   - `Уточнить`.
   - `Есть аналог`.
4. Price input.
5. Message textarea.
6. Submit button.
7. Chat button after first reply.

One retry/update rule:

1. Один бизнес по одному ProductRequest дает первый ответ.
2. После первого ответа доступен один retry/update.
3. После второго submit поля disabled.
4. Update сохраняет строку бизнеса на месте у клиента.
5. Duplicate response row от того же бизнеса не создается.

---

## 29. Integrations and external actions

2GIS:

1. `2GIS` action появляется только если есть address/coordinates.
2. Browser opens web fallback.
3. Native app opens deep link if installed.
4. Deep link uses branch location/address.

WhatsApp/Telegram:

1. External contact actions привязаны к конкретному business/branch/response.
2. Они не заменяют Ask chat.
3. Они имеют app deep link and web fallback.

POS/inventory/e-commerce integrations:

1. Paloma, 1C, re:Kassa, Shopify, POS, CRM могут давать availability/price/stock facts.
2. Integration-backed facts имеют source.
3. Manual facts имеют source `MANUAL`.
4. UI не смешивает manual и integration facts без source awareness.
5. Exact stock, delivery SLA, branch availability показываются только при явном source.

---

## 30. Admin/moderation panel

Admin panel показывает:

1. Businesses.
2. Verification states.
3. Complaints.
4. Suspicious behavior.
5. Manual blocking/suspension.
6. Report reasons.

Seller/business card:

1. Business name.
2. City.
3. Contacts.
4. Status: `ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`.
5. Category chips.
6. Complaints count.
7. Actions: `Отключить`, `Заблокировать`, `Проверить`.

Report reasons:

1. Нет такого товара.
2. Неверная цена.
3. Не отвечает.
4. Подозрение на мошенничество.
5. Спам.
6. Другое.

Admin actions are audited. Suspended businesses do not receive dispatch.

---

## 31. Backend/frontend contracts

Frontend receives data shapes that render:

1. Customer current search.
2. Customer search history.
3. Search snapshots.
4. Snapshot result groups: products, services, businesses, chats.
5. Active request status/progress.
6. Recipient count and response count.
7. Response feed filters and counts.
8. Compact response rows.
9. Expanded response details.
10. Business profile.
11. Business services.
12. Business products.
13. Booking slots and booking status.
14. Store/business inbox.
15. Store/business reply attempts and limit state.
16. Per-search/per-business chat threads.
17. Notification counts/read states.

Backend concepts:

1. Versioned REST endpoints under `/api/v1`.
2. Stable machine-readable statuses and error codes.
3. ProductRequest / ServiceRequest / SearchSession.
4. SearchSnapshot.
5. SearchResultSnapshot.
6. ProductRequestRecipient per business dispatch.
7. Idempotent dispatch.
8. Dispatch only to active/eligible businesses.
9. StoreResponse upsert per request/business.
10. Max two manual reply attempts.
11. Chat scoped by searchId/requestId/bookingId and businessId.
12. Frontend-owned localization.
13. No direct JPA entity exposure.

---

## 32. Native mobile requirements

General:

1. Primary actions reachable by thumb.
2. Long forms avoid burying primary actions too low.
3. Chat is a separate screen/sub-view.
4. Category selection is full-screen or large enough for images.
5. Keyboard behavior is respected.
6. Safe area is respected.
7. Text does not overlap buttons.
8. Loading is local and calm.

Customer:

1. Search field is primary.
2. Category is secondary.
3. Raw query is preserved.
4. User does not manually pick concrete SKU in primary flow.
5. Results are compact and scannable.
6. Business pages are rich but not noisy.
7. History preserves search snapshots for 10 days.
8. Chat has clear back path.

Business:

1. Business starts from dashboard/inbox, not a random detail screen.
2. Requests and bookings are triaged quickly.
3. Reply options are large.
4. Services/products are easy to edit.
5. Chat is separate from reply form.
6. One retry/update rule is visible for product responses.

---

## 33. Empty, error and edge states

No nearby businesses:

1. Shows empty state.
2. Suggests changing distance/category.
3. Offers to send request anyway if product logic supports it.

No search results:

1. Shows raw query.
2. Suggests removing filters.
3. Offers broader category search.
4. Does not blame the user.

No chats:

1. Shows empty state in `Чаты`.
2. Explains that chats appear after contacting or booking with a business.
3. Primary action opens `Поиск`.

Expired history:

1. Search disappears from regular history after retention.
2. If user opens stale deep link, screen shows `История поиска удалена`.
3. Primary action `Повторить поиск` may prefill raw query only if allowed and available.

Network error:

1. Shows calm inline error.
2. Keeps user input.
3. Allows retry.
4. Does not clear current search.

---

## 34. Non-negotiable UX locks

1. `Поиск` is the main customer tab and product front.
2. `История` combines search history, snapshots and chats.
3. `Чаты` appears as a sub-tab/fast lane inside `История`.
4. Search history stores snapshots for maximum 10 days.
5. Snapshot is fixed when search stops being current.
6. Raw query is preserved everywhere.
7. Category scopes/ranks search but does not force SKU selection.
8. User can search goods, services and businesses from one search entry.
9. Business page has `Услуги` and `Товары` tabs.
10. Booking confirmation uses bottom sheet.
11. Ask chat is scoped to a specific business and context.
12. Chat opens as its own screen/sub-view.
13. External WhatsApp/Telegram actions do not replace Ask chat.
14. Product response feed uses compact rows and expanded details.
15. Compact row does not duplicate address or long comment.
16. Expanded response contains product image, business, product, price, comment, address, 2GIS and contacts.
17. Manual replies do not invent exact stock, courier SLA or delivery facts.
18. Dispatch loading ends after request is sent.
19. Waiting for human replies is calm, not a spinner.
20. Business mobile app supports dashboard, bookings/requests and services/products management.
21. Business web cabinet supports dashboard, products, services, bookings and settings.
22. One business response can be updated only once for the same product request.
23. Updating response keeps the same row, no duplicate response rows.
24. Suspended/inactive businesses do not receive dispatch.

---

## 35. End-to-end customer story

1. Клиент открывает Ask.
2. Открывается вкладка `Поиск`.
3. Вверху виден город/район.
4. Клиент видит заголовок `Что вам нужно сегодня?`.
5. Клиент нажимает search bar `Услуга, товар или место…`.
6. Он пишет `стрижка до 5000 в 18:00`.
7. Ask показывает chips: `до 5 000`, `сегодня 18:00`, `рядом`.
8. Клиент видит найденные варианты.
9. Он нажимает карточку барбершопа.
10. Открывается business page.
11. Он видит cover, рейтинг, расстояние, описание, кнопку `Написать сообщение`.
12. Активна вкладка `Услуги`.
13. Он нажимает `Записаться` на услуге `Мужская стрижка`.
14. Снизу открывается booking sheet.
15. Он выбирает slot `18:00`.
16. Он пишет необязательный комментарий.
17. Нажимает `Подтвердить запись`.
18. Sheet показывает success `Вы записаны!`.
19. В истории появляется search/booking context.
20. В `История → Чаты` появляется чат с этим бизнесом, если бизнес отправил сообщение или пользователь написал первым.
21. Клиент открывает чат.
22. Пишет уточнение.
23. Бизнес отвечает.
24. Клиент возвращается назад к бизнесу или истории.

---

## 36. End-to-end product request story

1. Клиент открывает `Поиск`.
2. Пишет `Mammut gainer 5 kg chocolate`.
3. Ask определяет product intent и sport nutrition category.
4. Клиент может оставить категорию автоматически или открыть category picker.
5. Нажимает `Спросить` / `Найти`.
6. Создается current product request.
7. Показывается progress card.
8. Во время dispatch виден короткий radar loading.
9. После отправки status становится `Отправлен`.
10. Loading исчезает.
11. Бизнесы получают request.
12. Первый бизнес отвечает `Есть`, указывает цену и комментарий.
13. У клиента появляется compact response row.
14. Клиент нажимает row.
15. Row раскрывается в details.
16. Клиент видит product image, business, price, comment, address, 2GIS, Ask chat, WhatsApp, Telegram.
17. Клиент нажимает `Чат в Ask`.
18. Открывается chat screen.
19. Клиент задает уточняющий вопрос.
20. Бизнес отвечает.
21. Если бизнес один раз обновляет цену или предлагает аналог, та же row обновляется на месте.
22. Когда клиент начинает другой поиск, текущий поиск перестает быть current.
23. Фиксируется snapshot.
24. Snapshot доступен в `История` до 10 дней.
25. В snapshot можно открыть товары, бизнесы, результаты и чаты, связанные с этим поиском.

---

## 37. Final product feeling

Ask ощущается как:

1. Теплое, легкое, локальное mobile app.
2. Быстрый способ спросить и получить варианты.
3. Единая точка для товаров, услуг, бизнесов, записей и чатов.
4. Спокойная система ожидания ответов.
5. Product/service-focused interface с реальными изображениями.
6. Понятный кабинет для бизнеса.
7. История, которая помогает вернуться к недавним поискам, но не становится вечным архивом.

Ask не ощущается как:

1. Темный corporate dashboard.
2. Маркетплейс с обязательным выбором SKU.
3. Telegram bot admin panel.
4. Бесконечный spinner.
5. Огромная лента карточек без compact mode.
6. Каталог без человеческого запроса.
7. Чат-приложение без search context.
8. Веб-форма, сжатая в телефон.

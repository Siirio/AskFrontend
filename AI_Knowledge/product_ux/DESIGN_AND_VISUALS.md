> Этот файл защищает проект от повторения старого нежелательного визуального стиля.
>
> Основной UX/UI flow описан в `Ask_UX_UI_EXPECTED_FLOW.md`. Этот файл не заменяет flow, а только задает визуальные guardrails.

---

## 1. Главная цель

Визуально Ask должен быть ближе к актуальным approved screenshots: чистый современный интерфейс, белый фон, аккуратные карточки, зеленый/teal акцент, хорошая мобильная плотность, понятный marketplace/service app уровень исполнения.

Не копировать старый prototype style из старого MD/HTML, где были:

- warm ivory / yellow gradient background;
- olive-brown text;
- blue primary accent;
- Trebuchet MS;
- тяжелые теплые тени;
- коричневатые borders;
- игрушечные card-heavy blocks;
- слишком “уютный” proto-style вместо современного clean app.

---

## 2. Что НЕ брать из старого MD

Старый MD содержал визуальную систему. Ее нельзя использовать как source of truth.

Не использовать как обязательные:

- конкретные hex цвета из старого MD;
- старый warm/milk/ivory фон;
- старую типографику;
- старый radius/shadow recipe;
- старую brown/olive палитру;
- старый вид карточек;
- старый HTML preview style.

Если UX-flow говорит “карточка”, это означает функциональный блок, а не конкретную старую карточку.

Если UX-flow говорит “chip”, это означает элемент выбора/фильтра, а не конкретный цвет/тень/границу.

Если UX-flow говорит “bottom sheet”, это означает поведение и размещение, а не конкретный старый visual treatment.

---

## 3. На что ориентироваться визуально

Ориентироваться на предоставленные новые screenshots:

- логотип Ask kz сверху;
- светлый чистый фон;
- аккуратная строка поиска;
- зеленый/teal основной акцент;
- мягкие белые карточки;
- современная iOS/PWA-like плотность;
- понятные product/service cards;
- табличный business cabinet с чистым sidebar;
- mobile-first layout;
- desktop как адаптация, а не отдельный тяжелый маркетплейс.

Важно: дизайн “как на скринах” означает направление, визуальную плотность и общий clean marketplace/service app style, но с поправкой на новые UX-правки:

- нижняя навигация: `Поиск / История / Профиль`;
- нет отдельного `Избранное` на MVP;
- нет отдельной нижней вкладки `Чаты`;
- категории рядом с поиском, а не отдельной большой витриной;
- услуги работают как заявка на запись;
- бизнес-кабинет проще и без лишнего шума.

---

## 4. Разрешенные визуальные принципы

Можно использовать:

- белые и near-white surfaces;
- subtle borders;
- аккуратные shadows;
- rounded cards, если они выглядят современно;
- teal/green accent как primary;
- compact chips;
- tabbed controls;
- clean list rows;
- product image cards;
- status pills;
- bottom sheets;
- sticky bottom action buttons;
- mobile safe areas;
- responsive PWA layout.

---

## 5. Запрещенные visual regressions

Нельзя:

- превращать приложение в старый warm ivory prototype;
- делать фон желтым/кремовым градиентом как в старом HTML;
- использовать Trebuchet MS как identity;
- делать карточки слишком игрушечными;
- использовать темно-оливковый текст как основной стиль бренда;
- делать синий primary, если в approved screenshots акцент teal/green;
- перегружать главную сеткой категорий;
- делать desktop как тяжелый marketplace sidebar-first;
- копировать старый `Ask UX/UI Flow Preview` HTML как визуальный reference.

---

## 6. Как читать flow вместе с visual guardrails

`Ask_UX_UI_EXPECTED_FLOW.md` говорит:

- что появляется;
- куда нажимать;
- что меняется;
- какой context сохраняется;
- где появляется история;
- как обновляются статусы;
- как работает back behavior.

Этот файл говорит:

- в каком визуальном направлении это оформлять;
- чего нельзя копировать;
- какие screenshots считать ближе к approved direction.

Если есть конфликт:

1. Поведение брать из `Ask_UX_UI_EXPECTED_FLOW.md`.
2. Визуальное направление брать из новых screenshots.
3. Старый visual style не использовать.

---

## 7. Инструкция для Codex

Перед генерацией UI Codex должен учитывать:

- Do not infer visual styling from old MD.
- Do not reuse old warm ivory / brown / blue / Trebuchet prototype style.
- Use current approved screenshots as the visual direction.
- Keep UX behavior from `Ask_UX_UI_EXPECTED_FLOW.md`.
- If uncertain, prioritize clean modern mobile-first interface with teal accent and simple white cards.
  """
# Native Entity Creation Design

## Goal

Make branch, Item, Service, and UniqueOffer creation feel like familiar business tools while preserving the existing AskBackend contracts and the wanted visual language.

## Interaction model

- Item and Service use a right-side editor drawer because they are frequent, compact catalog actions.
- Branch uses a focused two-step workspace because address selection and working hours need more room.
- UniqueOffer uses a focused three-step composer because type, content, and publication period are distinct decisions.
- Editing keeps the existing data and permissions but uses the same field grouping vocabulary.
- Creation never exposes the active flag. New Items and Services are always sent as active.
- Advanced metadata stays available behind an explicit disclosure instead of competing with required fields.
- Every editor has a clear title, supporting text, close/back action, visible step or section context, and a sticky action bar.

## Item flow

The first view contains name, category, price, required product link, and branch context. Description, tags, and attributes are grouped under “Дополнительно”. The primary action is “Добавить товар”.

## Service flow

The first view contains name, category, price, and service format. Schedule appears only for scheduled services. Description and attributes are grouped under “Дополнительно”. The primary action is “Добавить услугу”.

## Branch flow

Step one contains branch name, place search, map selection, and address clarification. Step two contains time zone, weekly hours, and special hours. Coordinates remain implementation data and are never shown as user-facing fields.

## UniqueOffer flow

Step one selects the offer type and captures name and description. Step two captures promotional metadata supported by the existing contract. Step three captures publication dates and shows a compact summary before creation. No new event, ticket, or registration concepts are introduced.

## Visual and responsive behavior

The editors use the existing warm surfaces, orange primary action, restrained borders, and theme tokens. Desktop drawers are 560–640 pixels wide. On narrow screens they become full-screen workspaces. Motion is limited to 180–220 millisecond state transitions and respects reduced-motion preferences.

## Reference patterns

- Shopify product creation: required product identity first, optional metadata later.
- Square service creation: service type controls which fields are relevant.
- Google Business Profile: address selection precedes hours and operational details.
- Eventbrite event composer: complex publication is divided into understandable stages and ends with review.

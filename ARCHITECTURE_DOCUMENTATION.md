# Ask Frontend - Architecture Documentation

This document outlines the architectural structure of the Ask Frontend project. We follow **Feature-Sliced Design (FSD)** to ensure the codebase remains scalable, predictable, and easy to navigate. 

By strictly adhering to these rules, we prevent heavy business logic from being scattered and duplicated across different client implementations (Android, iOS, Web).

## Directory Structure

All application source code resides inside the `src/` directory, which is divided into the following layers. The layers are ordered from the highest level of abstraction (top) to the lowest (bottom):

### 1. `app/`
**Purpose:** Application bootstrap, global configuration, and routing shell.
**What goes here:**
- Global styles, theme providers, and CSS resets.
- Store initialization, global context providers, and DI containers.
- Main router setup and layout shells.

### 2. `pages/`
**Purpose:** Route-level screen composition.
**What goes here:**
- Components that represent full pages or screens (e.g., `SearchPage`, `ProductDetailsPage`, `SupplierCabinetPage`).
- Pages compose widgets and features but should ideally contain minimal business logic themselves.

### 3. `widgets/`
**Purpose:** Larger UI blocks composed from features and entities.
**What goes here:**
- Standalone structural components that combine multiple features (e.g., `Header`, `ProductCatalog`, `SupplierInbox`).
- These are highly reusable blocks tied to specific product domain requirements.

### 4. `features/`
**Purpose:** User actions, interactions, and product flows.
**What goes here:**
- Logic and UI for specific user scenarios (e.g., `SearchProducts`, `CreateFallbackRequest`, `FilterResponses`, `SendSupplierReply`).
- **Important:** Each feature directory should be self-contained. It must contain its own UI components, state management, API adapters, validation, tests, and helpers. Do not scatter related code across global folders.

### 5. `entities/`
**Purpose:** Frontend domain models and business entities.
**What goes here:**
- Core data models and their pure, behaviorless UI representations (e.g., `Request`, `Supplier`, `Response`, `CatalogItem`, `Service`, `Schedule`).
- Contains the types, API requests, store slices, and simple UI cards related directly to that entity. 

### 6. `shared/`
**Purpose:** Reusable UI primitives, utilities, and infrastructure.
**What goes here:**
- UI kits (Buttons, Inputs, Modals, Typography).
- Platform adapters and base API transport (HTTP clients, interceptors).
- General utilities, formatting functions, constants, and types that are not tied to a specific business domain.

## Key Architectural Rules

1. **One-Way Dependency Rule (Imports Flow Downward):** 
   A module in a specific layer can only import from modules in the layers strictly below it. 
   - *Example:* `features/` can import from `entities/` and `shared/`.
   - *Example:* `entities/` CANNOT import from `features/` or `pages/`.
   - *Example:* Code within `shared/` CANNOT import from any other layer.

2. **Strict Separation of Concerns (DTOs vs. View Models):** 
   Keep API Data Transfer Objects (DTOs) separate from UI View Models. Do not "invent" backend data in the UI. If the backend API does not provide a fact (e.g., exact stock quantity, courier availability), do not imply or calculate it in the frontend. If a source is weak, the UI should indicate that confirmation is needed.

3. **Local Reasoning:** 
   When a developer works on a feature (e.g., "Smart Search"), all related code should be located within that feature's directory. Avoid generic catch-all folders like a global `services/` or `utils/` for domain-specific logic.

4. **Cross-Platform API Abstraction:** 
   The backend communication layer must remain independent of visual design. While Android, iOS, and Web clients may have different UIs, they should share a common API/client abstraction so that heavy search, catalog, and fallback logic is not duplicated.

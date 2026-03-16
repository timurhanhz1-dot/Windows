# Requirements Document

## Introduction

Nature.co backoffice paneline entegre edilecek görsel tasarım editörü. Mevcut `DesignSettingsModule.tsx`'in yerini alacak; tema/renk editörü, drag & drop layout editörü, banner canvas editörü ve asset yönetimini tek bir arayüzde birleştirecek. Tüm değişiklikler Firebase `settings/design` path'ine kaydedilecek ve ana uygulamaya gerçek zamanlı yansıyacak.

## Glossary

- **VisualDesignEditor**: Tüm editör sekmelerini barındıran ana konteyner bileşeni
- **ThemeEditor**: Renk, font, spacing ve border-radius ayarlarını yöneten sekme
- **LayoutEditor**: Sidebar, header ve chat alanı gibi bileşenlerin konumunu drag & drop ile değiştiren sekme
- **BannerEditor**: Profil banner ve sunucu kapak görseli için canvas editörü
- **AssetsEditor**: Logo, favicon ve özel emoji yönetimi sekmesi
- **DesignStateManager**: Firebase `settings/design` path'i ile senkronizasyonu yöneten servis katmanı
- **LayoutSlot**: Sürüklenebilir bir layout bileşenini temsil eden veri yapısı
- **BannerElement**: Banner canvas üzerindeki bir elementi (görsel, metin, şekil, gradient) temsil eden veri yapısı
- **ThemeConfig**: Renk, font ve spacing ayarlarını içeren tema yapılandırması
- **DesignState**: Firebase `settings/design` path'indeki tüm tasarım verilerini temsil eden birleşik yapı
- **CSS_Variable_Updater**: `document.documentElement.style.setProperty` aracılığıyla anlık önizleme sağlayan mekanizma
- **RoleGuard**: Backoffice rol kontrolü yapan mevcut bileşen
- **AuditLog**: Her kaydetme işleminin kaydedildiği denetim günlüğü sistemi

---

## Requirements

### Requirement 1: Ana Editör Konteyneri ve Sekme Navigasyonu

**User Story:** As a super_admin, I want a unified visual design editor with tab navigation, so that I can manage all design aspects from a single interface.

#### Acceptance Criteria

1. THE VisualDesignEditor SHALL render four tabs: "Tema", "Layout", "Banner" ve "Assets"
2. WHEN a tab is selected, THE VisualDesignEditor SHALL display the corresponding editor component
3. THE VisualDesignEditor SHALL be protected by RoleGuard allowing only super_admin role
4. WHEN the editor mounts, THE DesignStateManager SHALL load the current DesignState from Firebase `settings/design`
5. WHEN a save action is triggered, THE DesignStateManager SHALL write an AuditLog entry via `writeAuditLog`
6. THE VisualDesignEditor SHALL maintain an undo/redo stack of at least 10 state changes

---

### Requirement 2: Tema Editörü

**User Story:** As a super_admin, I want to edit colors, fonts, and spacing with live preview, so that I can see design changes before saving.

#### Acceptance Criteria

1. THE ThemeEditor SHALL provide color inputs for `primary_color`, `bg_color`, `accent_color`, `sidebar_color` and `text_color` fields
2. WHEN a color value changes, THE CSS_Variable_Updater SHALL apply the change to `document.documentElement` immediately without waiting for save
3. THE ThemeEditor SHALL validate that color inputs match the pattern `#[0-9A-Fa-f]{6}`
4. IF a color input contains an invalid value, THEN THE ThemeEditor SHALL display a visual error indicator and disable the save button
5. THE ThemeEditor SHALL provide numeric inputs for `font_size` (10–32 px) and `border_radius` (0–24 px)
6. IF a numeric input is outside the allowed range, THEN THE ThemeEditor SHALL clamp the value to the nearest boundary
7. THE ThemeEditor SHALL list available theme presets from `src/constants/themes.tsx` and apply them when selected
8. THE ThemeEditor SHALL provide URL inputs for `logo_url` and `favicon_url`
9. IF a URL input does not start with `https://`, THEN THE ThemeEditor SHALL display a validation error
10. WHEN the save button is clicked, THE DesignStateManager SHALL call Firebase `update()` with only the theme fields, preserving other DesignState sections

---

### Requirement 3: Layout Editörü

**User Story:** As a super_admin, I want to rearrange layout components via drag and drop, so that I can customize the application's visual structure.

#### Acceptance Criteria

1. THE LayoutEditor SHALL render LayoutSlots for `sidebar`, `channel-sidebar`, `chat-area`, `header` and `footer`
2. THE LayoutEditor SHALL use `@dnd-kit/core` and `@dnd-kit/sortable` for drag and drop interactions
3. WHEN a drag operation ends, THE LayoutEditor SHALL update the `order` property of all affected LayoutSlots
4. AFTER a drag operation, THE LayoutEditor SHALL contain each LayoutSlot exactly once in the slots list
5. THE LayoutEditor SHALL provide a toggle to switch between mobile and desktop preview modes
6. WHEN layout changes are saved, THE DesignStateManager SHALL write to `settings/design/layout` without modifying other DesignState sections
7. THE LayoutEditor SHALL allow setting `sidebarWidth` between 48 and 320 px

---

### Requirement 4: Banner Editörü

**User Story:** As a super_admin, I want a canvas-based banner editor, so that I can create and export profile banners and server cover images.

#### Acceptance Criteria

1. THE BannerEditor SHALL support two banner types: `profile_banner` and `server_cover`
2. THE BannerEditor SHALL render a canvas using Fabric.js or Konva.js with maximum dimensions of 1920×600 px
3. THE BannerEditor SHALL allow adding BannerElements of types: `image`, `text`, `shape` and `gradient`
4. WHEN a BannerElement is selected, THE BannerEditor SHALL display a properties panel for `width`, `height`, `rotation`, `opacity` and type-specific properties
5. WHEN the export button is clicked, THE BannerEditor SHALL call `canvas.toDataURL()` to produce a PNG representation
6. WHEN export produces a PNG, THE BannerEditor SHALL upload the blob to Firebase Storage
7. WHEN the Firebase Storage upload succeeds, THE BannerEditor SHALL update `settings/design/profile_banner_url` or `settings/design/server_cover_url` accordingly
8. IF the selected image file exceeds 5 MB, THEN THE BannerEditor SHALL reject the upload and display an error toast before any network request
9. IF the canvas export or Firebase Storage upload fails, THEN THE BannerEditor SHALL display an error toast and preserve the previous banner URL
10. WHEN text is added as a BannerElement, THE BannerEditor SHALL sanitize the text content before rendering it on the canvas

---

### Requirement 5: Assets Editörü

**User Story:** As a super_admin, I want to manage logos, favicons, and custom emojis, so that I can control the application's brand assets.

#### Acceptance Criteria

1. THE AssetsEditor SHALL provide URL inputs for `logo_url` and `favicon_url` with inline preview
2. WHEN a valid `logo_url` is entered, THE AssetsEditor SHALL display an `<img>` preview of the logo
3. THE AssetsEditor SHALL allow adding custom emojis with a name and value (URL or emoji character)
4. WHEN a custom emoji is added, THE AssetsEditor SHALL write to `settings/custom_emojis/{emojiId}` via `addCustomEmoji`
5. WHEN a custom emoji is deleted, THE AssetsEditor SHALL remove it from `settings/custom_emojis/{emojiId}` via `removeCustomEmoji`
6. WHEN an emoji is added or removed, THE AssetsEditor SHALL write an AuditLog entry

---

### Requirement 6: DesignState Yönetimi ve Geriye Dönük Uyumluluk

**User Story:** As a developer, I want the new editor to be backward compatible with existing design fields, so that the main application continues to work without changes.

#### Acceptance Criteria

1. THE DesignStateManager SHALL read and write the legacy fields `primary_color`, `bg_color`, `font_size`, `border_radius`, `bg_style`, `logo_url` and `favicon_url` at the root of `settings/design`
2. WHEN any editor section saves data, THE DesignStateManager SHALL use Firebase `update()` (partial write) so that unmodified sections are not overwritten
3. THE DesignStateManager SHALL expose an `onValue` listener on `settings/design` that triggers CSS variable updates in the main application
4. WHEN `settings/design` changes in Firebase, THE DesignStateManager SHALL update the corresponding CSS variables on `document.documentElement`
5. THE DesignStateManager SHALL validate `primary_color`, `bg_color`, `accent_color`, `sidebar_color` and `text_color` as valid hex colors before writing to Firebase
6. THE DesignStateManager SHALL validate `font_size` is between 10 and 32 and `border_radius` is between 0 and 24 before writing to Firebase
7. THE DesignStateManager SHALL validate that URL fields are empty or start with `https://` before writing to Firebase

---

### Requirement 7: Hata Yönetimi

**User Story:** As a super_admin, I want clear error feedback when operations fail, so that I can understand what went wrong and recover.

#### Acceptance Criteria

1. IF a Firebase write operation fails, THEN THE VisualDesignEditor SHALL display an error toast with a descriptive message
2. IF a Firebase write operation fails, THEN THE CSS_Variable_Updater SHALL revert CSS variables to their pre-change values
3. IF a Firebase Storage upload fails, THEN THE BannerEditor SHALL preserve the existing banner URL in DesignState
4. THE VisualDesignEditor SHALL allow the user to retry a failed save operation by clicking the save button again

---

### Requirement 8: Performans

**User Story:** As a super_admin, I want the editor to be responsive and not cause unnecessary Firebase writes, so that the editing experience is smooth.

#### Acceptance Criteria

1. WHILE a color picker is being interacted with, THE ThemeEditor SHALL debounce Firebase writes by at least 500 ms
2. WHILE a color picker is being interacted with, THE CSS_Variable_Updater SHALL apply CSS variable changes immediately without debounce
3. THE BannerEditor SHALL be loaded lazily using `React.lazy()` so that its dependencies are not bundled in the initial load
4. THE DesignStateManager SHALL use a single `onValue` listener on `settings/design` rather than multiple listeners on sub-paths

# Switch Content Entities to Puck Visual Editor

## Summary

Replaced the Markdown-based editor (`SimpleMarkdownEditor`) for content entities (club, course, activity, project, faculty, post) with the **Puck visual editor**, aligning all content types with how pages are already edited. Also added **13 new Puck components** tailored for content detail pages.

## What Changed

### 1. Editor — `ContentEntityEditor.tsx`
- Replaced `SimpleMarkdownEditor` with Puck's `<Puck>` component
- Content is now stored as Puck JSON in `contentDraftEN` / `contentDraftZH` (same as pages)
- Preview tab already used `<Render>` with `JSON.parse`, so it worked out of the box
- Removed dead `markdownContent` state, `SimpleMarkdownEditor` import, and `Markdown` import

### 2. Public Render — `AnyContentEntityPage.tsx`
- Replaced Markdown parsing + `SectionRenderer` with Puck `<Render>`
- Removed all Markdown imports, `parseMarkdownSections`, section components
- Simplified to: `EntityHero` (cover image + title) → full-width `<Render>`
- Deleted `ContentEntitySections.tsx` (dead code, no longer imported)

### 3. New Puck Components (13 total)

| Component | File | Description |
|---|---|---|
| 时间线 | `Timeline.tsx` | Timeline with date, title, description per item |
| 联系方式 | `ContactCard.tsx` | Contact cards with icon, label, value, link |
| 社团负责人 | `LeadershipGrid.tsx` | Leadership grid with avatar, name, role, period |
| 课程大纲 | `Syllabus.tsx` | Syllabus list with unit, topic, description |
| 任课教师 | `InstructorCard.tsx` | Instructor card with bio, avatar, subject, email |
| 地点 | `LocationCard.tsx` | Location card with venue, address, map link |
| 团队成员 | `TeamGrid.tsx` | Team member grid with avatar, role, period |
| 统计数字 | `StatBlock.tsx` | Stat display with prefix, value, label |
| 常见问题 | `FAQAccordion.tsx` | Collapsible FAQ accordion |
| 视频 | `VideoEmbed.tsx` | YouTube embed with caption |
| 图片集 | `ImageGalleryBlock.tsx` | Grid/masonry/slider image gallery |
| 引言块 | `QuoteBlock.tsx` | Quote with author, title, avatar |
| 行动按钮 | `CTAButton.tsx` | CTA button with primary/secondary style |

All components use **bilingual fields** (e.g., `titleEN` + `titleZH`) per item, matching the site's English/Chinese dual-language pattern.

### 4. Puck Config — `puck-config.tsx`
- Registered all 13 new components
- Added new category `内容详情` (Content Detail) containing all entity-specific components

### 5. Entity Creation — `entity-actions.ts`
- Fixed slug uniqueness: append `${Date.now().toString(36)}` to prevent `Unique constraint failed` errors when creating entities with the same title
- `getDefaultContent` / `getDefaultContentZH` now return empty Puck JSON `{}` for all entity types (no more Markdown templates)

## Migration Note

Existing content entities that have Markdown stored in `contentDraftEN` / `contentDraftZH` will break in the Puck editor (Puck will try to parse Markdown as JSON). A migration step is needed to convert those to Puck JSON or clear them.

## Files Changed

```
src/app/lib/puck/components/       (+13 new files)
src/app/lib/puck/puck-config.tsx    (register new components)
src/app/studio/editor/[id]/ContentEntityEditor.tsx
src/app/studio/editor/entity-actions.ts
src/app/[[...slug]]/AnyContentEntityPage.tsx
src/app/[[...slug]]/ContentEntitySections.tsx  (deleted)
```

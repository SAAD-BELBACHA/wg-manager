# Zofri Social Utility Design Audit

## Current Visual Problems
- The app works, but many screens still feel like a web dashboard translated to mobile.
- Cards are visually similar: white surface, same radius, same spacing, repeated structure.
- Dashboard lacks emotional hierarchy; every section competes equally.
- Copy is functional but often neutral instead of social and motivating.
- Avatar/social presence appears mostly on WG/profile pages, not across the main experience.
- Icon usage currently relies on FontAwesome in tabs, while the product direction asks for one consistent icon style.
- Motion/haptics are minimal; buttons only change opacity.

## Navigation
- Five-tab structure is correct.
- Tab bar is still too standard and not enough like a lifestyle app.
- Secondary modules exist, but entry points need stronger cards and friendlier labels.

## Color And Typography
- Existing palette is close but not the requested Zofri Social Utility palette.
- Dark mode tokens are missing.
- Typography has hierarchy, but headlines need more expressive scale and weight.

## Dashboard Target Structure
- Personal greeting.
- Member avatar group.
- One large WG Pulse hero card.
- One featured task of the day.
- Two compact cards: money and shopping.
- Social activity preview.
- Quick actions.

## Components To Introduce First
- `HeroCard`
- `MemberAvatar`
- `AvatarGroup`
- `StatusPill`
- `QuickAction`
- `SectionHeader`
- `ActivityLine`
- Updated design tokens with light/dark color families.



## Delete "New features" Space and Preserve Tasks

### What I Found

"New features" is a **Space** (not a folder), containing **9 tasks**, no folders, and no lists. One task ("Adding task board") is linked to a list called "Test sprint" in the Marketing folder of another space.

### Plan

This is a **data operation**, not a code change. I will:

1. **Move all 9 tasks** out of the "New features" space by setting their `space_id` to another existing space (e.g. "GlobalyOS" or whichever you prefer). Tasks without a `list_id` will remain unassigned to any list but will be preserved in the target space.

2. **Delete the "New features" space** record from `task_spaces`.

### Question Before Proceeding

Which space should the 9 tasks be moved to?

| Space | Icon |
|-------|------|
| Content Management | 📁 |
| Engineering | 🚀 |
| Globaly App | ⚡ |
| GlobalyOS | (custom) |
| Product Team | 🎯 |

Or should I move them to a **specific list** within one of these spaces?


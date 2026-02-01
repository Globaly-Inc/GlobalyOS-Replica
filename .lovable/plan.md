

# Remove Chat/Wiki Events from Activity Timeline

## Problem
The activity timeline is showing `chat_sent`, `chat_created`, and `wiki_updated` events that are not relevant to the employee profile timeline. These events clutter the timeline with noise since they have their own dedicated modules.

## Events to Exclude (Per User Request)
| Event Type | Reason |
|------------|--------|
| `chat_sent` | Chat messages have their own module |
| `chat_created` | Chat conversations have their own module |
| `wiki_updated` | Wiki has its own version history |

## Events to Keep
All other events remain visible in the timeline:
- `wiki_created` - Creating wiki pages is a notable achievement
- `update_posted` - Team feed posts show engagement
- `kudos_given` - Shows recognition activity
- All attendance, leave, document, KPI, and profile events

## Solution
Update the database RPC function `get_employee_activity_timeline` to filter out only the three specified event types from the `user_activity_logs` query.

## Technical Changes

### Database Migration
Create migration to update the RPC function's `user_activity_logs` section:

```sql
-- Add WHERE clause to exclude specific chat/wiki events:
WHERE ual.organization_id = te.organization_id
  AND ual.activity_type NOT IN ('chat_sent', 'chat_created', 'wiki_updated')
```

## Impact Assessment
| Aspect | Details |
|--------|---------|
| User Impact | Cleaner timeline without chat noise |
| Risk | Low - filtering display only, data preserved |
| Effort | Small - single migration |
| Testing | Verify excluded events don't appear, verify kept events still show |


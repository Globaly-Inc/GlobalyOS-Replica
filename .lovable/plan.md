

## Fix Bullet Points in Public Job Detail Page

### Problem
The job description rendered in `src/pages/careers/JobDetailPublic.tsx` (line 257) uses `prose prose-sm` but is missing explicit list styling classes. The Tailwind `prose` plugin sometimes doesn't apply `list-disc` by default depending on CSS resets, causing bullet points to be invisible.

### Solution
Add the same list styling classes already used in `JobPostPreview.tsx` to the description `div` on line 257.

### Change (single file)

**`src/pages/careers/JobDetailPublic.tsx` -- line 257**

Change:
```
className="prose prose-sm max-w-none dark:prose-invert"
```
To:
```
className="prose prose-sm max-w-none dark:prose-invert [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
```

Apply the same fix to the `requirements` div (line 271) and `benefits` div (if similarly styled) so all rich-text sections render bullet points consistently.

No other formatting or layout changes.


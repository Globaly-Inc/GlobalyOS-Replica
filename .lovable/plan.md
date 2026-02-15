

## Application Form Settings with Custom Fields

### What This Does

Add an "Application Form" settings card to the Job Edit page (right column, below Publishing Options). This lets hiring managers configure which fields appear on the public application form for each job, plus create custom fields.

### How It Works

**Default (compulsory) fields** -- always shown, cannot be removed:
- Full Name
- Email
- Phone Number
- Resume Upload
- Source (new -- a dropdown for "How did you hear about us?")

**Optional built-in fields** -- toggleable on/off:
- LinkedIn / Personal URL
- Cover Letter

**Custom fields** -- user can add new ones with:
- Field label (e.g., "Portfolio Link", "Years of Experience")
- Field type: Text Input or File Upload
- Required toggle
- Ability to reorder and delete

### Database Changes

Add a JSONB column `application_form_config` to the `jobs` table:

```sql
ALTER TABLE public.jobs
ADD COLUMN application_form_config JSONB DEFAULT '{}';
```

The JSON structure:

```json
{
  "optional_fields": {
    "linkedin_url": true,
    "cover_letter": false
  },
  "custom_fields": [
    {
      "id": "cf_abc123",
      "label": "Portfolio Link",
      "type": "text",
      "required": false
    },
    {
      "id": "cf_def456",
      "label": "Work Sample",
      "type": "file",
      "required": true
    }
  ],
  "source_options": ["LinkedIn", "Referral", "Job Board", "Company Website", "Other"]
}
```

### Files to Modify

**1. New component: `src/components/hiring/ApplicationFormSettings.tsx`**
- A Card with title "Application Form"
- Section 1: "Required Fields" -- read-only list showing Full Name, Email, Phone, Resume, Source with lock icons
- Section 2: "Optional Fields" -- toggles for LinkedIn URL, Cover Letter
- Section 3: "Custom Fields" -- list with add button, each has label input, type selector (Text/File), required toggle, delete button
- Section 4: "Source Options" -- editable list of dropdown values for the "How did you hear about us?" field
- Props: `config` object and `onChange` callback

**2. `src/pages/hiring/JobEdit.tsx`**
- Add `application_form_config` to formData state
- Import and render `ApplicationFormSettings` in the right column after Publishing Options
- Include it in the save payload

**3. `src/pages/hiring/JobCreate.tsx`**
- Add `application_form_config` with sensible defaults to initial formData
- Render the same `ApplicationFormSettings` component

**4. `src/pages/careers/JobDetailPublic.tsx`**
- Read `application_form_config` from the job data
- Conditionally render LinkedIn field based on config
- Add "Source" dropdown field (always shown, using configured options)
- Render custom text fields as Input elements
- Render custom file fields as file upload elements
- Pass all custom field values and files to the submit mutation

**5. `src/components/hiring/InternalApplyDialog.tsx`**
- Add the "Source" field (pre-filled as "internal", hidden or read-only)

**6. `supabase/functions/submit-public-application/index.ts`**
- Accept `source_of_application` from form (already partially supported)
- Accept `custom_fields_data` as JSON with custom text answers
- Accept `custom_files` as additional named file uploads
- Store custom field responses in the application's `custom_fields` JSONB column

**7. `src/types/hiring.ts`**
- Add `application_form_config` type definition
- Add it to the Job interface

### UI Layout (Application Form Card)

```text
+------------------------------------------+
| Application Form                         |
| Configure fields shown to applicants     |
+------------------------------------------+
| REQUIRED FIELDS                          |
|  [lock] Full Name                        |
|  [lock] Email                            |
|  [lock] Phone Number                     |
|  [lock] Resume Upload                    |
|  [lock] Source                           |
+------------------------------------------+
| OPTIONAL FIELDS                          |
|  [toggle] LinkedIn / Personal URL        |
|  [toggle] Cover Letter                   |
+------------------------------------------+
| CUSTOM FIELDS                            |
|  Portfolio Link    [Text]  [Req] [x]     |
|  Work Sample       [File]  [Req] [x]    |
|  [+ Add Field]                           |
+------------------------------------------+
| SOURCE OPTIONS                           |
|  LinkedIn, Referral, Job Board, ...      |
|  [+ Add Option]                          |
+------------------------------------------+
```


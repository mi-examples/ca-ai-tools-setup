Create a Form.php file using @form-generation.mdc.

1. Form location:
    - Module: {module}
    - Controller: {controller}

2. Form Properties:
   - Form ID: {formId}
   - Form UID: {formUid}
   - Table: {tableName}
   - Primary Key: {primaryKey}

3. Fields:
   - List the fields you need with their:
     * Names
     * Validators (if any)
     * Filters (if any)
     * Default values (if any)

4. Layout Structure:
   - Do you need specific tabs?
   - How should fields be grouped?
   - Any specific components or wrappers needed?

5. Components:
    - List components needed for each tab:
        * Name
        * Type (e.g., text, checkbox, select)
        * Properties (if any)
        * Dependencies (if any)
        * Helper if needed
   
6. Operations:
   - Which operations are needed? (Load/Save/Delete)
   - Any custom operation classes?

7. Buttons:
   - Which action buttons are required?
   - Any custom button paths?


### Examples
1. Creating a new form file using the form generation guidelines
   - Create form using @form-generation.mdc. Module: Editor. Controller: CustomField2. Form Id: customFieldId. Fields: custom_field_id (hidden), name (text, max length 100 chars), description(text), used_for_metric_ind (checkbox), grid with custom field values. Tabs: info and permissions

2. If prompt is being used within a file context
   - Write form using @form-generation.mdc. Form Id: customFieldId. Fields: custom_field_id (hidden), name (text, max length 100 chars), description(text), used_for_metric_ind (checkbox), grid with custom field values. Tabs: info and permissions

3. Create form based on table fields created in migration
   - Write form using @form-generation.mdc. Form Id: contentTypeId. Use fields from table created in @2025_06_03_171152_mi27353_content_type.php

4. Create form based on table
    - Write form using @form-generation.mdc. Form Id: customFieldSectionId. Config tab: use fields from table dashboard.custom_field_section, add grid with content. Add permissions tab
   
5. Create form based on DB entity class
   - Write form using @form-generation.mdc. Form Id: customFieldSectionId. Config tab: use fields from @CustomFieldSection.php, add grid with content. Add permissions tab
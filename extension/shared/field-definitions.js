(() => {
  const FIELD_DEFINITIONS = {
    "personal.firstName": {
      section: "personal",
      field: "firstName",
      exactTokens: ["first_name", "firstname", "first-name", "fname"],
      strongKeywords: ["first name", "given name"],
      weakKeywords: ["first", "given"],
      autocomplete: ["given-name"],
      types: ["text", "search"]
    },
    "personal.lastName": {
      section: "personal",
      field: "lastName",
      exactTokens: ["last_name", "lastname", "last-name", "lname", "surname"],
      strongKeywords: ["last name", "family name", "surname"],
      weakKeywords: ["last", "family"],
      autocomplete: ["family-name"],
      types: ["text", "search"]
    },
    "personal.email": {
      section: "personal",
      field: "email",
      exactTokens: ["email", "email_address", "e-mail"],
      strongKeywords: ["email", "email address"],
      weakKeywords: ["mail"],
      autocomplete: ["email"],
      types: ["email", "text"]
    },
    "personal.phone": {
      section: "personal",
      field: "phone",
      exactTokens: ["phone", "mobile", "telephone", "cell"],
      strongKeywords: ["phone", "mobile", "telephone"],
      weakKeywords: ["contact", "tel"],
      autocomplete: ["tel", "tel-national"],
      types: ["tel", "text"]
    },
    "personal.linkedin": {
      section: "personal",
      field: "linkedin",
      exactTokens: ["linkedin", "linkedin_url", "linkedin_profile"],
      strongKeywords: ["linkedin", "linkedin profile"],
      weakKeywords: ["profile"],
      autocomplete: [],
      types: ["url", "text"]
    },
    "personal.address": {
      section: "personal",
      field: "address",
      exactTokens: ["address", "street", "address_line_1"],
      strongKeywords: ["street address", "mailing address"],
      weakKeywords: ["address", "street"],
      autocomplete: ["street-address", "address-line1"],
      types: ["text", "textarea"]
    },
    "personal.city": {
      section: "personal",
      field: "city",
      exactTokens: ["city", "town"],
      strongKeywords: ["city"],
      weakKeywords: ["city"],
      autocomplete: ["address-level2"],
      types: ["text"]
    },
    "personal.state": {
      section: "personal",
      field: "state",
      exactTokens: ["state", "province", "region"],
      strongKeywords: ["state", "province"],
      weakKeywords: ["state", "region"],
      autocomplete: ["address-level1"],
      types: ["text", "select-one"]
    },
    "personal.zip": {
      section: "personal",
      field: "zip",
      exactTokens: ["zip", "zipcode", "postal", "postal_code"],
      strongKeywords: ["zip code", "postal code"],
      weakKeywords: ["zip", "postal"],
      autocomplete: ["postal-code"],
      types: ["text"]
    },
    summary: {
      section: "summary",
      field: "summary",
      exactTokens: ["summary", "professional_summary"],
      strongKeywords: ["professional summary", "about you", "summary"],
      weakKeywords: ["summary", "about"],
      autocomplete: [],
      types: ["textarea", "text"]
    },
    skills: {
      section: "skills",
      field: "skills",
      exactTokens: ["skills", "skill_set"],
      strongKeywords: ["skills", "technical skills"],
      weakKeywords: ["skill"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    certifications: {
      section: "certifications",
      field: "certifications",
      exactTokens: ["certifications", "certificates"],
      strongKeywords: ["certifications", "certificates"],
      weakKeywords: ["cert"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    languages: {
      section: "languages",
      field: "languages",
      exactTokens: ["languages", "spoken_languages"],
      strongKeywords: ["languages spoken", "languages"],
      weakKeywords: ["language"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "experience.company": {
      section: "experience",
      field: "company",
      repeatable: true,
      exactTokens: ["company", "employer", "company_name"],
      strongKeywords: ["company", "employer", "organization"],
      weakKeywords: ["company", "employer"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "experience.title": {
      section: "experience",
      field: "title",
      repeatable: true,
      exactTokens: ["job_title", "title", "position"],
      strongKeywords: ["job title", "position title", "role"],
      weakKeywords: ["title", "position", "role"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "experience.startDate": {
      section: "experience",
      field: "startDate",
      repeatable: true,
      exactTokens: ["start_date", "from_date"],
      strongKeywords: ["start date", "from date"],
      weakKeywords: ["start", "from"],
      autocomplete: [],
      types: ["date", "month", "text"]
    },
    "experience.endDate": {
      section: "experience",
      field: "endDate",
      repeatable: true,
      exactTokens: ["end_date", "to_date"],
      strongKeywords: ["end date", "to date"],
      weakKeywords: ["end", "to"],
      autocomplete: [],
      types: ["date", "month", "text"]
    },
    "experience.location": {
      section: "experience",
      field: "location",
      repeatable: true,
      exactTokens: ["location", "work_location"],
      strongKeywords: ["work location", "location"],
      weakKeywords: ["location"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "experience.description": {
      section: "experience",
      field: "description",
      repeatable: true,
      exactTokens: ["description", "responsibilities"],
      strongKeywords: ["job description", "responsibilities", "achievements"],
      weakKeywords: ["description", "responsibilities"],
      autocomplete: [],
      types: ["textarea", "text"]
    },
    "projects.name": {
      section: "projects",
      field: "name",
      repeatable: true,
      exactTokens: ["project_name", "project"],
      strongKeywords: ["project name", "project"],
      weakKeywords: ["project"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "projects.role": {
      section: "projects",
      field: "role",
      repeatable: true,
      exactTokens: ["project_role", "role"],
      strongKeywords: ["project role", "role"],
      weakKeywords: ["role"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "projects.description": {
      section: "projects",
      field: "description",
      repeatable: true,
      exactTokens: ["project_description", "description"],
      strongKeywords: ["project description", "description"],
      weakKeywords: ["description"],
      autocomplete: [],
      types: ["textarea", "text"]
    },
    "projects.link": {
      section: "projects",
      field: "link",
      repeatable: true,
      exactTokens: ["project_link", "portfolio", "github"],
      strongKeywords: ["project link", "project url", "portfolio link"],
      weakKeywords: ["link", "url", "portfolio"],
      autocomplete: [],
      types: ["url", "text"]
    },
    "education.school": {
      section: "education",
      field: "school",
      repeatable: true,
      exactTokens: ["school", "university", "college", "institution"],
      strongKeywords: ["school name", "university", "institution"],
      weakKeywords: ["school", "university"],
      autocomplete: [],
      types: ["text"]
    },
    "education.degree": {
      section: "education",
      field: "degree",
      repeatable: true,
      exactTokens: ["degree", "qualification"],
      strongKeywords: ["degree", "qualification"],
      weakKeywords: ["degree"],
      autocomplete: [],
      types: ["text", "select-one"]
    },
    "education.field": {
      section: "education",
      field: "field",
      repeatable: true,
      exactTokens: ["field_of_study", "major", "specialization"],
      strongKeywords: ["field of study", "major"],
      weakKeywords: ["field", "major"],
      autocomplete: [],
      types: ["text"]
    },
    "education.startYear": {
      section: "education",
      field: "startYear",
      repeatable: true,
      exactTokens: ["start_year", "from_year"],
      strongKeywords: ["start year", "from year"],
      weakKeywords: ["start", "from"],
      autocomplete: [],
      types: ["text", "number", "date", "month"]
    },
    "education.endYear": {
      section: "education",
      field: "endYear",
      repeatable: true,
      exactTokens: ["end_year", "to_year", "graduation_year"],
      strongKeywords: ["end year", "graduation year", "to year"],
      weakKeywords: ["end", "graduation"],
      autocomplete: [],
      types: ["text", "number", "date", "month"]
    },
    "organizations.name": {
      section: "organizations",
      field: "name",
      repeatable: true,
      exactTokens: ["organization", "org_name", "association"],
      strongKeywords: ["organization name", "association"],
      weakKeywords: ["organization", "association"],
      autocomplete: [],
      types: ["text"]
    },
    "organizations.role": {
      section: "organizations",
      field: "role",
      repeatable: true,
      exactTokens: ["role", "position"],
      strongKeywords: ["role", "position held"],
      weakKeywords: ["role", "position"],
      autocomplete: [],
      types: ["text"]
    },
    "organizations.description": {
      section: "organizations",
      field: "description",
      repeatable: true,
      exactTokens: ["description", "details"],
      strongKeywords: ["organization description", "details"],
      weakKeywords: ["description", "details"],
      autocomplete: [],
      types: ["textarea", "text"]
    }
  };

  window.ApplySmartFieldDefinitions = {
    FIELD_DEFINITIONS
  };
})();

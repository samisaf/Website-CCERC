[2026-04-06 10:31] - Updated by Junie
{
    "TYPE": "correction",
    "CATEGORY": "Frontmatter date update",
    "EXPECTATION": "The publications.md frontmatter date should be automatically updated when the script runs.",
    "NEW INSTRUCTION": "WHEN updating publications.md from PubMed data THEN set frontmatter date to today's date in YYYY-MM-DD format"
}

[2026-04-06 11:17] - Updated by Junie
{
    "TYPE": "correction",
    "CATEGORY": "Frontmatter date update",
    "EXPECTATION": "The publications.md frontmatter date should be automatically updated when the script runs.",
    "NEW INSTRUCTION": "WHEN updating publications.md from PubMed data THEN set frontmatter date to today's date in YYYY-MM-DD format"
}

[2026-04-06 11:48] - Updated by Junie
{
    "TYPE": "correction",
    "CATEGORY": "Date placement method",
    "EXPECTATION": "Use a frontmatter variable to hold today's date instead of computing it in the footer.",
    "NEW INSTRUCTION": "WHEN asked to add/update site last updated date THEN set a frontmatter date variable"
}

[2026-04-07 10:49] - Updated by Junie
{
    "TYPE": "preference",
    "CATEGORY": "Workflow orchestration",
    "EXPECTATION": "Invoke fetch-pubmed and update-publications from publications.md frontmatter instead of pre-Astro scripts.",
    "NEW INSTRUCTION": "WHEN orchestrating PubMed updates THEN trigger fetch and update from publications.md frontmatter"
}


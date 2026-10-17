# Lighthouse / PageSpeed audit

**Date:** 2026-10-17  
**Status:** Passed  
**Runner:** Lighthouse 12.6.1, mobile emulation, three runs per page

| Page                                   | Performance | Best practices | SEO | HTML report                                                                              |
| -------------------------------------- | ----------: | -------------: | --: | ---------------------------------------------------------------------------------------- |
| Homepage (`/`)                         |         100 |            100 | 100 | [Run 1](./lighthouse-results/localhost--2026_10_17_03_18_25.report.html)                 |
| Information form (`/application.html`) |         100 |            100 | 100 | [Run 1](./lighthouse-results/localhost-application_html-2026_10_17_03_19_04.report.html) |

All six runs passed the configured minimum of 80 for performance, best practices, and SEO. The individual HTML and JSON reports are attached in [`lighthouse-results/`](./lighthouse-results/).

These scores were measured against the local static server. PageSpeed results for a deployed site can vary with hosting, browser version, and network conditions.

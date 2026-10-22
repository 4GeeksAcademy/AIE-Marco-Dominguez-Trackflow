[META-INSTRUCTION] Act as a Lead Full-Stack Developer. Use this document as a strict specification sheet to build a modern, high-performance, responsive, accessible, and SEO-optimized website and application form using Semantic HTML5, Tailwind CSS, and Vanilla JavaScript / Modern JS Frameworks.

1. Project Overview & ContextCompany Name: TrackFlowIndustry: E-commerce Logistics (3PL), Warehousing, Last-Mile Delivery, and Reverse Logistics.Target Audience: B2B E-commerce merchants (Fashion, Electronics, Cosmetics) seeking logistics outsourcing in US and ES.Tech Stack & Constraints:Styling: Tailwind CSS exclusively (Zero custom CSS unless strictly required for background video overlays).Responsive Layout: Mobile-first architecture across Breakpoints (sm, md, lg, xl).Accessibility (a11y): WAI-ARIA compliance, native semantic HTML tags, keyboard navigation, and descriptive alt tags.Performance: Optimized background video with strict loading attributes (muted, autoplay, loop, playsinline, preload="none"/lazy) to preserve PageSpeed scores.

2. Structure & Page Architecture[TRACKFLOW APPLICATION]
├── 📄 Page 1: Landing Page (Presentation)
│   ├── Header (Sticky Nav)
│   ├── Hero Section (Background Video + CTA)
│   ├── Services Section (3-Column Grid)
│   ├── Coverage Section (2-Column Grid)
│   ├── Key Benefits ("Why TrackFlow" - 4 Cards)
│   ├── Contact Section
│   └── Footer (SEO + Socials)
└── 📄 Page 2: Information Request Form
    ├── Header
    ├── Application / Sign-Up Form (State Validation)
    └── Dynamic Warning & Success States

3. Component & Page Specifications
3.1 Landing Page Components
Header
Brand: TrackFlow (Logo or Styled Text)

Navigation Links:

Home (#hero)

Services (#services)

Coverage (#coverage)

Contact (#contact)

Hero Section
Headline: "Logistics that scales with your e-commerce"  

Subheadline: "Warehouse management, last-mile deliveries, and reverse logistics in the United States and Spain. Over 15 years helping fashion, electronics, and cosmetics brands grow without worrying about operations."  

Primary Call to Action (CTA): Button: "Request information" → Redirects/Links to Application Form Page.

Media Requirement: Copyright-free video background (Last-mile logistics focus). Must be highly performant, overlaid with a translucent dark backdrop to ensure high text contrast (WCAG AAA).

Services Section (Layout: 3 Columns)
Warehouse Management

Storage, picking, and packing

Real-time inventory tracking

Operational hubs: Los Angeles (US) & Zaragoza (ES)

Last-Mile Deliveries

Certified carrier network in US and Spain

Unified shipment tracking API/interface

Incident and returns management

Reverse Logistics

End-to-end returns management

Item inspection and reconditioning

Seamless integration with e-commerce platforms (Shopify, WooCommerce, etc.)

Coverage Section (Layout: 2 Columns)
United States:

Hub: Warehouse in Los Angeles

Scope: National coverage

Carriers: UPS, FedEx, DHL

Spain:

Hub: Warehouse in Zaragoza

Scope: Peninsular and Island coverage

Carriers: MRW, SEUR, DHL

Why TrackFlow (Layout: 4 Grid Cards / Key Benefits)
Binational Operation: The only operator with owned infrastructure in both the US and Spain.

Expert Workforce: +130 logistics professionals dedicated to operations.

Proprietary Tech: In-house technology providing full real-time inventory visibility.

E-commerce Specialization: Tailored workflows for fashion, electronics, and cosmetics.

Contact Section
Sales Email: comercial@trackflow.com

US Phone: +1 213 555 0147 (Los Angeles)

ES Phone: +34 976 123 456 (Zaragoza)

Footer
Copyright: © 2025 TrackFlow. All rights reserved.

Socials: LinkedIn ([https://linkedin.com/company/trackflow](https://linkedin.com/company/trackflow))

3.2 Structured Data (Schema.org)
Insert the following JSON-LD block into the <head> of the landing page:

{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "TrackFlow",
  "description": "Warehouse management and last-mile deliveries for e-commerce",
  "url": "https://trackflow.com",
  "foundingDate": "2009",
  "address": [
    {
      "@type": "PostalAddress",
      "addressCountry": "US",
      "addressLocality": "Los Angeles",
      "addressRegion": "California"
    },
    {
      "@type": "PostalAddress",
      "addressCountry": "ES",
      "addressLocality": "Zaragoza",
      "addressRegion": "Aragón"
    }
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-213-555-0147",
    "contactType": "sales",
    "availableLanguage": ["Spanish", "English"]
  },
  "sameAs": [
    "https://linkedin.com/company/trackflow"
  ],
  "areaServed": [
    {
      "@type": "Country",
      "name": "United States"
    },
    {
      "@type": "Country",
      "name": "Spain"
    }
  ]
}

4. Application / Sign-Up Form Specifications

4.1 Field Schema & Data Matrix
Field Name,HTML Tag / Type,Options / Constraints,Required
Company Name,"input[type=""text""]",Min. length: 2 chars,Yes
Contact Person,"input[type=""text""]",Min. 2 words (First + Last Name),Yes
Corporate Email,"input[type=""email""]",Standard regex RFC 5322,Yes
Phone,"input[type=""tel""]","Regex: ^\+\d{1,4}\s?\d+$ (e.g., +1 213 555 0147)",Yes
Company Website,"input[type=""url""]",Standard URL regex (http:// or https://),No
Operating Country,select,United States | Spain | Both | Other,Yes
Product Type,select,Fashion | Electronics | Cosmetics | Food | Other,Yes
Monthly Volume,select,0-100 | 101-500 | 501-2000 | 2000+ | Not sure,Yes
Services Interested,"input[type=""checkbox""]",Warehousing | Last mile | Reverse logistics (At least 1),Yes
Current 3PL,"input[type=""radio""]",Yes | No | Evaluating options,Yes
Comments / Needs,textarea,Max 500 characters (Dynamic counter required),No
Privacy Policy,"input[type=""checkbox""]",Must be checked,Yes

4.2 Form Validation Rules & Specific Errors

The frontend JavaScript script must capture the submit event, prevent default submission (e.preventDefault()), validate inputs, display inline context-aware error messages, and shift focus (autofocus) to the first invalid field.

Target Field,Condition to Trigger Error,Exact Error String Message
Company Name,< 2 characters,"""Company name must have at least 2 characters"""
Contact Person,< 2 words,"""Enter first and last name of contact"""
Email,Invalid syntax / No @ / No domain,"""Enter a valid corporate email (example: name@company.com)"""
Phone,Missing + or country prefix,"""Phone must include country code (example: +1 213 555 0147)"""
Website,Present BUT fails URL pattern,"""If you include website, it must be a valid URL"""
Country,Unselected (default option),"""Select main operating country"""
Product Type,Unselected (default option),"""Select the type of product you handle"""
Monthly Volume,Unselected (default option),"""Select estimated monthly volume"""
Services,0 checkboxes selected,"""Select at least one service of interest"""
Current 3PL,No radio option selected,"""Indicate if you currently work with another logistics provider"""
Comments,> 500 characters,"""Comments cannot exceed 500 characters (X remaining)"""
Privacy Policy,unchecked,"""You must accept the privacy policy to continue"""

4.3 Dynamic Logic & Conditional Warnings
B2C / Low-Volume Threshold Filter
Trigger Logic: IF Monthly Volume === "0-100" AND Product Type IS NOT EMPTY.

UI Behavior: Render an inline dynamic non-blocking warning notification panel below the dropdowns.

Exact Warning Text:

"For volumes under 100 monthly shipments, our services might not be the most efficient solution. Are you sure you want to continue?"

4.4 Success Submission Handling
Upon successful JS validation, clear or hide the form DOM and render the following structured success component:

### Success Feedback Component
**Title:** Thank you for your interest in TrackFlow!

**Body:**
We have received your request. Our commercial team will review your information and contact you within the next 24-48 hours to schedule a call and learn about your logistics needs in detail.

If you have any urgent inquiry, write to us directly at comercial@trackflow.com

5. UI/UX Design System & Layout Guidelines
5.1 Color Palette & Typography
Use Tailwind CSS default or customized utility classes mapping to these exact usage patterns:

Primary / Brand: Deep Logistics Navy (bg-slate-900 / text-slate-900) for headers, primary typography, and high-emphasis sections.

Accent / Action: High-Contrast Blue (bg-blue-600 hover: bg-blue-700 / text-blue-600) for CTAs, active form states, interactive focus rings, and secondary icons.

Secondary / Neutral: Crisp Cool Gray (bg-slate-50 / text-slate-600 / border-slate-200) for secondary card backgrounds, subtle borders, and readable body text.

Feedback States:

Success: Green (text-emerald-600 / bg-emerald-50 / border-emerald-300).

Error: Red (text-rose-600 / bg-rose-50 / border-rose-400).

Warning (Low Volume): Amber (text-amber-700 / bg-amber-50 / border-amber-300).

Typography Hierarchy:

Font Family: Modern sans-serif stack (font-sans, e.g., Inter, system-ui).

H1 Hero Title: Bold, 2.5rem - 4rem (text-4xl to text-6xl), tight leading (leading-tight).

H2 Section Headings: Semi-bold, 1.875rem - 2.25rem (text-3xl to text-4xl), centered or left-aligned depending on section structure.

Body Text: Regular, 1rem (text-base), optimized reading contrast against white/slate backgrounds.

5.2 Responsive Layout Breakpoints
Execute responsive layouts using standard Tailwind breakpoints (sm:, md:, lg:):

Mobile (< 640px):

Single-column flow (grid-cols-1).

Mobile drawer/hamburger menu for top navigation.

Form fields collapse into a single stacked column.

Tablet (640px - 1024px):

Services grid switches to 2 columns (md:grid-cols-2).

Form field inputs can pair into 2-column inline rows.

Desktop (> 1024px):

Services section expands to 3 columns (lg:grid-cols-3).

Coverage section displays side-by-side in 2 equal columns (lg:grid-cols-2).

Benefits grid expands to 4 columns (lg:grid-cols-4).

Fixed top navigation bar showing all links inline.

5.3 Interactive Micro-Interactions & Motion Rules
Buttons & Clickables: Include soft transitions (transition-all duration-200 ease-in-out), slight shadow elevations on hover (hover:shadow-lg), and active press states (active:scale-95).

Form Focus States: Every input tag MUST feature clear focus indicators (focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent) to meet accessible keyboard interaction criteria.

Dynamic Warning Panel: The B2C low-volume warning message (0-100 shipments/month) should appear smoothly using CSS opacity/height animations without causing abrupt layout shifts (CLS).

6. Quality Assurance & Pre-Deployment Checklist
Before deploying the project, double-check and verify that the implementation adheres strictly to the following criteria:

6.1 HTML Structure and Semantics
[ ] Uses appropriate semantic HTML5 tags (<header>, <nav>, <main>, <section>, <article>, <footer>) instead of generic <div> elements.

[ ] All <img> tags feature descriptive and context-aware alt attributes.

[ ] All form fields use explicit <label> tags correctly associated with input IDs using for="inputId".

[ ] Schema.org JSON-LD markup is present, syntax-valid, and properly placed inside the document <head>.

[ ] Document outline follows a logical hierarchy (<h1> down to <h3> sequentially).

6.2 Responsive Design and Tailwind Integration
[ ] The application is fully responsive and layout-tested on Mobile, Tablet, and Desktop screen widths.

[ ] Mobile-first design methodology is strictly applied (base styles target mobile, overridden via sm:, md:, lg:).

[ ] Includes a documented, functional CLI execution command compatible with GitHub Codespaces using npx (e.g., npx serve . or npx tailwindcss -i ...).

[ ] Strictly uses Tailwind CSS utility classes with zero unnecessary custom hand-written CSS.

[ ] The overall visual design appears cohesive, professional, and well-aligned with B2B e-commerce branding.

[ ] Audited performance achieves a minimum score of 80 (ideally 90+) on Google Lighthouse / PageSpeed Insights.

6.3 Accessibility (a11y)
[ ] All interactive components (buttons, links, form inputs) are fully operable via keyboard navigation (Tab / Enter / Space).

[ ] Native ARIA attributes (aria-invalid, aria-describedby, aria-live, role) are present where helpful to assist screen readers.

[ ] Color contrast ratios between text and background comply with WCAG AA standards.

[ ] Navigation components operate in a logical and predictable sequence.

[ ] Form dynamic error states are properly announced to assistive technologies via dynamic live regions (aria-live="polite").

6.4 Form Processing & Validation Engine
[ ] Native HTML input types (text, email, tel, url, checkbox, radio, select) are applied correctly per field schema.

[ ] Full JavaScript validation executes across all input fields before submission processing.

[ ] Field error messages are descriptive, helpful, and exact (no generic "invalid field" text).

[ ] Data validation strictly blocks native form submission whenever errors exist.

[ ] Clear visual feedback states are rendered for focus, error (red outline), and success (green outline) parameters.

[ ] A functional "Clear Form" / "Reset Form" button works correctly to clear state and error UI elements.

6.5 Context Adherence & Business Logic
[ ] The landing page directly reflects the company domain, logistics sector, and B2B positioning.

[ ] Copy highlights TrackFlow's experience (+15 years), operational capabilities, and competitive advantages.

[ ] Captured form input fields correspond exactly to the pre-defined specification schema.

[ ] Special domain logic (such as the B2C volume warning for 0-100 shipments/month) is correctly triggered.

[ ] Tone, messaging, and visual presentation remain uniform and professional across all pages.
# QRLink Pro — HTML/CSS/JS + Supabase + Vercel

Accounts, editable cards, short links (`/u/username`), scan analytics, QR studio (colors, PNG/SVG), themes, legal pages.

## Setup
1. Supabase: create a project, open SQL Editor, run all of `supabase/schema.sql`.
2. Paste the Project URL and anon/publishable key into `config.js` (never the service_role key).
3. Authentication > URL Configuration: set Site URL to your Vercel domain and add `https://YOUR-DOMAIN/**` and `http://localhost:*/**` to Redirect URLs.
4. Optional Google login: Authentication > Providers > Google.
5. Push to GitHub, import in Vercel (Framework: Other, no build command).

## Before public launch
Edit the contact lines in `legal.html` and have the texts reviewed.

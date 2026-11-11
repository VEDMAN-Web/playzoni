# Admin panel: owner setup

For Vedant. Do one part at a time. Each line is one step.
You only type names here, never secret values in chat. Secrets go only into Cloudflare.
If a step looks different on your screen, stop and ask the planner.

## Part 1. Database (D1)
1. Open dash.cloudflare.com and sign in.
2. In the left menu, click "Storage & databases", then "D1 SQL database".
3. Click "Create".
4. Name: `playzoni`. Location: leave it on automatic. Click "Create".
5. Open the new database and click the "Console" tab.
6. On GitHub, open the file `migrations/0001_init.sql` and copy all of it.
7. Paste it into the Console and click "Execute".
8. Copy the "Database ID" and send it to the planner. It is not a secret.

## Part 2. Picture storage (R2)
1. In the left menu, click "R2 object storage".
2. Click "Create bucket".
3. Name: `playzoni-uploads`. Click "Create bucket".
4. If Cloudflare asks for a card: R2 is free up to 10 GB. Add it only if you agree.

## Part 3. Connect the database and storage to the site
1. In the left menu, click "Workers & Pages", then the project `playzoni`.
2. Click "Settings", then "Bindings".
3. Click "Add", choose "D1 database".
4. Variable name: `DB`. Database: `playzoni`. Save.
5. Click "Add", choose "R2 bucket".
6. Variable name: `UPLOADS`. Bucket: `playzoni-uploads`. Save.
7. Do steps 3 to 6 for both "Production" and "Preview".

## Part 4. Sign-in with Google (Cloudflare Access)
1. In the left menu, click "Zero Trust".
2. If asked, pick a team name (for example `playzoni`) and the Free plan.
3. Go to "Settings", then "Authentication", then "Login methods".
4. Click "Add new" and choose "Google". Follow the steps on the screen (the planner can help).
5. Go to "Access", then "Applications", then "Add an application".
6. Choose "Self-hosted".
7. Application name: `Playzoni admin`.
8. Add the domain `playzoni.com` with path `admin`.
9. Add a second domain line: `playzoni.com` with path `api/admin`.
10. Next, add a policy named `Team`, action "Allow".
11. Under "Include", choose "Emails" and type each team email.
12. Save the application.
13. Open the application again. Copy the "Application Audience (AUD) Tag".
14. Note your team domain. It looks like `yourteam.cloudflareaccess.com`.

## Part 5. Settings in the site project
1. Go to "Workers & Pages", then `playzoni`, then "Settings", then "Variables and Secrets".
2. Add a text variable `ACCESS_TEAM_DOMAIN`: your team domain from Part 4.
3. Add a text variable `ACCESS_AUD`: the AUD tag from Part 4.
4. Add a text variable `ADMIN_OWNER_EMAILS`: your own Google email.
5. Never add `ENVIRONMENT` or `ADMIN_DEV_EMAIL` here. They are only for testing on a computer.
6. Do steps 2 to 4 for "Production" and "Preview".
7. Tell the planner. The planner turns on `PUBLIC_TRACKING_ENABLED` and `PUBLIC_ADMIN_CONFIG_ENABLED` when the time is right (question Q26).

## Part 6. GitHub App (text edits become saved changes)
1. On github.com, click your picture, then "Settings".
2. At the bottom, click "Developer settings", then "GitHub Apps", then "New GitHub App".
3. Name: `Playzoni Admin` (add a word if the name is taken).
4. Homepage URL: `https://playzoni.com`.
5. Under "Webhook", untick "Active".
6. Under "Repository permissions", set "Contents" to "Read and write". Leave everything else.
7. "Where can this GitHub App be installed?": "Only on this account". Click "Create GitHub App".
8. Copy the "App ID".
9. Scroll to "Private keys" and click "Generate a private key". A `.pem` file downloads.
10. Click "Install App" on the left. Choose `VEDMAN-Web`.
11. Choose "Only select repositories", pick `playzoni`, click "Install".
12. Look at the address bar. The number at the end is the "Installation ID". Copy it.
13. In Cloudflare (Part 5, step 1), add a text variable `GITHUB_APP_ID`: the App ID.
14. Add a text variable `GITHUB_APP_INSTALLATION_ID`: the Installation ID.
15. Add a variable `GITHUB_APP_PRIVATE_KEY` and choose type "Secret".
16. Open the `.pem` file with Notepad. Copy everything. Paste it as the value. Save.
17. Delete the `.pem` file from your Downloads folder. Never send it in chat.
18. In the admin, open "Categories". If changes are waiting, click "Commit them now".

## Part 7. Daily numbers (a small scheduled Worker)
1. Go to "Workers & Pages", click "Create", then "Create Worker".
2. Name: `playzoni-rollup`. Click "Deploy".
3. Click "Edit code". Delete all the code you see.
4. On GitHub, open `workers/rollup/worker.js`, copy all of it, paste it, click "Deploy".
5. Go to the Worker's "Settings", then "Bindings". Add "D1 database", name `DB`, database `playzoni`.
6. Go to "Settings", then "Triggers". Add a Cron Trigger `7 * * * *`.
7. Add a second Cron Trigger `20 0 * * *`.

## Part 8. Check it works
1. Open `playzoni.com/admin`.
2. Sign in with Google.
3. You see the Dashboard. Numbers say "No data" until visitors arrive. That is correct.

## Later (the planner guides you then)
1. Push alerts: `ONESIGNAL_APP_ID` (text) and `ONESIGNAL_REST_API_KEY` (secret), after task T9.9.
2. Ad earnings: the AdSense API key, after AdSense approves the site.

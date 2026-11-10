# Playzoni — how to start the build chat

Do these steps once. One step at a time.

**Step 1.** Make a new empty folder on your computer called `playzoni`.

**Step 2.** Put everything from this kit inside it (the `CLAUDE.md` file and the `docs` folder).

**Step 3.** Open Claude Code in that folder.

**Step 4.** Install the Karpathy skill. Type these two lines in Claude Code, one at a time:
```
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

**Step 5.** Install the SEO skills. Type these, one at a time:
```
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@AgriciDaniel-claude-seo
```
Then paste this as a normal message:
```
Install the Open SEO keyword-research skill for this project: npx skills add https://github.com/every-app/open-seo --skill keyword-research
```
(If you meant a different "Open SEO" package, install that one instead.)

**Step 6.** Install Graphify. Paste this as a normal message:
```
Install graphify for this project: pipx install graphifyy (or uv tool install graphifyy), then run graphify install. Tell me when it works.
```

**Step 7.** Close Claude Code and open it again in the same folder (so the new skills load).

**Step 8.** Switch the model. Type `/model` and pick **Haiku**. Set effort to **high**.

**Step 9.** Paste the start message below and send it.

---

## Start message (copy all of it)

```
You are the build agent for Playzoni (playzoni.com). The plan is final.

1. Read CLAUDE.md completely. Follow it exactly, every session.
2. Read docs/REVIEW.md, docs/STATUS.md, then docs/TASKS.md.
3. Start with T0.1 and work through the tasks in order. One task = plan in STATUS.md, build, verify, record, one commit pushed to the dev branch.
4. Never push to main.
5. Stop and tell me in plain, simple English (short, one step at a time) when:
   - you are blocked and wrote a question in docs/QUESTIONS.md,
   - the next task is marked model: sonnet,
   - a phase is finished.
When you stop, give me a 3-line summary: what is done, what is next, what you need from me.
```

---

## Every time you come back later
Open Claude Code in the `playzoni` folder and send:
```
Continue. Follow CLAUDE.md.
```

## When it says a task needs Sonnet
Type `/model`, pick **Sonnet**, send `continue`. After that task, switch back to **Haiku**.

## How the reviewer (planning chat) checks the work
The build chat pushes every task to GitHub (repo `VEDMAN-Web/playzoni`, branch `dev`). The planning chat reads the same repo, checks the work, and writes fixes into `docs/REVIEW.md`. The build chat fixes those first, every session. Nothing goes live until you merge `dev` into `main`.

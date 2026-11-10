# QA guide: testing a game for Playzoni

You play each game and write short notes. The notes are used to write the game page. Please write only what you saw.

## 1. Open the game

1. Ask the owner for the preview link.
2. Find the game page. The address ends in `/game/` and the game's name, for example `/game/bloxy-last-stand`.
3. Press **Play**. The game should start inside the grey box.

## 2. Play it for at least 3 minutes

Play on a **phone** and on a **computer**. On each one:

- Does the game start? Note how many seconds it took.
- Does it fill the screen in the right direction (landscape or portrait)?
- Do the controls work? Write them down in your own words.
- Does anything break, freeze or look wrong? Write it in "issues".

## 3. Fill the file

1. In the project folder, run `npm run qa:new -- <slug>`. This makes `data/qa/<slug>.json`.
2. Open that file. Replace every empty value. Keep the quote marks.
3. Run `npm run validate`. Fix any line it shows.

## 4. Choose a verdict

- **publish**: the game works on phone and computer, and it is fun to play for a few minutes.
- **reject**: it does not start, the controls do not work, it is broken, or it is not suitable (rude content, hidden ads, pop-ups over the game).
- **pending**: you are not sure yet. Ask the owner.

Only a game with "publish" can go live.

## Example (valid file)

```json
{
  "tester": "Sam",
  "date": "2026-11-12",
  "worksMobile": true,
  "worksDesktop": true,
  "orientation": "landscape",
  "loadSeconds": 4,
  "controlsDesktop": "Click and hold to aim, release to shoot.",
  "controlsMobile": "Touch and drag to aim, lift your finger to shoot.",
  "goal": "Stop the zombies from reaching your house. Each wave is harder than the last.",
  "threeFacts": [
    "You upgrade your gun between waves.",
    "Every wave has a boss at the end."
  ],
  "tips": [
    "Stand near the wall so you can see the zombies come.",
    "Spend coins on the gun first.",
    "Pause when a wave is nearly done."
  ],
  "issues": "",
  "verdict": "publish"
}
```

## Rules for the notes

- Use short, plain sentences. Write "you", not "the player".
- Do not copy the game's description from the website.
- Do not guess. If you did not see it, leave it out.
- Do not write ratings, numbers of players, or "most popular".
- Do not mention other websites.

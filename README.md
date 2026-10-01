# Landit click dummies

Three clickable designs of the new Landit (sign in, chat, benefits, community, settings), built on one shared layer so they show the same real schemes, the same matching and the same words. They are plain HTML files: nothing is sent anywhere.

## How to open

Double-click `index.html`. It opens a chooser in your browser with the three designs. For each one:

- **Open**: carries on from where you left it in this browser.
- **Start fresh**: clears what that design saved and opens Register (`index.html?reset=1`).
- **Try the demo account**: opens it as Amara, a student in England (`index.html?demo=1`).

Handy extras for any design: add `&lang=ar` (Arabic, right to left), `&theme=<id>`, or `&text=xlarge` to the address, for example `a-paper/index.html?demo=1&lang=ar#/benefits`.

## What is in this folder

| Folder or file | What it is |
|---|---|
| `index.html` | The chooser page. |
| `a-paper/` | Design A. Paper: warm and light, like Claude. |
| `b-dusk/` | Design B. Dusk: calm dark, like ChatGPT. |
| `c-clear/` | Design C. Big and clear: large text and big buttons, like Gemini. |
| `shared/` | What all three designs load: schemes, matching, questionnaire, words in six languages, sample community, the pretend chat. The API is in `shared/README.md`. |
| `shared/data.js` | **Generated.** Do not edit it. Change `tools/build-data.mjs` or `shared/source/` and rebuild. |
| `shared/source/` | Copies of the prototype's catalog, guides and safety directory, plus the catalog text they came from. Unchanged. |
| `tools/` | Scripts that build the data and check the designs. |
| `_review/` | Created by `tools/shoot.mjs`: screenshots and reports. Safe to delete. |

## Tools

Run from this folder. They need Node 18 or newer. `shoot.mjs` also needs Google Chrome and uses the Playwright copy inside the Landit repo on this Mac (the path is at the top of `tools/shoot.mjs`).

```sh
node tools/build-data.mjs              # rebuild shared/data.js (add --verbose to list every fix)
node tools/check-content.mjs a-paper   # words, dashes, disclaimer rules (also: shared, tools)
node tools/contrast.mjs a-paper        # colour contrast and calmness of a-paper/themes.js
node tools/shoot.mjs a-paper           # screenshots and page checks into _review/a-paper/
```

- **build-data.mjs** reads `shared/source/` and writes `shared/data.js`: the 182 schemes in a clean shape (short line, full description, category, nation, amount with its qualifier, guide, documents, effort estimate), icons, safety numbers per nation, and the fixed strings (disclaimer, "Free for first users", tagline). It refuses to write if any text breaks the content rules. Every correction it makes to the catalog is listed in a table at the top of the script and in `shared/README.md`.
- **check-content.mjs** fails on en or em dashes, banned words (list in `tools/content-rules.mjs`) and a typed-out disclaimer (designs must use `LANDIT.disclaimer`). It warns about pound amounts typed into a design and about words from the removed document-reading feature.
- **contrast.mjs** checks every theme in `<design>/themes.js` against WCAG contrast (text 4.5:1, accent, focus and category colours 3:1) and warns when backgrounds or the accent are too saturated, or text is too harsh (above 15:1). Our testers found the old app too saturated and too sharp.
- **shoot.mjs** opens every page of a design at phone (390 by 844) and desktop (1440 by 900) size, plus Arabic, every extra theme, extra large text and the phone sidebar. It saves screenshots and reports console errors, broken links, sideways scrolling, buttons with no name, images with no alt, a missing disclaimer and missing right to left. Exit code 1 means something needs fixing.

## Rules in one breath

Information, not advice. Say "you may be able to", never promise. Every amount comes from the data with its qualifier, and a total is always "Potential, if all approved". No dashes, no game language, no points or rating symbols. "Student visa", "Landit". The only thing Landit says about its own cost is "Free for first users".

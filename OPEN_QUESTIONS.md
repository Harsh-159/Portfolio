# Open questions

Facts and files the site needs from Harsh. Nothing here is on the site until it is answered.

## Blocking before this goes live

1. **New CV.** `public/cv.pdf` is still the old CV. It contains a phone number, "Currently finishing an MSc" and a right-to-work statement, all of which the spec bans (section 3.10). Replace it with the current CV, without a phone number, at the same path.
2. **New photo.** `public/harsh.webp` is the old photo. Replace it at the same path. Ratio 4:5 (it is shown 240 px wide on desktop).

## Items marked "(confirm)" in the spec

Each has a switch in `src/content/site.ts` (`confirmed`). Set it to `true` once confirmed.

3. `promptBreakdown`: "19 prompts exist in total: five for routing and extraction, and seven list-builder prompts each for add and for update. One request uses between 2 and 10 of them." (sections 3.3 and 9.4)
4. `builderExplanations`: the one-line explanation of each of the seven list builders (section 9.2).
5. `smallPromptsReason`: "Each prompt has one job, so each could be tested on its own with the prompt testing tool." (section 9.7)
6. `dataCheckNote`: the note that all 1,183 solar error flags fall between 02:00 and 04:00 UTC from April to September and are false alarms (section 13.8).
7. Medal wording in About. The site uses the spec's copy, "won medals in swimming and taekwondo", with no level. Confirm, or give the wording you want.

## Missing facts

8. **DeFi demo videos.** Section 7.5 asks for a "demo videos" link on the DeFi trading system. No URL was given, so only the repository is linked.
9. **Pipeline failure handling.** The failure-injection control in Figure 2 of `/lab/pipeline` is behind `showFailureInjection = false`. Say how the real pipeline handled a failed AI call before it is turned on.
10. **Dissertation trade-offs.** `/lab/dissertation` has no "Decisions and trade-offs" section until you give the reasons behind the design (section 14.7).
11. **Scenario test descriptions.** On `/lab/orchestrator`, each row of the scenario table expands to one sentence saying what the test checks. Only row 6 was given in the spec. The others were written from `backend/tests/test_live_scenarios.py` (`src/content/orchestrator.ts`). Check them.
12. **Spec sections 17 to 23.** The document refers to these sections (build set-up, data files, metadata, link check, open questions) but they were not in the copy I received. Where it was silent, I chose the simplest option. See DECISIONS.md.

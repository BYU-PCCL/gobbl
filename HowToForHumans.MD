# How to do stuff in this repo (for humans)

## How to create a module

You can create a module from a template or add some custom stuff:

### Creating a module from a template
Mostly all you need to add is data. src/lib/modules/registry.ts is where the module info is stored, add a ModuleConfig object matching the pattern of the other modules. Does not require any db migration.

1. Add the config in registry.ts following the pattern of the other ones
2. Build the steps - there are 5 kinds of steps:
- diagnostic (any multiple choice/survey questions) - store responses in stepResponses[step.id]
- content (heading and body cards) - informational
- practice (an AI chat) - can have an add-on next to the chat, see "Adding something next to the AI chat" below
- reflection (a text area)
- custom (your own React component - see "Adding a custom step" below)
You can put steps in any order but there can only be two practice steps and two reflection steps (pre and post for each)

3. Go to src/lib/modules/ai-config.ts to set up the prompt, model, etc for the AI conversation. follow the template in there. if you don't set this, it gets a "normal" partner
4. you can also add an *advanced* variant, which will be an option if they have already completed the module before

### Adding a custom step

If a module needs something the 4 normal kinds can't do (a slider, a drag-and-drop, a mini game...), write it as a React component and use a "custom" step. You only touch 2 files, and you don't need to change the server or the database.

1. Write your component in src/components/skills/ (for example IssueSlider.tsx). It gets 3 props:
- props - the extra settings you give it in registry.ts (empty object if you don't give any)
- value - whatever the component last saved (undefined at first)
- onChange(newValue) - call this to save the answer. it can be anything (a number, a string, an object...)
2. Add it to CUSTOM_STEPS in src/components/skills/custom-steps.tsx with a name:
```tsx
export const CUSTOM_STEPS: Record<string, CustomStepDef> = {
  "issue-slider": {
    Component: IssueSlider,
    isComplete: (value) => typeof value === "number", // when Continue turns on. leave it out to always allow Continue
  },
};
```
3. Use that name in a step in registry.ts:
```ts
{ id: "slider", kind: "custom", component: "issue-slider", props: { min: 0, max: 10 } }
```

When the user presses Continue, whatever you passed to onChange is saved in stepResponses[step.id] (or just `true` if you never called onChange). The server only checks that it's under 10,000 characters, so if the answer has to follow rules, check them in isComplete.

Good to know:
- registry.ts gets sent to the browser as JSON, so steps can only contain plain data. That's why the step uses the component's name ("issue-slider") and not the component itself, and why props can't have functions in them.
- if the name in registry.ts doesn't match anything in CUSTOM_STEPS, the step shows an "unknown component" message and Continue stays off.
- a custom step is its own screen. it can't show up next to the AI chat during a practice step (like a button you press while chatting) - for that, use a practice add-on (next section).

### Adding something next to the AI chat (practice add-ons)

An add-on is a React component that shows up in a bar above the chat during a practice step, for example the blue "I feel discomfort" button in the Cognitive Dissonance module. It works almost the same way as a custom step.

To use one that already exists, just add `addon` to a practice step in registry.ts:
```ts
{ id: "cd_practice", kind: "practice", topic: "...", difficulty: "Friendly Cluck", maxTurns: 8,
  addon: "discomfort-button", addonProps: { label: "That bothered me" } } // addonProps is optional
```

To make a new one:
1. Write your component in src/components/skills/ (DiscomfortButton.tsx is a good example to copy). It gets 4 props:
- props - the `addonProps` from registry.ts (empty object if you don't give any)
- messages - the chat so far (updates as new messages come in)
- value - whatever the component last saved
- onChange(newValue) - call this to save data. it can be anything
2. Add it to PRACTICE_ADDONS in src/components/skills/practice-addons.tsx with a name, and optionally an initialValue (what gets saved if the user never touches it - otherwise null):
```tsx
export const PRACTICE_ADDONS: Record<string, PracticeAddonDef> = {
  "my-addon": { Component: MyAddon, initialValue: 0 },
};
```
3. Use that name as `addon` on a practice step in registry.ts

The data is saved in stepResponses[step.id] (the practice step's id) when the conversation ends. Same 10,000 character limit as custom steps.

**Discomfort button data** looks like this - `count` is how many times they pushed it, and each press says when it happened and which chat message was on screen (its position in the conversation, starting at 0):
```json
{ "count": 2, "presses": [ { "at": "2026-10-02T18:04:11.000Z", "afterMessage": 1 },
                          { "at": "2026-10-02T18:05:30.000Z", "afterMessage": 3 } ] }
```

Good to know:
- the add-on's data is only kept in the browser until the conversation ends. if the user reloads the page in the middle of the chat, the chat comes back but the add-on starts over (e.g. earlier button presses are lost).
- if the `addon` name doesn't match anything in PRACTICE_ADDONS, the chat still works, just without the add-on.

### Creating a custom module

If a custom step isn't enough, you can add a whole new step kind. (This is how the "custom" kind above was built.)
- You will need to update types.ts to add a new kind
- you will need to update api/modules/[key]/advance/route.ts to store the answer
- you will need to add to skills/[key]/page.tsx - use StepView to render the new kind, use isStepComplete to decide when Continue is enabled, and answerPayload to decide what is sent to the server

New kinds don't need a Prisma migration because you can add to stepResponses[step.id] pretty much anything, keyed by step id
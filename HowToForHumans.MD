# How to do stuff in this repo (for humans)

## How to create a module

You can create a module from a template or add some custom stuff:

### Creating a module from a template
Mostly all you need to add is data. src/lib/modules/registry.ts is where the module info is stored, add a ModuleConfig object matching the pattern of the other modules. Does not require any db migration.

1. Add the config in registry.ts following the pattern of the other ones
2. Build the steps - there are 5 kinds of steps:
- diagnostic (any multiple choice/survey questions) - store responses in stepResponses[step.id]
- content (heading and body cards) - informational
- practice (an AI chat)
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
- a custom step is its own screen. it can't show up next to the AI chat during a practice step (like a button you press while chatting) - that would need a different setup.

### Creating a custom module

If a custom step isn't enough, you can add a whole new step kind. (This is how the "custom" kind above was built.)
- You will need to update types.ts to add a new kind
- you will need to update api/modules/[key]/advance/route.ts to store the answer
- you will need to add to skills/[key]/page.tsx - use StepView to render the new kind, use isStepComplete to decide when Continue is enabled, and answerPayload to decide what is sent to the server

New kinds don't need a Prisma migration because you can add to stepResponses[step.id] pretty much anything, keyed by step id
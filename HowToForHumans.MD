# How to do stuff in this repo (for humans)

## How to create a module

You can create a module from a template or add some custom stuff:

### Creating a module from a template
Mostly all you need to add is data. src/lib/modules/registry.ts is where the module info is stored, add a ModuleConfig object matching the pattern of the other modules. Does not require any db migration.

1. Add the config in registry.ts following the pattern of the other ones
2. Build the steps - there are 4 kinds of steps:
- diagnostic (any multiple choice/survey questions) - store responses in stepResponses[step.id]
- content (heading and body cards) - informational
- practice (an AI chat)
- reflection (a text area)
You can put steps in any order but there can only be two practice steps and two reflection steps (pre and post for each)

3. Go to src/lib/modules/ai-config.ts to set up the prompt, model, etc for the AI conversation. follow the template in there. if you don't set this, it gets a "normal" partner
4. you can also add an *advanced* variant, which will be an option if they have already completed the module before

### Creating a custom module

The easiest way is to keep the overall setup but add a new step kind.
- You will need to update types.ts to add a new kind
- you will need to update api/modules/[key]/advance/route.ts to store the answer
- you will need to add to skills/[key]/page.tsx - use StepView to render the new kind, use isStepComplete to decide when Continue is enabled, and answerPayload to decide what is sent to the server

New kinds don't need a Prisma migration because you can add to stepResponses[step.id] pretty much anything, keyed by step id
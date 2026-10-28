# How to do stuff in this repo (for humans)

## How to create a module

You can create a module from a template or add some custom stuff:

### Creating a module from a template
Mostly all you need to add is data. src/lib/modules/registry.ts is where the module info is stored, add a ModuleConfig object matching the pattern of the other modules. Does not require any db migration.

1. Add the config in registry.ts following the pattern of the other ones
2. Build the steps - there are 5 kinds of steps:
- diagnostic (any multiple choice/survey questions) - store responses in stepResponses[step.id]
- content (heading and body cards) - informational
- quiz (3 multiple-choice questions, see below)
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

## The quiz step

`kind: "quiz"` takes `questions` (from `QUIZZES[moduleKey]` in `src/lib/quizzes.ts`, 3 per module) and `passScore` (`QUIZ_PASS`, 2 of 3). Place it immediately before the practice step. The answer stored in `stepResponses[step.id]` is `answer: number[]` (the chosen option index per question).

- Passing (2 of 3) for the first time in a module hatches the user's egg and teaches the module's move from `src/lib/moves.ts`, and awards 60 XP.
- Finishing the step before the quiz awards 40 XP once per module.

## Practice steps: topic and stance

Practice steps now let the user pick a topic (the module's topic is preselected via `MODULE_TOPIC` in `src/lib/topics.ts`) and a stance (For or Against). Topic descriptions in `TOPICS` are therefore phrased as yes/no questions.

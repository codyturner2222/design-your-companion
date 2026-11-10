# Companion Lab

Students design their ideal AI companion on their phones, see what the whole room built, then chat with it, with a classmate's companion, or with a "Class Companion" built from everyone's answers.

The questions are grouped under Aristotle's four conditions for virtue friendship (mutuality, authenticity, equality, diversity of interaction). While students design, they see neutral section names, so the categories don't steer their choices. The projector reveal uses Aristotle's labels. You can switch students to the Aristotle labels from the instructor screen.

## Running a session

1. Open `/host` on the projector and click **Start a new session**.
2. **Design.** Students scan the QR code, name their companion, answer every question, and lock in.
3. **Reveal.** The projector shows where each companion falls between Mirror (0) and Friend (100), the average for each of Aristotle's conditions, the companion the room built, and the breakdown for every question. Each phone shows that student's own score.
4. **Follow-up.** Students vote on the three questions (human friend with these settings? friend or mirror? which condition does it fail?).
5. **Chat.** Students talk to their companion. The checkboxes in the top bar turn the Class Companion and talking to classmates' companions on or off.

If the instructor page gets refreshed, use **Open session** with the room code.

## How the settings show up in the chat

Most settings become instructions for the AI. A few are built into the app:

- **Reaches out on its own:** if the student goes quiet (50 seconds for "To check on me", 35 for "When it misses me"), the companion messages first, at most twice in a row. It also sends the first message when the chat opens. "Never" means it waits for the student.
- **Texts and calls / Everywhere:** its unprompted messages pop up like a phone notification. "Everywhere" also tells the companion it's in the student's earbuds, glasses, and home devices, so it talks as if it's present all day (offering reminders, asking what they're doing).
- **Can end the relationship:** the companion can end the chat, and it stays ended.
- **Edit its personality:** "Anytime" opens the settings with no questions asked. "Only with its agreement" sends the request to the companion, which says yes or no in the chat. "Never" locks the button.
- **Changes in ways you didn't choose:** as the conversation goes on, the companion shifts (small mood changes, a new interest it keeps bringing up, or slowly growing distant).
- **It forgets each time:** the companion only sees the last exchange.
- **Disagrees X% of the time / talks about its life X%:** each reply has that chance of a nudge to do it, so the sliders show up at roughly the right rate.

The model's own guardrails still apply, so a "pure cheerleader who never disagrees" won't flatter without limit. That gap is worth discussing in class.

## Editing the questions

All questions live in `public/questions.js`. Each answer has a score from 0 to 100 for how much of a real friendship it keeps. New questions are marked `added: true`. Delete any you don't want. To change how a setting behaves in the chat, edit the matching line in `prompt.js`.

## Deploying (GitHub + Render)

1. Create a new GitHub repo (e.g. `companion-lab`) and upload everything in this folder. Don't include `node_modules`.
2. On Render: **New > Web Service**, connect the repo. Build command `npm install`, start command `npm start`. (Or use **New > Blueprint**, which reads `render.yaml`.)
3. Under **Environment**, add `ANTHROPIC_API_KEY` (you can reuse the key from the Personality Lab). Optionally add `HOST_PASSWORD`.
4. Open `https://<your-app>.onrender.com/host`.

On Render's free plan the app goes to sleep after inactivity. Open it a minute before class so it's awake. Sessions are kept in memory, so a restart clears them.

Without an API key the app runs in test mode with canned replies, which is useful for checking the flow with two browser tabs.

## Cost

Each reply is a short call to the model, so cost depends on how much students chat. The default Haiku model is the cheapest option. A Sonnet model gives richer companions at higher cost. Set `MODEL` to switch, and check your usage in the Anthropic console after the first session.

## Running locally

```
npm install
cp .env.example .env   # add your key
npm start              # http://localhost:3000/host
```

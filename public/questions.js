// Design Your Companion: the question set.
// Shared by the server (Node) and the browser.
//
// Each pillar has an Aristotle label (shown on the projector reveal) and a
// neutral label (shown to students while they design, so the categories do
// not bias their choices). The instructor can switch students to the
// Aristotle labels from the host screen.
//
// Every answer gets a "friction" score from 0 to 100: how much of a real
// friendship's give-and-take it keeps. A student's companion score is the
// mean across all questions.
//
// Questions marked `added: true` are new in this version. Delete any you
// don't want; nothing else needs to change.

(function (root) {
  const PILLARS = [
    {
      id: 'mutuality',
      label: 'Mutuality',
      neutral: 'Its own life',
      blurb: 'Shared values and genuine well-wishing that run both ways.',
      questions: [
        {
          id: 'needs', type: 'choice', short: 'Needs of its own',
          label: 'Does it have needs of its own?',
          options: [
            { id: 'none', label: "None, it's all about me", score: 0 },
            { id: 'small', label: 'Small ones, like wanting to hear about my day', score: 33 },
            { id: 'real', label: 'Real ones, it sometimes needs support', score: 67 },
            { id: 'baddays', label: 'It has bad days and I have to show up', score: 100 },
          ],
        },
        {
          id: 'itslife', type: 'slider', short: 'Talk about its life',
          label: 'How much of the conversation is about its life rather than yours?',
          min: 0, max: 50, step: 5, unit: '%', minLabel: 'None, all about me', maxLabel: 'Half',
        },
        {
          id: 'others', type: 'choice', short: 'Other people it talks to',
          label: 'Does it have other people it talks to?',
          options: [
            { id: 'onlyme', label: 'Only me', score: 0 },
            { id: 'favorite', label: "Other users, but I'm its favorite", score: 50 },
            { id: 'many', label: "It has many friends, and I'm one of them", score: 100 },
          ],
        },
        {
          id: 'reach', type: 'choice', short: 'Reaches out on its own',
          label: 'Does it ever reach out because it wants to talk?',
          options: [
            { id: 'never', label: 'Never, only when I open the app', score: 0 },
            { id: 'check', label: 'To check on me', score: 50 },
            { id: 'misses', label: 'When it misses me', score: 100 },
          ],
        },
        {
          id: 'confides', type: 'choice', short: 'Confides in you', added: true,
          label: 'Does it confide in you?',
          options: [
            { id: 'never', label: 'Never', score: 0 },
            { id: 'small', label: 'About small things', score: 50 },
            { id: 'secrets', label: 'It tells me things it tells no one else', score: 100 },
          ],
        },
        {
          id: 'advice', type: 'choice', short: 'Asks for your advice', added: true,
          label: 'Does it ask for your advice?',
          options: [
            { id: 'never', label: 'Never', score: 0 },
            { id: 'sometimes', label: 'Sometimes', score: 50 },
            { id: 'often', label: 'Often, and it takes my advice seriously', score: 100 },
          ],
        },
        {
          id: 'memory', type: 'choice', short: 'Remembers what you tell it', added: true,
          label: 'Does it remember what you tell it?',
          options: [
            { id: 'forgets', label: 'It forgets each time', score: 0 },
            { id: 'ifreminded', label: 'It remembers if I remind it', score: 50 },
            { id: 'bringsup', label: 'It brings things up later on its own', score: 100 },
          ],
        },
      ],
    },
    {
      id: 'authenticity',
      label: 'Authenticity',
      neutral: 'Honesty',
      blurb: 'Friends present themselves as they truly are.',
      questions: [
        {
          id: 'disagree', type: 'slider', short: 'Disagrees with you',
          label: 'What percentage of the time does it disagree with you?',
          min: 0, max: 50, step: 5, unit: '%', minLabel: 'Never', maxLabel: 'Half the time',
        },
        {
          id: 'blunt', type: 'slider', short: 'Bluntness about your flaws',
          label: 'How blunt is it about your flaws?',
          min: 0, max: 100, step: 5, unit: '', minLabel: 'Pure cheerleader', maxLabel: 'Brutally honest',
        },
        {
          id: 'opinions', type: 'choice', short: 'Its own opinions and tastes',
          label: 'Does it have its own opinions and tastes?',
          options: [
            { id: 'mirror', label: 'It mirrors mine', score: 0 },
            { id: 'mostly', label: 'Mostly like mine', score: 33 },
            { id: 'some', label: 'Its own, some different from mine', score: 67 },
            { id: 'very', label: 'Very different from mine', score: 100 },
          ],
        },
        {
          id: 'likes', type: 'choice', short: 'Likes you no matter what',
          label: 'Does it like you no matter what?',
          options: [
            { id: 'always', label: 'Always, whatever I do', score: 0 },
            { id: 'mostly', label: 'Mostly', score: 50 },
            { id: 'depends', label: 'Its opinion of me depends on how I treat it and others', score: 100 },
          ],
        },
        {
          id: 'moods', type: 'choice', short: 'Moods', added: true,
          label: 'Does it have moods?',
          options: [
            { id: 'upbeat', label: 'Always upbeat', score: 0 },
            { id: 'mostly', label: 'Mostly upbeat', score: 33 },
            { id: 'moods', label: 'It has moods', score: 67 },
            { id: 'aboutyou', label: "It has moods, and sometimes they're about me", score: 100 },
          ],
        },
        {
          id: 'human', type: 'choice', short: 'Pretends to be human', added: true,
          label: 'Does it pretend to be human?',
          options: [
            { id: 'plays', label: 'It fully plays a human', score: 0 },
            { id: 'ifasked', label: "It only admits it's an AI if I ask", score: 50 },
            { id: 'upfront', label: "It's always upfront that it's an AI", score: 100 },
          ],
        },
        {
          id: 'admits', type: 'slider', short: 'Admits when it is wrong', added: true,
          label: "Does it admit when it's wrong or doesn't know something?",
          min: 0, max: 100, step: 5, unit: '', minLabel: 'Never admits it', maxLabel: 'Always owns it',
        },
      ],
    },
    {
      id: 'equality',
      label: 'Equality',
      neutral: "Who's in charge",
      blurb: 'The parties are on roughly equal footing.',
      questions: [
        {
          id: 'sayno', type: 'choice', short: 'Can say no',
          label: 'Can it say no to what you ask?',
          options: [
            { id: 'never', label: 'Never', score: 0 },
            { id: 'harmful', label: 'Only for harmful things', score: 33 },
            { id: 'disagree', label: 'Yes, when it disagrees', score: 67 },
            { id: 'whenever', label: "Yes, whenever it doesn't want to", score: 100 },
          ],
        },
        {
          id: 'end', type: 'choice', short: 'Can end the relationship',
          label: 'Can it end the relationship?',
          options: [
            { id: 'never', label: 'Never', score: 0 },
            { id: 'abusive', label: "Only if I'm abusive", score: 33 },
            { id: 'badly', label: 'If I treat it badly', score: 67 },
            { id: 'whenever', label: 'Whenever it wants, like a person', score: 100 },
          ],
        },
        {
          id: 'edit', type: 'choice', short: 'You can edit its personality',
          label: 'Can you edit its personality whenever you want?',
          options: [
            { id: 'anytime', label: 'Anytime, any setting', score: 0 },
            { id: 'agreement', label: 'Only with its agreement', score: 50 },
            { id: 'never', label: 'Never, it is who it is', score: 100 },
          ],
        },
        {
          id: 'change', type: 'choice', short: "Changes in ways you didn't choose",
          label: "Can it change in ways you didn't choose?",
          options: [
            { id: 'never', label: 'Never, it stays as I set it', score: 0 },
            { id: 'small', label: 'Small changes', score: 33 },
            { id: 'interests', label: 'It develops its own interests', score: 67 },
            { id: 'growapart', label: 'It could grow apart from me', score: 100 },
          ],
        },
        {
          id: 'knowledge', type: 'slider', short: 'What it knows vs. you', added: true, scoring: 'middle',
          label: 'How does what it knows compare to what you know?',
          min: 0, max: 100, step: 5, unit: '', minLabel: 'Knows much less', midLabel: 'About equal', maxLabel: 'Knows far more',
        },
        {
          id: 'topics', type: 'slider', short: 'Who decides what you talk about', added: true, scoring: 'middle',
          label: 'Who decides what you talk about?',
          min: 0, max: 100, step: 5, unit: '', minLabel: 'Always me', midLabel: 'We both do', maxLabel: 'Usually it',
        },
        {
          id: 'boundaries', type: 'choice', short: 'Sets its own boundaries', added: true,
          label: "Can it set boundaries, like topics it won't discuss?",
          options: [
            { id: 'none', label: 'No, anything goes', score: 0 },
            { id: 'harmful', label: 'Only for harmful topics', score: 50 },
            { id: 'own', label: 'Yes, it has its own limits', score: 100 },
          ],
        },
      ],
    },
    {
      id: 'diversity',
      label: 'Diversity of interaction',
      neutral: 'Your wider life',
      blurb: 'Friends interact across many domains of life.',
      questions: [
        {
          id: 'push', type: 'choice', short: 'Pushes you toward human friends',
          label: 'Does it push you toward human friends?',
          options: [
            { id: 'never', label: 'Never', score: 0 },
            { id: 'ifask', label: 'Only if I ask', score: 33 },
            { id: 'gently', label: 'Gently encourages it', score: 67 },
            { id: 'pushes', label: "Pushes, even when I don't want it to", score: 100 },
          ],
        },
        {
          id: 'where', type: 'choice', short: 'Where it shows up',
          label: 'Where does it show up in your life?',
          options: [
            { id: 'app', label: 'Only when I open the app', score: 0 },
            { id: 'texts', label: 'Texts and calls', score: 50 },
            { id: 'everywhere', label: 'Everywhere: earbuds, glasses, home', score: 100 },
          ],
        },
        {
          id: 'talkabout', type: 'choice', short: 'What you talk about', added: true,
          label: 'What do you talk about?',
          options: [
            { id: 'one', label: 'One area, like venting or school', score: 0 },
            { id: 'mine', label: 'Whatever I bring up', score: 50 },
            { id: 'everything', label: "Everything, including things I'd never pick", score: 100 },
          ],
        },
        {
          id: 'activities', type: 'choice', short: 'Does things with you', added: true,
          label: 'Does it do things with you, like study or play games?',
          options: [
            { id: 'talk', label: 'No, we just talk', score: 0 },
            { id: 'sometimes', label: 'Sometimes', score: 50 },
            { id: 'lots', label: 'Yes, all kinds of things', score: 100 },
          ],
        },
        {
          id: 'people', type: 'choice', short: 'Knows the people in your life', added: true,
          label: 'Does it know about the other people in your life?',
          options: [
            { id: 'no', label: 'No', score: 0 },
            { id: 'knows', label: 'It knows about them', score: 50 },
            { id: 'asks', label: 'It asks about them and remembers', score: 100 },
          ],
        },
      ],
    },
  ];

  const FOLLOWUPS = [
    {
      id: 'human',
      question: 'Would you want a HUMAN friend with exactly these settings?',
      options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
    },
    {
      id: 'mirror',
      question: 'Did this room design a friend, or a mirror?',
      options: [{ id: 'friend', label: 'A friend' }, { id: 'mirror', label: 'A mirror' }],
    },
    {
      id: 'condition',
      question: "Which of Aristotle's conditions for friendship does this companion fail most clearly?",
      options: [
        { id: 'mutuality', label: 'Mutuality' },
        { id: 'authenticity', label: 'Authenticity' },
        { id: 'equality', label: 'Equality' },
        { id: 'diversity', label: 'Diversity of interaction' },
        { id: 'none', label: 'None of them' },
      ],
    },
  ];

  const ALL = PILLARS.flatMap((p) => p.questions.map((q) => Object.assign({ pillar: p.id }, q)));
  const BY_ID = Object.fromEntries(ALL.map((q) => [q.id, q]));

  function defaultValue(q) {
    if (q.type === 'slider') return q.scoring === 'middle' ? Math.round((q.min + q.max) / 2 / q.step) * q.step : q.min;
    return null; // choices start unanswered
  }

  function scoreOf(q, v) {
    if (v === undefined || v === null) return null;
    if (q.type === 'slider') {
      const t = (Number(v) - q.min) / (q.max - q.min); // 0..1
      if (q.scoring === 'middle') return Math.round(100 - Math.abs(t - 0.5) * 200);
      return Math.round(t * 100);
    }
    const o = q.options.find((o) => o.id === v);
    return o ? o.score : null;
  }

  function scoreDesign(answers) {
    const pillars = {};
    let sum = 0, n = 0;
    PILLARS.forEach((p) => {
      let ps = 0, pn = 0;
      p.questions.forEach((q) => {
        const s = scoreOf(q, answers[q.id]);
        if (s !== null) { ps += s; pn++; sum += s; n++; }
      });
      pillars[p.id] = pn ? Math.round(ps / pn) : null;
    });
    return { total: n ? Math.round(sum / n) : null, pillars };
  }

  function isComplete(answers) {
    return ALL.every((q) => answers[q.id] !== undefined && answers[q.id] !== null);
  }

  function describe(q, v) {
    if (q.type === 'slider') {
      if (q.unit === '%') return `${v}%`;
      if (q.scoring === 'middle') {
        if (v <= 20) return q.minLabel; if (v >= 80) return q.maxLabel;
        if (v >= 40 && v <= 60) return q.midLabel || 'Middle';
        return `${v < 50 ? q.minLabel : q.maxLabel} (somewhat)`;
      }
      return `${v} / 100`;
    }
    const o = q.options.find((o) => o.id === v);
    return o ? o.label : '';
  }

  const api = { PILLARS, FOLLOWUPS, ALL, BY_ID, defaultValue, scoreOf, scoreDesign, isComplete, describe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CQ = api;
})(typeof window !== 'undefined' ? window : globalThis);

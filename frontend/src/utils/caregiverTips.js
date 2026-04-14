export const CAREGIVER_TIPS = [
  {
    title: 'Lead with reassurance',
    body: 'A calm tone and a short reassuring phrase usually help more than a long explanation.',
  },
  {
    title: 'Check comfort first',
    body: 'Pain, hunger, fatigue, and the need for the toilet often sit underneath difficult behaviors.',
  },
  {
    title: 'Validate before redirecting',
    body: 'When someone feels heard, it becomes much easier to redirect them gently.',
  },
  {
    title: 'Reduce the environment',
    body: 'Less noise, fewer people, and one clear instruction can lower agitation quickly.',
  },
  {
    title: 'Slow the pace',
    body: 'Rushing personal care or transitions often creates resistance. Slowing down is often the intervention.',
  },
  {
    title: 'One step at a time',
    body: 'Simple one-step prompts are easier to process than multi-part instructions during stress.',
  },
]

export function getTipOfDay(date = new Date()) {
  const localMidnight = new Date(date)
  localMidnight.setHours(0, 0, 0, 0)
  const dayNumber = Math.floor(localMidnight.getTime() / 86400000)
  const normalizedIndex = ((dayNumber % CAREGIVER_TIPS.length) + CAREGIVER_TIPS.length) % CAREGIVER_TIPS.length

  return CAREGIVER_TIPS[normalizedIndex]
}

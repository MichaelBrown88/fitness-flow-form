export const formatGoal = (goal: string) => {
  const map: Record<string, string> = {
    'build-muscle': 'Build Muscle',
    'weight-loss': 'Weight Loss',
    'build-strength': 'Build Strength',
    'improve-fitness': 'Improve Fitness',
    'general-health': 'General Health',
  };
  return map[goal] || goal.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

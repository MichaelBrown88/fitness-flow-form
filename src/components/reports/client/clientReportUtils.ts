// Helper function to truncate insights to consistent length
export const truncateInsight = (insight: string, maxLength: number = 120): string => {
  if (!insight || insight.length <= maxLength) return insight;
  // Truncate at the last complete sentence before maxLength
  const truncated = insight.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  // Prefer ending at a sentence, otherwise at a word
  if (lastPeriod > maxLength * 0.7) {
    return truncated.substring(0, lastPeriod + 1);
  } else if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
};

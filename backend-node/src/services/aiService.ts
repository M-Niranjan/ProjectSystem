export class AIService {
  public static predictPriority(title?: string, description?: string, _historicalContext?: any): string {
    const combined = `${title || ''} ${description || ''}`.toLowerCase();
    if (combined.includes('urgent') || combined.includes('critical') || combined.includes('bug') || combined.includes('hospital')) {
      return 'CRITICAL';
    }
    if (combined.includes('feature') || combined.includes('design') || combined.includes('ui')) {
      return 'HIGH';
    }
    if (combined.includes('document') || combined.includes('minor') || combined.includes('test')) {
      return 'LOW';
    }
    return 'MEDIUM';
  }

  public static estimateDuration(title?: string, _description?: string, experience: number = 2, _teamVelocity: number = 0): number {
    let base = 8.0;
    if (title) {
      const wordCount = title.split(/\s+/).length;
      base = Math.max(4.0, Math.min(24.0, wordCount * 2.5));
    }
    const factor = experience > 5 ? 0.75 : experience < 2 ? 1.3 : 1.0;
    return parseFloat((base * factor).toFixed(1));
  }

  public static suggestSubtasks(title?: string, description?: string): string[] {
    const combined = `${title || ''} ${description || ''}`.toLowerCase();
    if (combined.includes('dashboard') || combined.includes('ui')) {
      return [
        'Draft UI wireframes & layout specs',
        'Build responsive React components',
        'Integrate REST API data sources',
        'Perform cross-browser QA testing',
      ];
    }
    if (combined.includes('auth') || combined.includes('security')) {
      return [
        'Configure JWT filter middleware',
        'Implement password hash with bcrypt',
        'Verify role authorization guards',
        'Write integration unit tests',
      ];
    }
    return [
      'Analyze task specifications & requirements',
      'Set up database schema & data access layer',
      'Implement core business controller logic',
      'Conduct peer code review and testing',
    ];
  }
}

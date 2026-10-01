import { describe, it, expect } from 'vitest';
import { matchLunaFaq, LUNA_SUGGESTED_QUESTIONS } from '@/lib/luna';

describe('matchLunaFaq', () => {
  it('answers every one of Luna’s own suggested questions without the Claude API', () => {
    for (const question of LUNA_SUGGESTED_QUESTIONS) {
      expect(matchLunaFaq(question)).not.toBeNull();
    }
  });

  it('is case-insensitive', () => {
    expect(matchLunaFaq('WHO IS SHAHID?')).toEqual(matchLunaFaq('who is shahid?'));
  });

  it('returns null for a question with no local match, so the caller falls back to the API', () => {
    expect(matchLunaFaq('What is the airspeed velocity of an unladen swallow?')).toBeNull();
  });

  it('never invents a price in the pricing answer', () => {
    const answer = matchLunaFaq('How much does it cost?');
    expect(answer).not.toBeNull();
    expect(answer).not.toMatch(/\$\d|USD|PKR|\d+\s*(dollars|rupees)/i);
  });
});

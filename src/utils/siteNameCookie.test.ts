import { describe, expect, it } from 'vitest';
import {
  SITE_NAME_COOKIE,
  clearSiteNameCookie,
  siteDisplayName,
  syncSiteNameCookie,
  writeSiteNameCookie,
} from './siteNameCookie';

function fakeDoc() {
  const writes: string[] = [];
  return {
    writes,
    get cookie() {
      return '';
    },
    set cookie(value: string) {
      writes.push(value);
    },
  };
}

describe('siteDisplayName', () => {
  it('prefers first name, falls back to username, never email', () => {
    expect(siteDisplayName({ first_name: ' Ольга ', username: 'olga' })).toBe('Ольга');
    expect(siteDisplayName({ first_name: null, username: 'olga' })).toBe('olga');
    expect(siteDisplayName({ first_name: '', username: null })).toBe('');
    expect(siteDisplayName(null)).toBe('');
  });

  it('strips control characters and caps length', () => {
    expect(siteDisplayName({ first_name: 'A\nB' })).toBe('AB');
    expect(Array.from(siteDisplayName({ first_name: '😀'.repeat(50) }))).toHaveLength(32);
  });
});

describe('site name cookie', () => {
  it('is written on the parent domain with an encoded name only', () => {
    const doc = fakeDoc();
    writeSiteNameCookie({ first_name: 'Иван; x=1' }, doc, 'id.ponteto.com');
    expect(doc.writes).toHaveLength(1);
    expect(doc.writes[0]).toMatch(new RegExp(`^${SITE_NAME_COOKIE}=`));
    expect(doc.writes[0]).toContain(encodeURIComponent('Иван; x=1'));
    expect(doc.writes[0]).toContain('Domain=.ponteto.com');
    expect(doc.writes[0]).toContain('Secure');
  });

  it('is cleared with Max-Age=0', () => {
    const doc = fakeDoc();
    clearSiteNameCookie(doc, 'id.ponteto.com');
    expect(doc.writes[0]).toContain('Max-Age=0');
  });

  it('does nothing outside ponteto.com', () => {
    const doc = fakeDoc();
    writeSiteNameCookie({ first_name: 'X' }, doc, 'localhost');
    clearSiteNameCookie(doc, 'evilponteto.com');
    expect(doc.writes).toEqual([]);
  });

  it('sync waits for session restore, then writes or clears', () => {
    const doc = fakeDoc();
    syncSiteNameCookie(
      { isLoading: true, isAuthenticated: false, user: null },
      doc,
      'id.ponteto.com',
    );
    expect(doc.writes).toEqual([]);
    syncSiteNameCookie(
      { isLoading: false, isAuthenticated: true, user: { first_name: 'Аня' } },
      doc,
      'id.ponteto.com',
    );
    expect(doc.writes[0]).toContain(encodeURIComponent('Аня'));
    syncSiteNameCookie(
      { isLoading: false, isAuthenticated: false, user: null },
      doc,
      'id.ponteto.com',
    );
    expect(doc.writes[1]).toContain('Max-Age=0');
  });
});

import { configureLocalization, str } from '@lit/localize';

/**
 * A test locale, `de`, for the components' own tests. Lit Localize is configured once per page, so
 * every test file shares this one.
 */
const german = {
  templates: {
    loading: 'Laden',
    statNoValue: 'kein Wert',
    connectionTo: 'nach',
    connectionFrom: 'von',
    connectionBoth: 'hin und zurück',
    removeConnection: str`Verbindung entfernen: ${0}, ${1}`,
    invalid: 'ungültig',
    close: 'Schließen',
    increase: 'Erhöhen',
    decrease: 'Verringern',
    stackCapacity: str`${1} max, ${0} da`,
    quality: str`Güte ${0}`,
    meterWarning: 'Warnung',
    meterCritical: 'kritisch',
    unavailable: 'nicht verfügbar',
    craftable: str`${0}× herstellbar`,
    notifications: 'Benachrichtigungen',
    dismiss: 'Schließen',
    breadcrumb: 'Navigationspfad',
    showPath: 'Vollständigen Pfad anzeigen',
    pagination: 'Seitennavigation',
    previousPage: 'Vorherige Seite',
    nextPage: 'Nächste Seite',
    pageNumber: str`Seite ${0}`,
    removeTag: str`${0} entfernen`,
  },
};

export const { setLocale, getLocale } = configureLocalization({
  sourceLocale: 'en',
  targetLocales: ['de'],
  loadLocale: async () => german,
});

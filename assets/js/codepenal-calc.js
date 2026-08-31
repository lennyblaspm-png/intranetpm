/**
 * Calculateur amendes / points pour Infraction.php et Delit.php (cases à cocher sur les lignes).
 */
(function () {
    'use strict';

    function parseEuroContribution(s) {
        if (!s || s === '—') {
            return { value: null, note: '' };
        }
        const str = String(s).trim();
        const forf = str.match(/Forfaitaire\s+([\d\s\u00A0]+)\s*EUR/i);
        if (forf) {
            const n = parseInt(forf[1].replace(/[\s\u00A0]/g, ''), 10);
            return { value: Number.isNaN(n) ? null : n, note: 'forfait' };
        }
        const noParen = str.replace(/\([^)]*\)/g, ' ');
        const parts = [...noParen.matchAll(/\b([\d\s\u00A0]+)\s*EUR\b/gi)];
        if (parts.length === 0) {
            return { value: null, note: 'non chiffré' };
        }
        if (str.includes('+') && parts.length > 1) {
            const sum = parts.reduce((acc, m) => {
                const n = parseInt(m[1].replace(/[\s\u00A0]/g, ''), 10);
                return acc + (Number.isNaN(n) ? 0 : n);
            }, 0);
            return { value: sum, note: parts.length > 1 ? 'somme des montants EUR du libellé' : '' };
        }
        if (/\d[\d\s]*\s*\/\s*\d/.test(str) && !/Forfaitaire/i.test(str)) {
            const segs = str.split('/').map((x) => {
                let mm = x.match(/([\d\s\u00A0]+)\s*EUR/i);
                if (!mm) mm = x.match(/\b([\d\s\u00A0]{1,14})\b/);
                return mm ? parseInt(mm[1].replace(/[\s\u00A0]/g, ''), 10) : NaN;
            }).filter((n) => !Number.isNaN(n));
            if (segs.length === 3) {
                return { value: segs[1], note: 'forfaitaire (échelle minoré / forf. / majoré)' };
            }
            if (segs.length === 2) {
                return { value: segs[1], note: '' };
            }
            if (segs.length > 0) {
                return { value: segs[0], note: '' };
            }
        }
        const n = parseInt(parts[0][1].replace(/[\s\u00A0]/g, ''), 10);
        return { value: Number.isNaN(n) ? null : n, note: '' };
    }

    function parsePoints(s) {
        if (!s) return null;
        const t = String(s).trim();
        if (t === '—' || t === 'N/A' || t.toUpperCase() === 'N/A') return null;
        const m = t.match(/^(\d+)/);
        if (!m) return null;
        const n = parseInt(m[1], 10);
        return Number.isNaN(n) ? null : n;
    }

    function fmtEUR(n) {
        if (n === null || Number.isNaN(n)) return '—';
        return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' EUR';
    }

    const POCHON_EUR_RATE = 300;

    /**
     * @param {{ table: string, mode: 'infraction' | 'delit' }} opts
     */
    function initCodePenalCalculator(opts) {
        const table = document.querySelector(opts.table);
        if (!table) return;

        const mode = opts.mode || 'infraction';
        const outAmende = document.getElementById('cp-total-amende');
        const outPoints = document.getElementById('cp-total-points');
        const outDet = document.getElementById('cp-total-detention');
        const outCount = document.getElementById('cp-calc-count');
        const outNotes = document.getElementById('cp-calc-notes');
        const outAmendeDetail = document.getElementById('cp-amende-detail');
        const inPochons = document.getElementById('cp-pochons');
        const inSupplement = document.getElementById('cp-supplement');
        const btnVisible = document.getElementById('cp-calc-select-visible');
        const btnClear = document.getElementById('cp-calc-clear');
        const master = document.getElementById('cp-master');

        const rows = () => Array.from(table.querySelectorAll('tbody tr'));

        function recalc() {
            let sumE = 0;
            let hasE = false;
            let ambE = false;
            let sumP = 0;
            let hasP = false;
            let detOui = 0;
            let detPoss = 0;
            let detAutre = 0;
            let nSel = 0;
            const notes = [];

            rows().forEach((row) => {
                const cb = row.querySelector('.cp-row-sel');
                if (!cb || !cb.checked) return;
                if (row.style.display === 'none') return;
                nSel += 1;
                const am = row.getAttribute('data-cp-amende') || '';
                const pr = row.getAttribute('data-cp-points') || '';
                const { value: ev, note: en } = parseEuroContribution(am);
                if (ev !== null) {
                    sumE += ev;
                    hasE = true;
                } else {
                    ambE = true;
                }
                if (en) notes.push(en);
                const pv = parsePoints(pr);
                if (pv !== null) {
                    sumP += pv;
                    hasP = true;
                }
                if (mode === 'delit') {
                    const d = (row.getAttribute('data-cp-detention') || '').trim();
                    if (d === 'Oui') detOui += 1;
                    else if (d === 'Possible') detPoss += 1;
                    else if (d) detAutre += 1;
                }
            });

            let pochonsN = parseInt(inPochons?.value ?? '0', 10);
            if (Number.isNaN(pochonsN) || pochonsN < 0) pochonsN = 0;
            const eurosPochons = pochonsN * POCHON_EUR_RATE;
            let manualExtra = parseInt(inSupplement?.value ?? '0', 10);
            if (Number.isNaN(manualExtra) || manualExtra < 0) manualExtra = 0;
            const extrasSum = eurosPochons + manualExtra;

            if (outCount) outCount.textContent = String(nSel);
            const baseNum = hasE ? sumE : null;
            /** @type {number|null} */
            let grand = null;
            if (hasE) grand = sumE + extrasSum;
            else if (extrasSum > 0) grand = extrasSum;

            if (outAmende) {
                if (grand !== null) outAmende.textContent = fmtEUR(grand);
                else if (nSel === 0 && extrasSum === 0) outAmende.textContent = '—';
                else outAmende.textContent = '— (libellé non additionnable)';
            }
            if (outAmendeDetail) {
                const parts = [];
                if (baseNum !== null) parts.push('Base tableau : ' + fmtEUR(baseNum));
                else if (nSel > 0) parts.push('Base tableau : non chiffrée automatiquement sur au moins une ligne');
                if (eurosPochons > 0) parts.push('Pochons (' + pochonsN + ' × ' + POCHON_EUR_RATE + ' EUR) : ' + fmtEUR(eurosPochons));
                if (manualExtra > 0) parts.push('Manuel : ' + fmtEUR(manualExtra));
                if (grand !== null && (parts.length > 0 || extrasSum > 0)) {
                    parts.push('<strong>Total amendes : ' + fmtEUR(grand) + '</strong>');
                    outAmendeDetail.innerHTML = parts.join(' · ');
                } else outAmendeDetail.textContent = '';
            }
            if (outPoints) outPoints.textContent = hasP ? String(sumP) : nSel > 0 ? '0 ou N/A' : '—';
            if (outDet && mode === 'delit') {
                outDet.textContent =
                    nSel === 0
                        ? '—'
                        : `Oui : ${detOui} · Possible : ${detPoss}` + (detAutre ? ` · Autre : ${detAutre}` : '');
            }
            if (outNotes) {
                const uniq = [...new Set(notes)].filter(Boolean);
                outNotes.textContent =
                    uniq.length && nSel > 0
                        ? 'Astuce : ' + uniq.slice(0, 3).join(' · ') + (uniq.length > 3 ? '…' : '')
                        : '';
            }

            rows().forEach((row) => {
                const cb = row.querySelector('.cp-row-sel');
                if (cb) row.classList.toggle('cp-row-selected', cb.checked);
            });
        }

        rows().forEach((row) => {
            const cb = row.querySelector('.cp-row-sel');
            cb?.addEventListener('change', recalc);
        });

        master?.addEventListener('change', () => {
            const on = master.checked;
            rows().forEach((row) => {
                const cb = row.querySelector('.cp-row-sel');
                if (cb && row.style.display !== 'none') cb.checked = on;
            });
            recalc();
        });

        btnVisible?.addEventListener('click', () => {
            rows().forEach((row) => {
                const cb = row.querySelector('.cp-row-sel');
                if (cb && row.style.display !== 'none') cb.checked = true;
            });
            if (master) master.checked = rows().some((r) => r.style.display !== 'none');
            recalc();
        });

        btnClear?.addEventListener('click', () => {
            rows().forEach((row) => {
                const cb = row.querySelector('.cp-row-sel');
                if (cb) cb.checked = false;
            });
            if (master) master.checked = false;
            recalc();
        });

        const searchInput = document.getElementById('search');
        const origHandler = searchInput
            ? function () {
                  const q = searchInput.value.trim().toLowerCase();
                  rows().forEach((row) => {
                      row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
                  });
                  if (master) master.checked = false;
                  recalc();
              }
            : null;
        if (searchInput && origHandler) {
            searchInput.addEventListener('input', origHandler);
        }

        inPochons?.addEventListener('input', recalc);
        inSupplement?.addEventListener('input', recalc);

        recalc();
    }

    window.initCodePenalCalculator = initCodePenalCalculator;
    window.cpParseEuro = parseEuroContribution;
    window.cpParsePoints = parsePoints;
})();

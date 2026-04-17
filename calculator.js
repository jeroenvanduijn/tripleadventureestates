/* ============================================
   Triple Adventure Estates — Beslis Calculator
   Oordeelt op basis van DSCR / ICR / BAR / NAR /
   ROI / ROI Totaal / Kapitalisatiefactor.
   ============================================ */

(function () {
    'use strict';

    const fmtEUR0 = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    });
    const fmtEUR2 = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const fmtPct1 = new Intl.NumberFormat('nl-NL', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
    const fmtNum1 = new Intl.NumberFormat('nl-NL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    function euro(n, decimals = 0) {
        if (!isFinite(n)) return '—';
        return (decimals === 2 ? fmtEUR2 : fmtEUR0).format(n);
    }
    function pct(n) {
        if (!isFinite(n)) return '—';
        return fmtPct1.format(n);
    }
    function num(n) {
        if (!isFinite(n)) return '—';
        return fmtNum1.format(n);
    }

    /* Excel-compatible yearly PMT */
    function PMT(rate, nper, pv) {
        if (rate === 0) return -pv / nper;
        return -(rate * pv) / (1 - Math.pow(1 + rate, -nper));
    }

    /* ------------------------------------------
       Benchmark definities
       ------------------------------------------ */
    // Voor "hoger is beter" (higherIsBetter=true): thresholds = [slecht-max, matig-max, goed-max]
    // Oordeel: <t0 slecht, <t1 matig, <t2 goed, >=t2 zeer goed
    // Voor "lager is beter": omgekeerd
    const BENCH = {
        dscr: {
            higherIsBetter: true,
            t: [1.0, 1.2, 1.3],
            labels: ['< 1,00', '1,00–1,20', '1,20–1,30', '> 1,30'],
            fmt: num,
        },
        icr: {
            higherIsBetter: true,
            t: [1.25, 1.5, 2.0],
            labels: ['< 1,25', '1,25–1,50', '1,50–2,00', '> 2,00'],
            fmt: num,
        },
        bar: {
            higherIsBetter: true,
            t: [0.05, 0.06, 0.08],
            labels: ['< 5%', '5–6%', '6–8%', '> 8%'],
            fmt: pct,
        },
        nar: {
            higherIsBetter: true,
            t: [0.03, 0.04, 0.06],
            labels: ['< 3%', '3–4%', '4–6%', '> 6%'],
            fmt: pct,
        },
        roi: {
            higherIsBetter: true,
            t: [0, 0.03, 0.05],
            labels: ['< 0%', '0–3%', '3–5%', '> 5%'],
            fmt: pct,
        },
        roiTot: {
            higherIsBetter: true,
            t: [0.05, 0.08, 0.12],
            labels: ['< 5%', '5–8%', '8–12%', '> 12%'],
            fmt: pct,
        },
        kap: {
            higherIsBetter: false,
            t: [20, 15, 12],
            labels: ['> 20', '15–20', '12–15', '< 12'],
            fmt: num,
        },
    };

    function verdict(key, value) {
        const b = BENCH[key];
        if (!isFinite(value)) return { tier: null, label: '—' };
        const tiers = ['slecht', 'matig', 'goed', 'zeergoed'];
        const labels = ['Slecht', 'Matig', 'Goed', 'Zeer goed'];
        let idx;
        if (b.higherIsBetter) {
            if (value < b.t[0]) idx = 0;
            else if (value < b.t[1]) idx = 1;
            else if (value < b.t[2]) idx = 2;
            else idx = 3;
        } else {
            if (value > b.t[0]) idx = 0;
            else if (value > b.t[1]) idx = 1;
            else if (value > b.t[2]) idx = 2;
            else idx = 3;
        }
        return { tier: tiers[idx], label: labels[idx] };
    }

    /* ------------------------------------------
       Invoer uitlezen
       ------------------------------------------ */
    function readNumber(id) {
        const el = document.getElementById(id);
        const v = parseFloat(String(el.value).replace(',', '.'));
        return isFinite(v) ? v : 0;
    }

    function readInputs() {
        return {
            // Aankoop
            bod: readNumber('in-bod'),
            taxatie: readNumber('in-taxatie'),
            notaris: readNumber('in-notaris'),
            overdrachtPct: readNumber('in-overdracht') / 100,
            // Eenmalige overige kosten
            notarisHyp: readNumber('in-notaris-hyp'),
            bemiddeling: readNumber('in-bemiddeling'),
            oprichtingBv: readNumber('in-oprichting'),
            hypKosten: readNumber('in-hyp-kosten'),
            accountant: readNumber('in-accountant'),
            // Verbouwing
            verbouwing: readNumber('in-verbouwing'),
            nieuweHuurMaand: readNumber('in-nieuwe-huur'),
            // Hypotheek
            aflVrijPct: readNumber('in-aflvrij') / 100,
            annuitPct: readNumber('in-annuit') / 100,
            rente: readNumber('in-rente') / 100,
            looptijd: readNumber('in-looptijd'),
            aflVrijVanaf: readNumber('in-aflvrij-vanaf'),
            // Huur & kosten
            huurMaand: readNumber('in-huur'),
            ozbMaand: readNumber('in-ozb'),
            verzMaand: readNumber('in-verzekering'),
            onderhoudPct: readNumber('in-onderhoud') / 100,
            beheerPct: readNumber('in-beheer') / 100,
            // Aannames
            waardeStijging: readNumber('in-waardestijging') / 100,
            huurIndex: readNumber('in-huurindex') / 100,
            doelBar: readNumber('in-doel-bar') / 100,
        };
    }

    /* ------------------------------------------
       Kernberekening
       ------------------------------------------ */
    function compute(i) {
        // Aankoop
        const overdracht = i.bod * i.overdrachtPct;
        const totaalAankoop = i.bod + i.notaris + overdracht;
        const eenmaligeOverige =
            i.notarisHyp + i.bemiddeling + i.oprichtingBv + i.hypKosten + i.accountant;
        const totaalInvestering = totaalAankoop + eenmaligeOverige + i.verbouwing;

        // Korting vs taxatie
        const korting = i.taxatie > 0 ? (i.taxatie - i.bod) / i.taxatie : 0;

        // Hypotheek
        const aflVrij = i.taxatie * i.aflVrijPct;
        const annuit = i.taxatie * i.annuitPct;
        const totaalHyp = aflVrij + annuit;
        const ltv = i.taxatie > 0 ? totaalHyp / i.taxatie : 0;
        const eigenInleg = totaalInvestering - totaalHyp;
        const eigenInlegPersoon = eigenInleg / 3;

        // Maandelijkse lasten (jaar 1)
        const renteMaand = (totaalHyp * i.rente) / 12;
        // Aflossing (annuïteit): maandelijkse PMT, consistent met Excel
        const y1IsAflVrij = i.aflVrijVanaf > 0 && 1 >= i.aflVrijVanaf;
        let aflossingMaand = 0;
        if (!y1IsAflVrij && annuit > 0 && i.looptijd > 0) {
            const pmtMaand = PMT(i.rente / 12, i.looptijd * 12, -annuit);
            aflossingMaand = pmtMaand - (annuit * i.rente) / 12;
        }

        // Scenario bouwer
        function scenario(huurMaand, investeringBasis) {
            const bruto = huurMaand * 12;
            const beheer = huurMaand * i.beheerPct;
            const onderhoud = (i.bod * i.onderhoudPct) / 12;
            const netto = huurMaand - i.ozbMaand - beheer - i.verzMaand - onderhoud;
            const cashflow = netto - renteMaand - aflossingMaand;
            return {
                huur: { m: huurMaand, j: huurMaand * 12 },
                ozb: { m: i.ozbMaand, j: i.ozbMaand * 12 },
                beheer: { m: beheer, j: beheer * 12 },
                verz: { m: i.verzMaand, j: i.verzMaand * 12 },
                onderhoud: { m: onderhoud, j: onderhoud * 12 },
                netto: { m: netto, j: netto * 12 },
                rente: { m: renteMaand, j: renteMaand * 12 },
                aflossing: { m: aflossingMaand, j: aflossingMaand * 12 },
                cashflow: { m: cashflow, j: cashflow * 12 },
                bruto,
                investeringBasis,
                dscr:
                    renteMaand + aflossingMaand > 0
                        ? netto / (renteMaand + aflossingMaand)
                        : Infinity,
                icr: renteMaand > 0 ? netto / renteMaand : Infinity,
                bar: investeringBasis > 0 ? bruto / investeringBasis : 0,
                nar: investeringBasis > 0 ? (netto * 12) / investeringBasis : 0,
                roi: eigenInleg > 0 ? (cashflow * 12) / eigenInleg : 0,
                roiTot:
                    eigenInleg > 0 ? (cashflow * 12 + aflossingMaand * 12) / eigenInleg : 0,
                kap: bruto > 0 ? investeringBasis / bruto : Infinity,
            };
        }

        // HUIDIG: basis is bod (koopprijs zonder verbouwing)
        const huidig = scenario(i.huurMaand, i.bod);
        // NA VERBOUWING: basis is bod + verbouwing
        const nieuw = scenario(i.nieuweHuurMaand, i.bod + i.verbouwing);

        // Reverse BAR
        const maxBodHuidig = i.doelBar > 0 ? huidig.bruto / i.doelBar : 0;
        const maxBodNieuw = i.doelBar > 0 ? nieuw.bruto / i.doelBar : 0;
        const deltaHuidig = maxBodHuidig - i.bod;
        const deltaNieuw = maxBodNieuw - (i.bod + i.verbouwing);

        // Exit scenario's (20 jaar simulatie)
        function simulate(years, scen, investeringBasisExit, startKoopwaarde) {
            let annuitRest = annuit;
            let cum = 0;
            const rows = [];
            for (let y = 1; y <= years; y++) {
                const isAflvrijAanvang = i.aflVrijVanaf > 0 && y >= i.aflVrijVanaf;
                const renteY = (aflVrij + annuitRest) * i.rente;
                let aflossingY = 0;
                if (!isAflvrijAanvang && annuitRest > 0 && i.looptijd - y + 1 > 0) {
                    const pmtY = PMT(i.rente, i.looptijd - y + 1, -annuitRest);
                    aflossingY = pmtY - annuitRest * i.rente;
                }
                const hypEinde = aflVrij + annuitRest - aflossingY;
                const nettoY = scen.netto.j * Math.pow(1 + i.huurIndex, y - 1);
                const cashflowY = nettoY - renteY - aflossingY;
                cum += cashflowY;
                const waardeY = startKoopwaarde * Math.pow(1 + i.waardeStijging, y);
                rows.push({ y, hypEinde, cum, waardeY });
                annuitRest -= aflossingY;
            }
            function snap(n) {
                const r = rows[n - 1];
                const netto = r.waardeY - r.hypEinde;
                const totInleg = investeringBasisExit;
                const winst = netto + r.cum - totInleg;
                return {
                    verkoop: r.waardeY,
                    resterendHyp: r.hypEinde,
                    nettoOpbrengst: netto,
                    cumCf: r.cum,
                    inleg: totInleg,
                    winst,
                    rend: totInleg > 0 ? winst / totInleg : 0,
                    gem: totInleg > 0 ? winst / totInleg / n : 0,
                    multiple: totInleg > 0 ? (totInleg + winst) / totInleg : 0,
                };
            }
            return { j10: snap(10), j20: snap(20) };
        }

        // Voor HUIDIG exit: startwaarde = taxatie, investering = totaalAankoop + eenmaligeOverige (geen verbouwing)
        const exitHuidig = simulate(
            20,
            huidig,
            totaalAankoop + eenmaligeOverige - totaalHyp,
            i.taxatie
        );
        // Voor NA VERBOUWING exit: startwaarde = taxatie + verbouwing, investering = volledig - hyp
        const exitNieuw = simulate(
            20,
            nieuw,
            totaalInvestering - totaalHyp,
            i.taxatie + i.verbouwing
        );

        return {
            aankoop: {
                overdracht,
                totaalAankoop,
                eenmaligeOverige,
                totaalInvestering,
                korting,
                aflVrij,
                annuit,
                totaalHyp,
                ltv,
                eigenInleg,
                eigenInlegPersoon,
            },
            huidig,
            nieuw,
            reverse: {
                maxBodHuidig,
                maxBodNieuw,
                deltaHuidig,
                deltaNieuw,
            },
            exitHuidig,
            exitNieuw,
        };
    }

    /* ------------------------------------------
       Render
       ------------------------------------------ */
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function renderCashflowRow(key, label, h, n) {
        return (
            `<tr data-row="${key}">` +
            `<th>${label}</th>` +
            `<td class="num">${euro(h.m, 2)}</td>` +
            `<td class="num">${euro(h.j)}</td>` +
            `<td class="num">${euro(n.m, 2)}</td>` +
            `<td class="num">${euro(n.j)}</td>` +
            `</tr>`
        );
    }

    function renderCashflow(r) {
        const tbody = document.getElementById('cashflow-body');
        if (!tbody) return;
        const h = r.huidig;
        const n = r.nieuw;
        tbody.innerHTML =
            renderCashflowRow('huur', 'Huur', h.huur, n.huur) +
            renderCashflowRow('ozb', 'Belasting (OZB)', h.ozb, n.ozb) +
            renderCashflowRow('beheer', 'Beheer', h.beheer, n.beheer) +
            renderCashflowRow('verz', 'Verzekering', h.verz, n.verz) +
            renderCashflowRow('ond', 'Onderhoud', h.onderhoud, n.onderhoud) +
            `<tr class="row-subtotal" data-row="netto">` +
            `<th>Netto huur</th>` +
            `<td class="num">${euro(h.netto.m, 2)}</td>` +
            `<td class="num">${euro(h.netto.j)}</td>` +
            `<td class="num">${euro(n.netto.m, 2)}</td>` +
            `<td class="num">${euro(n.netto.j)}</td>` +
            `</tr>` +
            renderCashflowRow('rente', 'Rente', h.rente, n.rente) +
            renderCashflowRow('afloss', 'Aflossing', h.aflossing, n.aflossing) +
            `<tr class="row-total" data-row="cashflow">` +
            `<th>Cashflow</th>` +
            `<td class="num ${h.cashflow.m >= 0 ? 'pos' : 'neg'}">${euro(h.cashflow.m, 2)}</td>` +
            `<td class="num ${h.cashflow.j >= 0 ? 'pos' : 'neg'}">${euro(h.cashflow.j)}</td>` +
            `<td class="num ${n.cashflow.m >= 0 ? 'pos' : 'neg'}">${euro(n.cashflow.m, 2)}</td>` +
            `<td class="num ${n.cashflow.j >= 0 ? 'pos' : 'neg'}">${euro(n.cashflow.j)}</td>` +
            `</tr>`;
    }

    function renderRatios(r) {
        const tbody = document.getElementById('ratios-body');
        if (!tbody) return;
        const rows = [
            {
                key: 'dscr',
                name: 'DSCR',
                full: 'Debt Service Coverage Ratio',
                uitleg: 'Kan de huur de hypotheek betalen? (Netto ÷ Rente+Aflossing)',
                h: r.huidig.dscr,
                n: r.nieuw.dscr,
            },
            {
                key: 'icr',
                name: 'ICR',
                full: 'Interest Coverage Ratio',
                uitleg: 'Kan de huur de rente betalen? (Netto ÷ Rente)',
                h: r.huidig.icr,
                n: r.nieuw.icr,
            },
            {
                key: 'bar',
                name: 'BAR',
                full: 'Bruto AanvangsRendement',
                uitleg: 'Bruto rendement (Bruto huur ÷ Koopprijs)',
                h: r.huidig.bar,
                n: r.nieuw.bar,
            },
            {
                key: 'nar',
                name: 'NAR',
                full: 'Netto AanvangsRendement',
                uitleg: 'Netto rendement (Netto huur ÷ Koopprijs)',
                h: r.huidig.nar,
                n: r.nieuw.nar,
            },
            {
                key: 'roi',
                name: 'ROI',
                full: 'Return on Investment (cashflow)',
                uitleg: 'Cashflowrendement (Cashflow ÷ Eigen inleg)',
                h: r.huidig.roi,
                n: r.nieuw.roi,
            },
            {
                key: 'roiTot',
                name: 'ROI Totaal',
                full: 'ROI incl. aflossing',
                uitleg: 'Totaal rendement incl. aflossing op hoofdsom',
                h: r.huidig.roiTot,
                n: r.nieuw.roiTot,
            },
            {
                key: 'kap',
                name: 'Kap. Factor',
                full: 'Kapitalisatiefactor',
                uitleg: 'Terugverdientijd in jaren (Koopprijs ÷ Bruto huur)',
                h: r.huidig.kap,
                n: r.nieuw.kap,
            },
        ];
        tbody.innerHTML = rows
            .map((row) => {
                const b = BENCH[row.key];
                const vH = verdict(row.key, row.h);
                const vN = verdict(row.key, row.n);
                return (
                    `<tr>` +
                    `<th><span class="ratio-name">${row.name}</span><span class="ratio-full">${row.full}</span></th>` +
                    `<td class="num"><span class="val">${b.fmt(row.h)}</span>` +
                    (vH.tier
                        ? ` <span class="pill pill-${vH.tier}">${vH.label}</span>`
                        : '') +
                    `</td>` +
                    `<td class="num"><span class="val">${b.fmt(row.n)}</span>` +
                    (vN.tier
                        ? ` <span class="pill pill-${vN.tier}">${vN.label}</span>`
                        : '') +
                    `</td>` +
                    `<td class="bench">` +
                    `<span class="pill pill-slecht">${b.labels[0]}</span>` +
                    `<span class="pill pill-matig">${b.labels[1]}</span>` +
                    `<span class="pill pill-goed">${b.labels[2]}</span>` +
                    `<span class="pill pill-zeergoed">${b.labels[3]}</span>` +
                    `</td>` +
                    `<td class="uitleg">${row.uitleg}</td>` +
                    `</tr>`
                );
            })
            .join('');
    }

    function renderSummary(r) {
        const a = r.aankoop;
        setText('out-korting', pct(a.korting));
        setText('out-overdracht', euro(a.overdracht));
        setText('out-totaal-aankoop', euro(a.totaalAankoop));
        setText('out-overige', euro(a.eenmaligeOverige));
        setText('out-verbouwing', euro(readNumber('in-verbouwing')));
        setText('out-totaal-investering', euro(a.totaalInvestering));
        setText('out-afl-vrij', euro(a.aflVrij));
        setText('out-annuit', euro(a.annuit));
        setText('out-hypotheek', euro(a.totaalHyp));
        setText('out-ltv', pct(a.ltv));
        setText('out-inleg', euro(a.eigenInleg));
        setText('out-inleg-persoon', euro(a.eigenInlegPersoon));
    }

    function renderReverse(r, i) {
        setText('out-doel-bar', pct(i.doelBar));
        setText('out-max-bod-huidig', euro(r.reverse.maxBodHuidig));
        setText('out-delta-huidig', euro(r.reverse.deltaHuidig));
        setText('out-max-bod-nieuw', euro(r.reverse.maxBodNieuw));
        setText('out-delta-nieuw', euro(r.reverse.deltaNieuw));
        const badgeH = document.getElementById('out-delta-huidig-badge');
        if (badgeH) {
            if (r.reverse.deltaHuidig >= 0) {
                badgeH.textContent = 'Bod onder max';
                badgeH.className = 'pill pill-goed';
            } else {
                badgeH.textContent = 'Bod boven max';
                badgeH.className = 'pill pill-slecht';
            }
        }
        const badgeN = document.getElementById('out-delta-nieuw-badge');
        if (badgeN) {
            if (r.reverse.deltaNieuw >= 0) {
                badgeN.textContent = 'Bod onder max';
                badgeN.className = 'pill pill-goed';
            } else {
                badgeN.textContent = 'Bod boven max';
                badgeN.className = 'pill pill-slecht';
            }
        }
    }

    function renderExit(r) {
        const tbody = document.getElementById('exit-body');
        if (!tbody) return;
        const eh = r.exitHuidig;
        const en = r.exitNieuw;
        function row(label, getter, fmt) {
            return (
                `<tr><th>${label}</th>` +
                `<td class="num">${fmt(getter(eh.j10))}</td>` +
                `<td class="num">${fmt(getter(eh.j20))}</td>` +
                `<td class="num">${fmt(getter(en.j10))}</td>` +
                `<td class="num">${fmt(getter(en.j20))}</td></tr>`
            );
        }
        tbody.innerHTML =
            row('Verkoopwaarde', (s) => s.verkoop, (v) => euro(v)) +
            row('Resterende hypotheek', (s) => s.resterendHyp, (v) => euro(v)) +
            row('Netto verkoopopbrengst', (s) => s.nettoOpbrengst, (v) => euro(v)) +
            row('Cumulatieve cashflow', (s) => s.cumCf, (v) => euro(v)) +
            row('Eigen inleg', (s) => s.inleg, (v) => euro(v)) +
            `<tr class="row-total">` +
            `<th>Totale winst</th>` +
            `<td class="num ${eh.j10.winst >= 0 ? 'pos' : 'neg'}">${euro(eh.j10.winst)}</td>` +
            `<td class="num ${eh.j20.winst >= 0 ? 'pos' : 'neg'}">${euro(eh.j20.winst)}</td>` +
            `<td class="num ${en.j10.winst >= 0 ? 'pos' : 'neg'}">${euro(en.j10.winst)}</td>` +
            `<td class="num ${en.j20.winst >= 0 ? 'pos' : 'neg'}">${euro(en.j20.winst)}</td>` +
            `</tr>` +
            row('Totaal rendement', (s) => s.rend, (v) => pct(v)) +
            row('Gemiddeld per jaar', (s) => s.gem, (v) => pct(v)) +
            row('Multiple op inleg', (s) => s.multiple, (v) => num(v) + '×');
    }

    function update() {
        const i = readInputs();
        const r = compute(i);
        renderCashflow(r);
        renderRatios(r);
        renderSummary(r);
        renderReverse(r, i);
        renderExit(r);
    }

    function init() {
        const inputs = document.querySelectorAll('.calc-input input');
        inputs.forEach((el) => {
            el.addEventListener('input', update);
            el.addEventListener('change', update);
        });
        // Reset-knop
        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.calc-input input[data-default]').forEach((el) => {
                    el.value = el.dataset.default;
                });
                update();
            });
        }
        update();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

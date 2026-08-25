const KLUCZ_DANIA_WLASNE = "stolowka_dania_wlasne";

const KLUCZE_WARTOSCI = [
    "kcal", "bialko_g", "tluszcz_g", "weglowodany_g", "blonnik_g", "cukry_g",
    "sod_mg", "witamina_c_mg", "zelazo_mg", "woda_g"
];

const KATEGORIE_SKLADNIKOW = {
    ryba: ["ryba", "ryby", "mintaj", "dorsz", "łosoś", "losos", "makrela", "filet z ryby", "morszczuk", "śledź", "sledz", "pstrąg", "pstrag", "halibut", "okoń morski", "okon morski", "sandacz", "tuńczyk", "tunczyk"],
    straczki: ["fasol", "ciecierzyc", "soczewic", "groch", "bób", "bob", "strączk", "straczk", "hummus"],
    mieso_swieze: ["wieprzow", "wołow", "wolow", "drobiow", "kurczak", "indyk", "schab", "karkówk", "karkowk", "mięso", "mieso", "kotlet", "mielone", "wołowin", "wolowin"],
    mieso_przetworzone: ["kiełbas", "kielbas", "wędlin", "wedlin", "mortadel", "pasztet", "gotowy kotlet", "gotowy sznycel", "konserwa", "parówk", "parowk", "boczek"],
    nabial_jajo: ["mleko", "śmietana", "smietana", "ser ", "jogurt", "jajko", "jajo", "twaróg", "twarog", "masło", "maslo", "kefir", "serek", "maślank", "maslank"],
    warzywo: ["marchew", "pietruszk", "seler", "kapust", "burak", "ogórek", "ogorek", "pomidor", "cebul", "brokuł", "brokul", "szpinak", "papryk", "cukini", "por ", "groszek", "fasolka ziel", "kalafior", "rzepa", "dynia", "sałat", "salat", "szczypior"],
    owoc: ["jabłk", "jablk", "gruszk", "truskaw", "borówk", "borowk", "malin", "porzeczk", "morela", "śliw", "sliw", "banan", "cytrus", "pomarańcz", "pomaranc"],
    caloziarniste: ["pełnoziarnist", "pelnoziarnist", "całoziarnist", "caloziarnist", "żytni", "zytni", "pszenny", "orkisz", "żyto", "zyto", "owies", "kasza", "otręb", "otreb", "razow"]
};

function tekstySkladnikow(danie) {
    return (danie.skladniki || []).map(function(s) {
        return (s.nazwa || "").toLowerCase();
    });
}

function pasujeDoKategorii(teksty, kategoria) {
    const slowa = KATEGORIE_SKLADNIKOW[kategoria] || [];
    return teksty.some(function(t) {
        return slowa.some(function(slowo) {
            return t.indexOf(slowo) !== -1;
        });
    });
}

const UDZIAL_ENERGII_OBIADU = {
    obiad_jednodaniowy: {min: 0.18, max: 0.22},
    zupa_czesc_dwudaniowego: {min: 0.08, max: 0.12},
    danie_glowne_czesc_dwudaniowego: {min: 0.18, max: 0.22}
};

const ZAKRESY_MAKRO = {
    bialko: {min: 0.10, max: 0.15, kcalNaG: 4, etykieta: "Białko"},
    tluszcz: {min: 0.25, max: 0.35, kcalNaG: 9, etykieta: "Tłuszcz"},
    weglowodany: {min: 0.50, max: 0.60, kcalNaG: 4, etykieta: "Węglowodany"}
};

function ocenMakroskladniki(wartosciOdzywcze, kcal) {
    if (!kcal) {
        return {makroskaldniki_zgodne: null, szczegoly_makroskaldnikow: []};
    }

    const szczegoly = [];
    let wszystkoOk = true;

    const pary = [
        ["bialko", wartosciOdzywcze.bialko_g || 0],
        ["tluszcz", wartosciOdzywcze.tluszcz_g || 0],
        ["weglowodany", wartosciOdzywcze.weglowodany_g || 0]
    ];

    pary.forEach(function(para) {
        const klucz = para[0];
        const gramy = para[1];
        const zakres = ZAKRESY_MAKRO[klucz];
        const udzial = (gramy * zakres.kcalNaG) / kcal;

        if (udzial < zakres.min || udzial > zakres.max) {
            wszystkoOk = false;
            const oczekiwaneG = ((zakres.min + zakres.max) / 2 * kcal / zakres.kcalNaG).toFixed(1);
            szczegoly.push(`${zakres.etykieta} poza zakresem ${Math.round(zakres.min * 100)}-${Math.round(zakres.max * 100)}% energii (${gramy.toFixed(1)}g, powinno ~${oczekiwaneG}g)`);
        }
    });

    return {makroskaldniki_zgodne: wszystkoOk, szczegoly_makroskaldnikow: szczegoly};
}

function ocenZgodnoscDania(danie, kontekst) {
    const teksty = tekstySkladnikow(danie);

    const zawiera_ryba = pasujeDoKategorii(teksty, "ryba");
    const zawiera_mieso_swieze = pasujeDoKategorii(teksty, "mieso_swieze") && !pasujeDoKategorii(teksty, "mieso_przetworzone");
    const zawiera_mieso_przetworzone = pasujeDoKategorii(teksty, "mieso_przetworzone");
    const zawiera_nabial_jajo = pasujeDoKategorii(teksty, "nabial_jajo");
    const zawiera_warzywo_lub_owoc = pasujeDoKategorii(teksty, "warzywo") || pasujeDoKategorii(teksty, "owoc");
    const zawiera_ziarno_caloziarniste = pasujeDoKategorii(teksty, "caloziarniste");
    const danie_roslinne_bez_odzwierzecych = !zawiera_ryba && !zawiera_mieso_swieze && !zawiera_mieso_przetworzone && !zawiera_nabial_jajo;

    const cechy_dania = {
        smazone: !!kontekst.smazone,
        zawiera_ryba: zawiera_ryba,
        zawiera_mieso_swieze: zawiera_mieso_swieze,
        danie_roslinne_bez_odzwierzecych: danie_roslinne_bez_odzwierzecych,
        zupa_na_wywarze_warzywnym: kontekst.typ_posilku === "zupa_czesc_dwudaniowego" ? !!kontekst.wywarWarzywny : false,
        zawiera_warzywo_lub_owoc: zawiera_warzywo_lub_owoc,
        zawiera_koncentrat: !!kontekst.koncentrat,
        zawiera_ziarno_caloziarniste: zawiera_ziarno_caloziarniste
    };

    const uwagi = [];

    if (zawiera_mieso_przetworzone) {
        uwagi.push("Zawiera mięso przetworzone (wędliny/gotowe wyroby) - niedozwolone od 09.2026, dozwolone jest tylko mięso świeże.");
    }

    let energia_zgodna_z_udzialem_docelowym = null;
    const udzialWzorzec = UDZIAL_ENERGII_OBIADU[kontekst.typ_posilku];

    if (udzialWzorzec && kontekst.celKcal) {
        const udzial = danie.kcal / kontekst.celKcal;
        energia_zgodna_z_udzialem_docelowym = udzial >= udzialWzorzec.min && udzial <= udzialWzorzec.max;

        if (!energia_zgodna_z_udzialem_docelowym) {
            const oczekiwaneMinKcal = Math.round(kontekst.celKcal * udzialWzorzec.min);
            const oczekiwaneMaxKcal = Math.round(kontekst.celKcal * udzialWzorzec.max);
            uwagi.push(`Kaloryczność dania (${danie.kcal} kcal) poza oczekiwanym zakresem ${oczekiwaneMinKcal}-${oczekiwaneMaxKcal} kcal dla tego typu posiłku.`);
        }
    }

    const oceneMakro = ocenMakroskladniki(danie.wartosci_odzywcze, danie.kcal);

    return {
        cechy_dania: cechy_dania,
        energia_zgodna_z_udzialem_docelowym: energia_zgodna_z_udzialem_docelowym,
        makroskaldniki_zgodne: oceneMakro.makroskaldniki_zgodne,
        szczegoly_makroskaldnikow: oceneMakro.szczegoly_makroskaldnikow,
        uwagi: uwagi
    };
}

const state = {
    dania: [],
    produkty: [],
    produktyPoKodzie: new Map(),
    slot: null,
    data: null,
    wybraneDanieId: null
};

function odczytajParametryUrl() {
    const params = new URLSearchParams(window.location.search);

    state.slot = params.get("slot");
    state.data = params.get("data") || fmtData(new Date());
}

function wczytajZLocalStorage(klucz) {
    const zapis = localStorage.getItem(klucz);

    if (!zapis) {
        return [];
    }

    try {
        const dane = JSON.parse(zapis);
        return Array.isArray(dane) ? dane : [];
    } catch (err) {
        return [];
    }
}

async function wczytajDane() {
    const kontenerListy = document.getElementById("lista-dan");

    let daniaBazowe = [];
    let produktyBazowe = [];

    try {
        const [daniaRes, produktyRes] = await Promise.all([
            fetch("normy.json"),
            fetch("produkty.json")
        ]);

        if (!daniaRes.ok || !produktyRes.ok) {
            throw new Error("Nie udało się wczytać plików normy.json / produkty.json");
        }

        daniaBazowe = await daniaRes.json();
        produktyBazowe = await produktyRes.json();
    } catch (err) {
        kontenerListy.innerHTML = `
        <p id="blad-wczytywania">Nie udało się wczytać bazy dań (${err.message}).
        Jeśli otwierasz ten plik bezpośrednio z dysku (adres zaczyna się od <code>file://</code>),
        uruchom stronę przez lokalny serwer (np. <code>python -m http.server</code>) albo umieść ją na hostingu
        (np. GitHub Pages) - przeglądarki blokują wczytywanie plików JSON bezpośrednio z dysku.</p>
        `;
        throw err;
    }

    const daniaWlasne = wczytajZLocalStorage(KLUCZ_DANIA_WLASNE);
    const produktyWlasne = wczytajZLocalStorage(KLUCZ_PRODUKTY_WLASNE);

    state.dania = daniaBazowe.concat(daniaWlasne);
    state.produkty = produktyBazowe.concat(produktyWlasne);

    state.produktyPoKodzie = new Map(
        state.produkty.map(function(p) {
            return [p.kod_kreskowy, p];
        })
    );
}

function zbudujFiltrTypow() {
    const select = document.getElementById("typ_posilku");
    const typy = Array.from(new Set(state.dania.map(function(d) { return d.typ_posilku; }))).sort();

    typy.forEach(function(typ) {
        const opcja = document.createElement("option");
        opcja.value = typ;
        opcja.textContent = typ.replaceAll("_", " ");
        select.appendChild(opcja);
    });
}

function pokazInfoOSlocie() {
    const info = document.getElementById("info");
    const sekcjaSlotow = document.getElementById("sloty");

    if (state.slot && SLOTY_ETYKIETY[state.slot]) {
        info.textContent = `Wybierz danie, aby dodać je do posiłku: ${SLOTY_ETYKIETY[state.slot]} (${state.data})`;
        sekcjaSlotow.hidden = true;
    } else {
        info.textContent = "Przeglądasz bazę dań. Wybierz posiłek, do którego chcesz coś dodać:";
        sekcjaSlotow.hidden = false;
        document.getElementById("wybur").value = "obiad";
    }
}

function filtrujDania() {
    const fraza = document.getElementById("szukaj").value.trim().toLowerCase();
    const typ = document.getElementById("typ_posilku").value;

    const wynik = state.dania.filter(function(d) {
        const pasujeNazwa = d.nazwa.toLowerCase().includes(fraza);
        const pasujeTyp = typ === "wszystkie" || d.typ_posilku === typ;
        return pasujeNazwa && pasujeTyp;
    });

    renderujListeDan(wynik);
}

function renderujListeDan(lista) {
    const kontener = document.getElementById("lista-dan");

    if (lista.length === 0) {
        kontener.innerHTML = "<p>Brak dań spełniających kryteria</p>";
        return;
    }

    kontener.innerHTML = lista.slice(0, 100).map(function(d) {
        const alergeny = policzAlergenyDania(d);
        let znacznikAlergenow;

        if (alergeny.length > 0) {
            znacznikAlergenow = `<span class="tag bad">⚠️ ${alergeny.length} alergen(y)</span>`;
        } else {
            znacznikAlergenow = `<span class="tag ok">bez zgłoszonych alergenów</span>`;
        }

        let znacznikWlasne = "";

        if (d.wlasne) {
            znacznikWlasne = `<span class="tag">własne danie</span>`;
        }

        return `
        <article class="karta-dania" data-id="${d.id}">
            <h3>${d.nazwa}</h3>
            <p class="typ-dania">${d.typ_posilku.replaceAll("_"," ")}</p>
            <p class="kcal-dania">${Math.round(d.kcal)} kcal | ${Math.round(d.gram)} g</p>
            ${znacznikAlergenow}
            ${znacznikWlasne}
        </article>
        `;
    }).join("");

    if (lista.length > 100) {
        kontener.insertAdjacentHTML("beforeend", `<p class="info-liczba">Pokazano pierwsze 100 z ${lista.length} wyników</p>`);
    }

    kontener.querySelectorAll(".karta-dania").forEach(function(karta) {
        karta.addEventListener("click", function() {
            pokazSzczegolyDania(Number(karta.dataset.id));
        });
    });
}

function policzAlergenyDania(danie) {
    const alergeny = new Set();

    (danie.skladniki || []).forEach(function(sk) {
        const produkt = state.produktyPoKodzie.get(sk.kod_kreskowy);

        (produkt && produkt.alergeny || []).forEach(function(a) {
            alergeny.add(a);
        });
    });

    return Array.from(alergeny);
}

function tagZgodnosci(wartosc, etykietaOk, etykietaBad, etykietaBrak) {
    if (wartosc === true) {
        return `<span class="tag ok">✅ ${etykietaOk}</span>`;
    } else if (wartosc === false) {
        return `<span class="tag bad">⚠️ ${etykietaBad}</span>`;
    } else {
        return `<span class="tag">${etykietaBrak}</span>`;
    }
}

function renderujOceneZgodnosci(danie) {
    const ocena = danie.ocena_zgodnosci;

    if (!ocena) {
        return `<p class="podpowiedz-domyslna">Brak oceny zgodności dla tego dania.</p>`;
    }

    const cechy = ocena.cechy_dania || {};

    const etykietyCech = [
        ["zawiera_warzywo_lub_owoc", "Zawiera warzywo/owoc"],
        ["zawiera_ryba", "Zawiera rybę"],
        ["zawiera_mieso_swieze", "Zawiera świeże mięso"],
        ["danie_roslinne_bez_odzwierzecych", "Danie w pełni roślinne"],
        ["zupa_na_wywarze_warzywnym", "Zupa na wywarze warzywnym"],
        ["zawiera_ziarno_caloziarniste", "Zawiera produkt pełnoziarnisty"],
        ["smazone", "Danie smażone"],
        ["zawiera_koncentrat", "Zawiera koncentrat"]
    ];

    const znacznikiCech = etykietyCech.map(function(para) {
        const wartosc = cechy[para[0]];

        if (para[0] === "smazone" || para[0] === "zawiera_koncentrat") {
            if (wartosc) {
                return `<span class="tag bad">⚠️ ${para[1]}</span>`;
            }
            return "";
        }

        return tagZgodnosci(wartosc, para[1], `Brak: ${para[1].toLowerCase()}`, para[1]);
    }).filter(Boolean).join(" ");

    let energiaHtml = "";

    if (ocena.energia_zgodna_z_udzialem_docelowym !== null && ocena.energia_zgodna_z_udzialem_docelowym !== undefined) {
        energiaHtml = `<p>${tagZgodnosci(ocena.energia_zgodna_z_udzialem_docelowym, "energia zgodna z udziałem docelowym", "energia poza docelowym udziałem", "energia - brak danych")}</p>`;
    }

    let makroHtml = "";

    if (ocena.makroskaldniki_zgodne !== null && ocena.makroskaldniki_zgodne !== undefined) {
        makroHtml = `<p>${tagZgodnosci(ocena.makroskaldniki_zgodne, "makroskładniki zgodne", "makroskładniki poza zakresem", "makroskładniki - brak danych")}</p>`;

        if (ocena.szczegoly_makroskaldnikow && ocena.szczegoly_makroskaldnikow.length) {
            makroHtml += `<ul class="lista-uwag">${ocena.szczegoly_makroskaldnikow.map(function(u) { return `<li>${u}</li>`; }).join("")}</ul>`;
        }
    }

    let uwagiHtml = "";

    if (ocena.uwagi && ocena.uwagi.length) {
        uwagiHtml = `<ul class="lista-uwag">${ocena.uwagi.map(function(u) { return `<li>${u}</li>`; }).join("")}</ul>`;
    }

    return `
    <section class="blok-zgodnosci">
        <p>${znacznikiCech}</p>
        ${energiaHtml}
        ${makroHtml}
        ${uwagiHtml}
    </section>
    `;
}

function generujPrzepis(danie) {
    const teksty = tekstySkladnikow(danie);
    const nazwaLower = danie.nazwa.toLowerCase();

    function nazwySkladnikowZKategorii(kategoria) {
        return (danie.skladniki || []).filter(function(s) {
            return pasujeDoKategorii([s.nazwa.toLowerCase()], kategoria);
        });
    }

    const warzywa = nazwySkladnikowZKategorii("warzywo");
    const ryby = nazwySkladnikowZKategorii("ryba");
    const mieso = nazwySkladnikowZKategorii("mieso_swieze").concat(nazwySkladnikowZKategorii("mieso_przetworzone"));
    const straczkiSkl = nazwySkladnikowZKategorii("straczki");
    const skrobiaSlowa = ["kasza", "ryż", "ryz", "makaron", "ziemniak", "płatk", "platk", "pieczyw", "bułk", "bulk", "chleb", "quinoa", "komosa", "kuskus", "kus-kus", "bulgur"];
    const skrobia = (danie.skladniki || []).filter(function(s) {
        const t = s.nazwa.toLowerCase();
        return skrobiaSlowa.some(function(w) { return t.indexOf(w) !== -1; });
    });
    const przyprawySlowa = ["pieprz", "sól", "sol", "oregano", "koperek", "natka", "zioł", "ziol", "przypraw"];
    const przyprawy = (danie.skladniki || []).filter(function(s) {
        const t = s.nazwa.toLowerCase();
        return przyprawySlowa.some(function(w) { return t.indexOf(w) !== -1; });
    });
    const nabial = nazwySkladnikowZKategorii("nabial_jajo");

    function listuj(lista) {
        return lista.map(function(s) { return `${s.nazwa} (${s.gram} g)`; }).join(", ");
    }

    const kroki = [];
    const jestZupa = danie.typ_posilku === "zupa_czesc_dwudaniowego" || nazwaLower.indexOf("zupa") !== -1 || nazwaLower.indexOf("krem") !== -1;

    if (warzywa.length) {
        kroki.push(`Warzywa (${listuj(warzywa)}) umyj, obierz i pokrój w kostkę lub plastry.`);
    }

    if (jestZupa) {
        kroki.push("Warzywa i pozostałe składniki włóż do garnka, zalej wodą tak, aby przykryła składniki, i gotuj pod przykryciem ok. 20-25 minut, aż będą miękkie.");

        if (skrobia.length) {
            kroki.push(`${listuj(skrobia)} ugotuj osobno zgodnie z instrukcją na opakowaniu i dodaj do zupy przed podaniem.`);
        }

        kroki.push("Zupę w razie potrzeby zblenduj na gładki krem lub podawaj w kawałkach.");

        if (nabial.length) {
            kroki.push(`Podawaj z dodatkiem: ${listuj(nabial)}.`);
        }
    } else {
        if (ryby.length) {
            const metoda = nazwaLower.indexOf("smaż") !== -1 || nazwaLower.indexOf("smaz") !== -1 ? "usmaż na patelni z niewielką ilością oleju" : "upiecz w piekarniku nagrzanym do ok. 190°C przez 15-20 minut";
            kroki.push(`${listuj(ryby)} dopraw przyprawami i ${metoda}, aż mięso ryby będzie białe i łatwo się rozdzieli.`);
        } else if (mieso.length) {
            const metoda = nazwaLower.indexOf("piecz") !== -1 ? "upiecz w piekarniku nagrzanym do ok. 190°C przez 20-25 minut" : "podsmaż na patelni, a następnie duś pod przykryciem do miękkości";
            kroki.push(`${listuj(mieso)} dopraw przyprawami i ${metoda}.`);
        } else if (straczkiSkl.length) {
            kroki.push(`${listuj(straczkiSkl)} ugotuj (lub duś z warzywami) do miękkości, dopraw do smaku.`);
        }

        if (warzywa.length) {
            kroki.push("Warzywa podduś na patelni lub ugotuj na parze do miękkości.");
        }

        if (skrobia.length) {
            kroki.push(`${listuj(skrobia)} ugotuj osobno w osolonej wodzie zgodnie z instrukcją na opakowaniu.`);
        }

        kroki.push("Wszystkie składniki połącz na talerzu i podawaj na ciepło.");
    }

    if (przyprawy.length) {
        kroki.push(`Całość dopraw do smaku: ${listuj(przyprawy)}.`);
    }

    if (kroki.length === 0) {
        kroki.push("Wszystkie składniki umyj, obierz w razie potrzeby, ugotuj lub upiecz do miękkości i podawaj razem, doprawione do smaku.");
    }

    return {kroki: kroki, zrodlo: "automatyczny"};
}

function renderujPrzepis(danie) {
    const przepis = danie.przepis || generujPrzepis(danie);
    const naglowek = przepis.zrodlo === "redakcja" ? "Sposób przygotowania" : "Sposób przygotowania (przepis wygenerowany automatycznie na podstawie składników)";

    let metaHtml = "";

    if (przepis.czas_przygotowania_min) {
        metaHtml += `<span class="czas-przepisu">⏱ ok. ${przepis.czas_przygotowania_min} min</span>`;
    }

    return `
    <h4>${naglowek}</h4>
    ${metaHtml}
    ${przepis.porcje_uwaga ? `<p class="podpowiedz-domyslna">${przepis.porcje_uwaga}</p>` : ""}
    <ol class="lista-przepisu">${przepis.kroki.map(function(krok) { return `<li>${krok}</li>`; }).join("")}</ol>
    `;
}

function pokazSzczegolyDania(id) {
    const danie = state.dania.find(function(d) {
        return d.id === id;
    });

    if (!danie) {
        return;
    }

    state.wybraneDanieId = id;
    const panel = document.getElementById("szczegoly_dania");
    const alergeny = policzAlergenyDania(danie);
    const wo = danie.wartosci_odzywcze || {};
    let htmlAlergenow;

    const skladnikiHtml = (danie.skladniki || []).map(function(sk) {
        const produkt = state.produktyPoKodzie.get(sk.kod_kreskowy);
        const alergenyProduktu = (produkt && produkt.alergeny || []).map(etykietaAlergenu).join(", ");
        let nazwaProduktu;
        let tagAlergenu = "";

        if (produkt) {
            nazwaProduktu = produkt.nazwa;
        } else {
            nazwaProduktu = `${sk.nazwa} (brak w bazie produktów)`;
        }

        if (alergenyProduktu) {
            tagAlergenu = ` | <span class="alergen-tag">${alergenyProduktu}</span>`;
        }

        return `<li>${nazwaProduktu} - ${sk.gram} g${tagAlergenu}</li>`;
    }).join("");

    if (alergeny.length) {
        htmlAlergenow = `<p class="ostrzezenie-alergen">⚠️ Zawiera alergeny: ${alergeny.map(etykietaAlergenu).join(", ")}</p>`;
    } else {
        htmlAlergenow = `<p class="tag ok">Brak zgłoszonych alergenów w składnikach</p>`;
    }

    panel.innerHTML = `
    <h2>${danie.nazwa}</h2>
    <p class="typ-dania">${danie.typ_posilku.replaceAll("_", " ")} | ${Math.round(danie.gram)} g łącznie</p>
    ${htmlAlergenow}

    <h4>Ocena zgodności z rozporządzeniem</h4>
    ${renderujOceneZgodnosci(danie)}

    <h4>Składniki</h4>
    <ul class="lista-skladnikow-widok">${skladnikiHtml}</ul>

    <h4>Wartości odżywcze</h4>
    <ul class="wartosci-widok">
        <li>Kalorie: <b>${Math.round(danie.kcal)} kcal</b></li>
        <li>Białko: ${(wo.bialko_g || 0).toFixed(1)} g</li>
        <li>Tłuszcz: ${(wo.tluszcz_g || 0).toFixed(1)} g</li>
        <li>Węglowodany: ${(wo.weglowodany_g || 0).toFixed(1)} g</li>
        <li>Błonnik: ${(wo.blonnik_g || 0).toFixed(1)} g</li>
        <li>Cukry: ${(wo.cukry_g || 0).toFixed(1)} g</li>
        <li>Sód: ${(wo.sod_mg || 0).toFixed(0)} mg</li>
    </ul>

    ${renderujPrzepis(danie)}

    <button id="dodaj-do-posilku-btn">+ Dodaj do posiłku</button>
    `;

    panel.hidden = false;
    panel.scrollIntoView({behavior: "smooth", block: "nearest"});

    document.getElementById("dodaj-do-posilku-btn").addEventListener("click", function() {
        dodajDanieDoPosilku(danie, alergeny);
    });
}

function dodajDanieDoPosilku(danie, alergeny) {
    let slot;
    let dzien;
    const klucz = kluczDnia(state.data);
    const zapis = localStorage.getItem(klucz);

    if (state.slot && SLOTY_ETYKIETY[state.slot]) {
        slot = state.slot;
    } else {
        slot = document.getElementById("wybur").value;
    }

    if (alergeny.length > 0) {
        const potwierdzone = confirm(`Uwaga - "${danie.nazwa}" zawiera alergeny: ${alergeny.map(etykietaAlergenu).join(", ")}.\nCzy na pewno dodać to danie do posiłku?`);

        if (!potwierdzone) {
            return;
        }
    }

    if (zapis) {
        dzien = JSON.parse(zapis);
    } else {
        dzien = pustyDzien();
    }

    if (dzien.zatwierdzony) {
        alert("Posiłki na ten dzień zostały już zatwierdzone - nie można ich edytować");
        return;
    }

    const wpis = Object.assign({}, danie, {
        godzina: new Date().toTimeString().slice(0, 5)
    });

    dzien[slot] = dzien[slot] || [];
    dzien[slot].push(wpis);
    localStorage.setItem(klucz, JSON.stringify(dzien));

    window.location.href = "home.html";
}

function odswiezDatalisteProduktow() {
    const datalist = document.getElementById("produkty-datalista");

    datalist.innerHTML = state.produkty.map(function(p) {
        return `<option value="${p.nazwa}">`;
    }).join("");
}

function zbudujCheckboxyAlergenowProduktu() {
    const kontener = document.getElementById("np-alergeny");

    kontener.innerHTML = `<legend>Alergeny nowego produktu</legend>` + ALERGENY.map(function(a) {
        return `
        <label class="checkbox-alergen">
            <input type="checkbox" class="np-alergen-checkbox" value="${a.klucz}"> ${a.etykieta}
        </label>
        `;
    }).join("");
}

function pokazPanelNowegoProduktu(nazwaWpisana, wiersz) {
    const panel = document.getElementById("nowy-produkt-panel");
    panel.hidden = false;
    document.getElementById("np-nazwa").value = nazwaWpisana || "";
    document.getElementById("np-status").textContent = "";
    panel.scrollIntoView({behavior: "smooth", block: "nearest"});
    panel.dataset.docelowyWiersz = wiersz ? wiersz.dataset.wierszId : "";
}

function zapiszNowyProdukt() {
    const nazwa = document.getElementById("np-nazwa").value.trim();
    const statusEl = document.getElementById("np-status");

    if (!nazwa) {
        statusEl.textContent = "⚠️ Podaj nazwę produktu";
        return;
    }

    const istnieje = state.produkty.some(function(p) {
        return p.nazwa.toLowerCase() === nazwa.toLowerCase();
    });

    if (istnieje) {
        statusEl.textContent = "⚠️ Produkt o tej nazwie już istnieje w bazie";
        return;
    }

    const alergeny = Array.from(document.querySelectorAll(".np-alergen-checkbox:checked")).map(function(cb) {
        return cb.value;
    });

    const kodKreskowy = `wlasny-${Date.now()}`;

    const nowyProdukt = {
        kod_kreskowy: kodKreskowy,
        nazwa: nazwa,
        kategoria: document.getElementById("np-kategoria").value.trim() || "Inne",
        wartosci_odzywcze_na_100g: {
            kcal: Number(document.getElementById("np-kcal").value) || 0,
            bialko_g: Number(document.getElementById("np-bialko").value) || 0,
            tluszcz_g: Number(document.getElementById("np-tluszcz").value) || 0,
            weglowodany_g: Number(document.getElementById("np-weglowodany").value) || 0,
            blonnik_g: Number(document.getElementById("np-blonnik").value) || 0,
            cukry_g: Number(document.getElementById("np-cukry").value) || 0,
            sod_mg: Number(document.getElementById("np-sod").value) || 0,
            witamina_c_mg: Number(document.getElementById("np-witaminac").value) || 0,
            zelazo_mg: Number(document.getElementById("np-zelazo").value) || 0,
            woda_g: Number(document.getElementById("np-woda").value) || 0
        },
        alergeny: alergeny,
        wlasny: true
    };

    state.produkty.push(nowyProdukt);
    state.produktyPoKodzie.set(nowyProdukt.kod_kreskowy, nowyProdukt);

    const produktyWlasne = wczytajZLocalStorage(KLUCZ_PRODUKTY_WLASNE);
    produktyWlasne.push(nowyProdukt);
    localStorage.setItem(KLUCZ_PRODUKTY_WLASNE, JSON.stringify(produktyWlasne));

    odswiezDatalisteProduktow();

    const panel = document.getElementById("nowy-produkt-panel");
    const wierszId = panel.dataset.docelowyWiersz;

    if (wierszId) {
        const wiersz = document.querySelector(`.wiersz-skladnika[data-wiersz-id="${wierszId}"]`);

        if (wiersz) {
            wiersz.querySelector(".skladnik-nazwa").value = nazwa;
        }
    }

    statusEl.textContent = `✅ Dodano produkt „${nazwa}" do bazy - możesz go teraz wybrać jako składnik`;

    document.getElementById("np-nazwa").value = "";
    ["np-kcal", "np-bialko", "np-tluszcz", "np-weglowodany", "np-blonnik", "np-cukry", "np-sod", "np-witaminac", "np-zelazo", "np-woda"].forEach(function(id) {
        document.getElementById(id).value = "0";
    });
    document.querySelectorAll(".np-alergen-checkbox:checked").forEach(function(cb) {
        cb.checked = false;
    });
}

let licznikWierszy = 0;

function inicjujFormularzDodawania() {
    const pokaz = document.getElementById("pokaz-formularz");
    const formularz = document.getElementById("formularz-danie");
    const listaSkladnikow = document.getElementById("lista-skladnikow");
    const typSelect = document.getElementById("nowe-typ");
    const poleWywarWarzywny = document.getElementById("pole-wywar-warzywny");

    odswiezDatalisteProduktow();
    zbudujCheckboxyAlergenowProduktu();

    function dodajWierszSkladnika() {
        licznikWierszy += 1;
        const wiersz = document.createElement("section");
        wiersz.className = "wiersz-skladnika";
        wiersz.dataset.wierszId = String(licznikWierszy);

        wiersz.innerHTML = `
        <input type="text" class="skladnik-nazwa" list="produkty-datalista" placeholder="Nazwa produktu..." required>
        <input type="number" class="skladnik-gram" placeholder="gramy" min="0" step="0.1" required>
        <button type="button" class="usun-skladnik-btn">✕</button>
        `;

        wiersz.querySelector(".usun-skladnik-btn").addEventListener("click", function() {
            wiersz.remove();
        });

        listaSkladnikow.appendChild(wiersz);
    }

    pokaz.addEventListener("click", function() {
        formularz.hidden = !formularz.hidden;

        if (!formularz.hidden && listaSkladnikow.children.length === 0) {
            dodajWierszSkladnika();
        }
    });

    typSelect.addEventListener("change", function() {
        poleWywarWarzywny.hidden = typSelect.value !== "zupa_czesc_dwudaniowego";
    });

    document.getElementById("dodaj-skladnik").addEventListener("click", dodajWierszSkladnika);
    document.getElementById("np-zapisz-btn").addEventListener("click", zapiszNowyProdukt);

    formularz.addEventListener("submit", wyslijNoweDanie);
}

function wyslijNoweDanie(e) {
    e.preventDefault();

    const bladEl = document.getElementById("formularz-blad");
    const nazwa = document.getElementById("nowe_nazwa").value.trim();
    const typ_posilku = document.getElementById("nowe-typ").value;
    const wiersze = Array.from(document.querySelectorAll(".wiersz-skladnika"));
    const skladniki = [];

    bladEl.hidden = true;

    if (!nazwa) {
        bladEl.textContent = "Podaj nazwę dania";
        bladEl.hidden = false;
        return;
    }

    if (wiersze.length === 0) {
        bladEl.textContent = "Dodaj przynajmniej jeden składnik";
        bladEl.hidden = false;
        return;
    }

    for (const wiersz of wiersze) {
        const nazwaProduktu = wiersz.querySelector(".skladnik-nazwa").value.trim();
        const gram = Number(wiersz.querySelector(".skladnik-gram").value);

        const produkt = state.produkty.find(function(p) {
            return p.nazwa.toLowerCase() === nazwaProduktu.toLowerCase();
        });

        if (!produkt) {
            bladEl.innerHTML = `Produkt „${nazwaProduktu}" nie istnieje jeszcze w bazie produktów. <button type="button" id="link-dodaj-produkt">+ Dodaj nowy produkt „${nazwaProduktu}"</button>`;
            bladEl.hidden = false;

            document.getElementById("link-dodaj-produkt").addEventListener("click", function() {
                pokazPanelNowegoProduktu(nazwaProduktu, wiersz);
            });

            return;
        }

        if (!gram || gram <= 0) {
            bladEl.textContent = `Podaj poprawną gramaturę dla ${nazwaProduktu}`;
            bladEl.hidden = false;
            return;
        }

        skladniki.push({nazwa: produkt.nazwa, kod_kreskowy: produkt.kod_kreskowy, gram: gram});
    }

    const suma = {};
    KLUCZE_WARTOSCI.forEach(function(k) { suma[k] = 0; });
    let sumaGram = 0;

    skladniki.forEach(function(sk) {
        const produkt = state.produktyPoKodzie.get(sk.kod_kreskowy);
        const wo = (produkt && produkt.wartosci_odzywcze_na_100g) || {};
        const wspolczynnik = sk.gram / 100;

        KLUCZE_WARTOSCI.forEach(function(k) {
            suma[k] += (wo[k] || 0) * wspolczynnik;
        });

        sumaGram += sk.gram;
    });

    const nastepneId = state.dania.reduce(function(m, d) { return Math.max(m, d.id); }, 0) + 1;

    const noweDanie = {
        id: nastepneId,
        nazwa: nazwa,
        typ_posilku: typ_posilku,
        skladniki: skladniki,
        wartosci_odzywcze: KLUCZE_WARTOSCI.reduce(function(acc, k) {
            acc[k] = Math.round(suma[k] * 100) / 100;
            return acc;
        }, {}),
        kcal: Math.round(suma.kcal),
        gram: Math.round(sumaGram * 10) / 10,
        wlasne: true
    };

    const config = wczytajConfigDlaOceny();

    noweDanie.ocena_zgodnosci = ocenZgodnoscDania(noweDanie, {
        typ_posilku: typ_posilku,
        smazone: document.getElementById("nowe-smazone").checked,
        wywarWarzywny: document.getElementById("nowe-wywar-warzywny").checked,
        koncentrat: document.getElementById("nowe-koncentrat").checked,
        celKcal: config ? obliczZapotrzebowanie(config.grupy) : null
    });

    state.dania.push(noweDanie);

    const daniaWlasne = wczytajZLocalStorage(KLUCZ_DANIA_WLASNE);
    daniaWlasne.push(noweDanie);
    localStorage.setItem(KLUCZ_DANIA_WLASNE, JSON.stringify(daniaWlasne));

    const formularzDanie = document.getElementById("formularz-danie");
    formularzDanie.reset();
    formularzDanie.hidden = true;
    document.getElementById("nowy-produkt-panel").hidden = true;

    document.getElementById("lista-skladnikow").innerHTML = "";

    filtrujDania();
    pokazSzczegolyDania(noweDanie.id);
}

function wczytajConfigDlaOceny() {
    const zapis = localStorage.getItem(KLUCZ_CONFIG);

    if (!zapis) {
        return null;
    }

    try {
        return JSON.parse(zapis);
    } catch (err) {
        return null;
    }
}

async function inicjujStroneBaza() {
    odczytajParametryUrl();
    pokazInfoOSlocie();

    try {
        await wczytajDane();
    } catch (err) {
        return;
    }

    zbudujFiltrTypow();
    renderujListeDan(state.dania);

    document.getElementById("szukaj").addEventListener("input", filtrujDania);
    document.getElementById("typ_posilku").addEventListener("change", filtrujDania);

    inicjujFormularzDodawania();
}

inicjujStroneBaza();

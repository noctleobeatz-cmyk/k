const PREFIKS_DNIA_DZIENNIK = "stolowka_posilki_";

function pobierzWpisyDziennika() {
    const wynik = [];

    for (let i = 0; i < localStorage.length; i++) {
        const klucz = localStorage.key(i);

        if (!klucz || klucz.indexOf(PREFIKS_DNIA_DZIENNIK) !== 0) {
            continue;
        }

        const iso = klucz.slice(PREFIKS_DNIA_DZIENNIK.length);
        let dzien;

        try {
            dzien = JSON.parse(localStorage.getItem(klucz));
        } catch (err) {
            continue;
        }

        wynik.push({klucz: klucz, iso: iso, dzien: dzien});
    }

    wynik.sort(function(a, b) {
        return b.iso.localeCompare(a.iso);
    });

    return wynik;
}

function renderujSlotDziennika(slot, dania) {
    if (!dania || dania.length === 0) {
        return `
        <section class="slot-dziennika">
            <h4>${SLOTY_ETYKIETY[slot]}</h4>
            <p class="pusty-slot-dziennika">Brak dodanych dań</p>
        </section>
        `;
    }

    const wierszeDan = dania.map(function(danie) {
        return `<li>${danie.nazwa} - ${Math.round(danie.kcal || 0)} kcal <span class="godzina-dania">${danie.godzina || ""}</span></li>`;
    }).join("");

    return `
    <section class="slot-dziennika">
        <h4>${SLOTY_ETYKIETY[slot]}</h4>
        <ul class="lista-dan-dziennika">${wierszeDan}</ul>
    </section>
    `;
}

function usunDzienZDziennika(klucz) {
    const potwierdzone = confirm("Czy na pewno usunąć zapisane posiłki tego dnia? Tej operacji nie można cofnąć.");

    if (!potwierdzone) {
        return;
    }

    localStorage.removeItem(klucz);
    renderujDziennik();
}

function renderujDziennik() {
    const kontener = document.getElementById("lista-dziennika");
    const wpisy = pobierzWpisyDziennika();

    if (wpisy.length === 0) {
        kontener.innerHTML = "<p>Brak zapisanych dni - dodaj posiłki na stronie „Dziś”</p>";
        return;
    }

    kontener.innerHTML = wpisy.map(function(wpis) {
        let status;

        if (wpis.dzien.zatwierdzony) {
            status = `<span class="tag ok">✅ zatwierdzony</span>`;
        } else {
            status = `<span class="tag bad">⏳ niezatwierdzony</span>`;
        }

        const sloty = SLOTY.map(function(slot) {
            return renderujSlotDziennika(slot, wpis.dzien[slot]);
        }).join("");

        return `
        <article class="karta-dziennika" data-klucz="${wpis.klucz}">
            <section class="naglowek-karty-dziennika">
                <h3>${formatujDate(new Date(wpis.iso + "T00:00:00"))}</h3>
                ${status}
                <button class="usun-dzien-btn" data-klucz="${wpis.klucz}">Usuń</button>
            </section>
            ${sloty}
        </article>
        `;
    }).join("");

    kontener.querySelectorAll(".usun-dzien-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
            usunDzienZDziennika(btn.dataset.klucz);
        });
    });
}

renderujDziennik();
